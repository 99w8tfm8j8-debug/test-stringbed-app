import type { ComponentChildren } from 'preact';
import { useApp } from '../app/state';
import { computeStatus } from '../lib/status';

export function SetupPicker() {
  const { state, actions } = useApp();
  if (!state.setups.length) return null;
  return (
    <nav class="chips" aria-label="Setups">
      {state.setups.map((s) => {
        const st = computeStatus(s, state.readings);
        return (
          <button key={s.id} class="chip" aria-pressed={s.id === state.active?.id} onClick={() => void actions.setSettings({ activeSetupId: s.id })}>
            <span class={'dot ' + st.level} aria-hidden="true" />
            {s.name}
            <span class="sr-only">, {st.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string }) {
  return (
    <div class="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function NoSetup({ children }: { children?: ComponentChildren }) {
  return (
    <div class="panel">
      <h2>No setup yet</h2>
      <p>Create a setup for each racquet and string job. {children}</p>
      <a class="btn primary" href="#/setup/new">Create a setup</a>
    </div>
  );
}
