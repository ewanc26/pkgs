import { Box, Text, useInput, usePaste } from 'ink';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { formatClock, formatSeconds, progressBar } from './format.js';
import type { Prompt, State, Store, Wait } from './store.js';
import { emptyField, erase, insert, move, type Field } from './text-field.js';

const ACCENT = 'cyan';
const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

function useNow(interval: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

/** The keys in one read: a fast typist or a paste can deliver several at once. */
function keystrokes(input: string): { text: string; enter: boolean } {
  const newline = input.search(/[\r\n]/);
  return newline < 0 ? { text: input, enter: false } : { text: input.slice(0, newline), enter: true };
}

function Select({ prompt }: { prompt: Extract<Prompt, { kind: 'select' }> }) {
  // A ref as well as state: several keys can land before the next render.
  const index = useRef(prompt.initial);
  const typed = useRef('');
  const [shown, setShown] = useState(prompt.initial);
  const count = prompt.options.length;
  const numberOf = (i: number) => prompt.options[i]!.number ?? i + 1;
  const width = Math.max(...prompt.options.map((_, i) => String(numberOf(i)).length));

  const moveTo = (next: number) => {
    index.current = (next + count) % count;
    setShown(index.current);
  };

  useInput((input, key) => {
    if (key.return) return prompt.done(index.current);
    if (key.upArrow) return (typed.current = ''), moveTo(index.current - 1);
    if (key.downArrow) return (typed.current = ''), moveTo(index.current + 1);

    const { text, enter } = keystrokes(input);
    for (const char of text) {
      if (char === 'k' || char === 'j') {
        typed.current = '';
        moveTo(index.current + (char === 'k' ? -1 : 1));
      } else if (/\d/.test(char)) {
        // Typing a number moves to it; Enter still confirms.
        const find = (digits: string) =>
          prompt.options.findIndex((_, i) => String(numberOf(i)) === digits);
        let digits = typed.current + char;
        if (find(digits) < 0) digits = char;
        const target = find(digits);
        if (target >= 0) {
          typed.current = digits;
          moveTo(target);
        }
      }
    }
    if (enter) prompt.done(index.current);
  });

  return (
    <Box flexDirection="column">
      <Text bold>{prompt.message}</Text>
      {prompt.options.map((option, i) => (
        <Box key={i} flexDirection="column">
          {option.group && option.group !== prompt.options[i - 1]?.group ? (
            <Text dimColor>{`\n  ${option.group.toUpperCase()}`}</Text>
          ) : null}
          <Text color={i === shown ? ACCENT : undefined}>
            {i === shown ? '❯ ' : '  '}
            {String(numberOf(i)).padStart(width)}. {option.label}
            {option.hint && i === shown ? <Text dimColor>{`  ${option.hint}`}</Text> : null}
          </Text>
        </Box>
      ))}
      <Text dimColor>↑↓ or a number to choose · Enter to confirm</Text>
    </Box>
  );
}

function Input({ prompt }: { prompt: Extract<Prompt, { kind: 'input' }> }) {
  const current = useRef(emptyField);
  const [field, setShown] = useState(emptyField);
  const setField = (change: Field | ((f: Field) => Field)) => {
    current.current = typeof change === 'function' ? change(current.current) : change;
    setShown(current.current);
  };
  const [error, setError] = useState<string | null>(null);

  const submit = (value: string) => {
    const problem = prompt.validate?.(value);
    if (problem) return setError(problem);
    prompt.done(value);
  };

  useInput((input, key) => {
    if (key.return) return submit(current.current.value);
    setError(null);
    if (key.backspace || key.delete) return setField(erase);
    if (key.leftArrow) return setField((f) => move(f, f.cursor - 1));
    if (key.rightArrow) return setField((f) => move(f, f.cursor + 1));
    if (key.ctrl && input === 'a') return setField((f) => move(f, 0));
    if (key.ctrl && input === 'e') return setField((f) => move(f, f.value.length));
    if (key.ctrl && input === 'u') return setField(emptyField);
    if (key.ctrl || key.meta || key.tab || key.escape) return;
    // A terminal without bracketed paste delivers a pasted line and its Enter together.
    const newline = input.search(/[\r\n]/);
    if (newline >= 0) return submit(insert(current.current, input.slice(0, newline)).value);
    setField((f) => insert(f, input));
  });

  usePaste((text) => {
    setError(null);
    setField((f) => insert(f, text.replace(/[\r\n]+$/, '')));
  });

  const shown = prompt.mask ? '•'.repeat(field.value.length) : field.value;
  return (
    <Box flexDirection="column">
      <Text bold>{prompt.message}</Text>
      <Text>
        <Text color={ACCENT}>❯ </Text>
        {shown.slice(0, field.cursor)}
        <Text inverse>{shown[field.cursor] ?? ' '}</Text>
        {shown.slice(field.cursor + 1)}
      </Text>
      {error ? <Text color="yellow">{error}</Text> : null}
    </Box>
  );
}

function Confirm({ prompt }: { prompt: Extract<Prompt, { kind: 'confirm' }> }) {
  const [yes, setYes] = useState(prompt.defaultYes);

  useInput((input, key) => {
    if (key.return) return prompt.done(yes);
    const answer = keystrokes(input).text.toLowerCase();
    if (answer === 'y' || answer === 'yes') return prompt.done(true);
    if (answer === 'n' || answer === 'no') return prompt.done(false);
    if (key.leftArrow || key.rightArrow || key.tab) setYes((v) => !v);
  });

  return (
    <Box flexDirection="column">
      <Text bold>{prompt.message}</Text>
      <Text>
        <Text color={yes ? ACCENT : undefined} inverse={yes}>{' Yes '}</Text>
        {'  '}
        <Text color={yes ? undefined : ACCENT} inverse={!yes}>{' No '}</Text>
        <Text dimColor>{'  y / n, or ←→ and Enter'}</Text>
      </Text>
    </Box>
  );
}

function Countdown({ wait }: { wait: Wait }) {
  const now = useNow(500);
  useInput((_input, key) => {
    if (key.return) wait.retry();
  });
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text color="yellow" bold>Paused: {wait.reason}</Text>
      <Text>
        Resumes at {formatClock(wait.resumeAt, now)}, in{' '}
        <Text bold>{formatSeconds(Math.ceil((wait.resumeAt - now) / 1000))}</Text>
      </Text>
      <Text dimColor>Enter: try now · Ctrl+C: stop</Text>
    </Box>
  );
}

