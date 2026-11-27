/**
 * @ewanc26/tui — the Ink interface shared by the command-line importers.
 *
 * The importers keep their imperative flow and `console` logging, which Ink
 * prints above the live area. This supplies only what needs to stay on screen:
 * prompts, progress, status and quota waits.
 */
import { render } from 'ink';
import { App } from './app.js';
import { Store, type Progress, type SelectOption } from './store.js';

export type { Progress, SelectOption } from './store.js';
export { formatClock, formatSeconds } from './format.js';
export { shouldUseTui } from './detect.js';

export interface TuiOptions {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  /**
   * Called on Ctrl+C while work is running. Return true when the program will
   * stop by itself; otherwise, and on a second press, the process exits.
   */
  onInterrupt?: () => boolean;
  /** How to end the process. Replaced in tests. */
  exit?: (code: number) => void;
}

export interface Tui {
  select<T>(message: string, options: SelectOption<T>[], initial?: number): Promise<T>;
  input(
    message: string,
    options?: { mask?: boolean; validate?: (value: string) => string | null | undefined },
  ): Promise<string>;
  /** Defaults to No unless told otherwise. */
  confirm(message: string, defaultYes?: boolean): Promise<boolean>;
  /** A spinner with a label; null removes it. */
  status(text: string | null): void;
  /** A progress bar with time left; null removes it. */
  progress(progress: Progress | null): void;
  /** Show a countdown until `resumeAt`, ending early on Enter or cancellation. */
  countdown(wait: { reason: string; resumeAt: number; isCancelled?: () => boolean }): Promise<void>;
  /** Restore the terminal. The process cannot end while the interface is open. */
  close(): Promise<void>;
}

export function createTui(options: TuiOptions = {}): Tui {
  const store = new Store();
  const exit = options.exit ?? ((code: number) => process.exit(code));
  let nextId = 0;

  const interrupt = () => {
    const { prompt, stopping } = store.get();
    // At a prompt nothing is in flight, so there is nothing to wind down.
    if (!prompt && !stopping && options.onInterrupt?.()) {
      store.set({ stopping: true, wait: null });
      return;
    }
    app.unmount();
    exit(130);
  };

  const app = render(<App store={store} onInterrupt={interrupt} />, {
    exitOnCtrlC: false,
    // `shouldUseTui` has already decided. Ink's own check counts even an empty
    // `CI` variable, and would then draw nothing until it closed.
    interactive: true,
    ...(options.stdin && { stdin: options.stdin }),
    ...(options.stdout && { stdout: options.stdout }),
  });

  /** Show a prompt, then leave the answer in the scrollback. */
  function ask<T>(
    make: (id: number, done: (value: T) => void) => NonNullable<ReturnType<Store['get']>['prompt']>,
    echo: (value: T) => string,
  ): Promise<T> {
    if (store.get().prompt) return Promise.reject(new Error('A prompt is already open'));
    return new Promise((resolve) => {
      const prompt = make(++nextId, (value) => {
        if (store.get().prompt?.id !== prompt.id) return; // a repeated key
        store.set({ prompt: null });
        console.log(`✔ ${prompt.message.trim()} ${echo(value)}`);
        resolve(value);
      });
      store.set({ prompt });
    });
  }

  return {
    async select<T>(message: string, choices: SelectOption<T>[], initial = 0) {
      const index = await ask<number>(
        (id, done) => ({ kind: 'select', id, message, options: choices, initial, done }),
        (i) => choices[i]!.label,
      );
      return choices[index]!.value;
    },
    input: (message, { mask = false, validate } = {}) =>
      ask<string>(
        (id, done) => ({ kind: 'input', id, message, mask, validate, done }),
        (value) => (mask ? (value ? '••••' : '(empty)') : value || '(skipped)'),
      ),
    confirm: (message, defaultYes = false) =>
      ask<boolean>(
        (id, done) => ({ kind: 'confirm', id, message, defaultYes, done }),
        (value) => (value ? 'Yes' : 'No'),
      ),
    status: (text) => store.set({ status: text }),
    progress(next) {
      if (!next) return store.set({ progress: null });
      const current = store.get().progress;
      const same = current && current.label === next.label && current.total === next.total;
      store.set({
        progress: {
          ...next,
          startedAt: same ? current.startedAt : Date.now(),
          startedFrom: same ? current.startedFrom : next.done,
        },
      });
    },
    countdown({ reason, resumeAt, isCancelled }) {
      return new Promise((resolve) => {
        const finish = () => {
          clearInterval(timer);
          store.set({ wait: null });
          resolve();
        };
        const timer = setInterval(() => {
          if (isCancelled?.() || Date.now() >= resumeAt) finish();
        }, 100);
        store.set({ wait: { reason, resumeAt, retry: finish } });
      });
    },
    async close() {
      store.set({ prompt: null, status: null, progress: null, wait: null, stopping: false });
      await app.waitUntilRenderFlush();
      app.unmount();
      await app.waitUntilExit();
    },
  };
}
