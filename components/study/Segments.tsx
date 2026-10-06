"use client";

import clsx from "clsx";

/** Two-way switch at the top of a screen: 48px tall, each half a full tap target. */
export function Segments<K extends string>({ value, options, onChange, label }: { value: K; options: { key: K; text: string }[]; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid h-12 grid-cols-2 gap-0.5 rounded-xl bg-ink-200/70 p-0.5">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={clsx("min-w-0 rounded-[9px] text-base font-semibold transition-colors", on ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 active:bg-white/50")}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}