function ProgressView({ progress }: { progress: NonNullable<State['progress']> }) {
  const now = useNow(1000);
  const { label, done, total, startedAt, startedFrom } = progress;
  const elapsed = (now - startedAt) / 1000;
  const rate = elapsed > 3 ? (done - startedFrom) / elapsed : 0;
  const percent = total > 0 ? Math.floor((done / total) * 100) : 0;
  return (
    <Box flexDirection="column">
      <Text>
        {label} <Text color={ACCENT}>{progressBar(done, total)}</Text> {percent}%
      </Text>
      <Text dimColor>
        {done.toLocaleString()} / {total.toLocaleString()}
        {rate > 0 && done < total ? ` · about ${formatSeconds((total - done) / rate)} left` : ''}
      </Text>
    </Box>
  );
}

function Status({ text }: { text: string }) {
  const now = useNow(100);
  return (
    <Text>
      <Text color={ACCENT}>{SPINNER[Math.floor(now / 100) % SPINNER.length]}</Text> {text}
    </Text>
  );
}

export function App({ store, onInterrupt }: { store: Store; onInterrupt: () => void }) {
  const state = useSyncExternalStore(store.subscribe, store.get);

  // Always listening, so the terminal stays in one mode and Ctrl+C always lands here.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') onInterrupt();
  });

  const { prompt, wait, progress, status, stopping } = state;
  return (
    <Box flexDirection="column">
      {progress ? <ProgressView progress={progress} /> : null}
      {status && !prompt && !wait ? <Status text={status} /> : null}
      {wait && !prompt ? <Countdown wait={wait} /> : null}
      {prompt?.kind === 'select' ? <Select key={prompt.id} prompt={prompt} /> : null}
      {prompt?.kind === 'input' ? <Input key={prompt.id} prompt={prompt} /> : null}
      {prompt?.kind === 'confirm' ? <Confirm key={prompt.id} prompt={prompt} /> : null}
      {stopping ? (
        <Text color="yellow">Stopping after the current batch… Ctrl+C again to force quit.</Text>
      ) : null}
    </Box>
  );
}
