/** The state the view renders, changed only through `Store.set`. */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  hint?: string;
  /** Options sharing a group are listed under it as a heading. */
  group?: string;
  /** The number shown and typed for it; its position (from 1) by default. */
  number?: number;
}

export type Prompt =
  | {
      kind: 'select';
      id: number;
      message: string;
      options: SelectOption<unknown>[];
      initial: number;
      done: (index: number) => void;
    }
  | {
      kind: 'input';
      id: number;
      message: string;
      mask: boolean;
      validate?: (value: string) => string | null | undefined;
      done: (value: string) => void;
    }
  | {
      kind: 'confirm';
      id: number;
      message: string;
      defaultYes: boolean;
      done: (value: boolean) => void;
    };

export interface Progress {
  label: string;
  done: number;
  total: number;
}

export interface Wait {
  reason: string;
  /** Unix time in milliseconds at which the wait ends. */
  resumeAt: number;
  retry: () => void;
}

export interface State {
  prompt: Prompt | null;
  status: string | null;
  progress: (Progress & { startedAt: number; startedFrom: number }) | null;
  wait: Wait | null;
  stopping: boolean;
}

export class Store {
  private state: State = { prompt: null, status: null, progress: null, wait: null, stopping: false };
  private listeners = new Set<() => void>();

  get = (): State => this.state;

  set(change: Partial<State>): void {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
