"use client";

/** Two-way switch at the top of a screen: a soft grey track, the chosen half white. */
export function Segments<K extends string>({ value, options, onChange, label }: { value: K; options: { key: K; text: string }[]; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="seg">
      {options.map((o) => (
        <button key={o.key} role="tab" aria-selected={o.key === value} onClick={() => onChange(o.key)} className="min-w-0 transition-colors">
          {o.text}
        </button>
      ))}
    </div>
  );
}
