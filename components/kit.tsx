"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";

/**
 * The look of the redrawn screens (Fees, Home), shared so every section reads as one app.
 *   type     14/20 supporting · 16/24 body, row titles, amounts · 20/28 section titles
 *   weights  400 text · 500 row titles and figures · 600 section titles and buttons (never 700+)
 *   colour   text #242628-ish (ink-900), supporting ink-500, lines #DCE4ED / #E6ECF3, action navy #0D2A5E;
 *            green / red / brown only inside a written status
 *   space    4/8 grid: 16 inside a card, 12 title to its card, 24 between sections
 *   cards    16px corners, hairline border, no shadow; a list is one card with ruled rows
 */

export const CARD = "overflow-hidden rounded-2xl border border-[#DCE4ED] bg-white";
export const RULED = "divide-y divide-[#E6ECF3]";
export const TITLE = "text-[16px] font-medium leading-6 text-ink-900";
export const SUPPORT = "text-[14px] leading-5 text-ink-500";
export const NAVY = "#0D2A5E";

/** Section title, 20/28 semibold, with an optional quiet link on the right. */
export function SectionTitle({ children, href, more }: { children: React.ReactNode; href?: string; more?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[20px] font-semibold leading-7 text-ink-900">{children}</h2>
      {href && more && (
        <Link href={href} className="-my-3 py-3 text-[14px] font-medium text-[#0D2A5E]">
          {more}
        </Link>
      )}
    </div>
  );
}

/** A section: title, 12px, then its content. Sections sit 24px apart (space-y-6 on the page). */
export function Section({ title, href, more, children, className, delay = 0 }: { title?: React.ReactNode; href?: string; more?: string; children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <section className={clsx("study-in", className)} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {title && <SectionTitle href={href} more={more}>{title}</SectionTitle>}
      <div className={title ? "mt-3" : undefined}>{children}</div>
    </section>
  );
}

/** One white card holding ruled rows. */
export function Group({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={clsx(CARD, RULED, className)}>{children}</ul>;
}

/**
 * A row: optional lead (date block, picture, icon), title and up to two supporting lines,
 * optional trailing (amount, status) and a chevron when it opens something.
 */
export function Row({
  href,
  onClick,
  lead,
  title,
  sub,
  trail,
  chevron = !!href,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  lead?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  trail?: React.ReactNode;
  chevron?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <span className="flex min-h-[72px] items-center gap-4 px-4 py-3">
        {lead}
        <span className="min-w-0 flex-1">
          <span className={clsx("block break-words", TITLE)}>{title}</span>
          {sub && <span className={clsx("mt-1 block break-words", SUPPORT)}>{sub}</span>}
        </span>
        {trail && <span className="flex shrink-0 flex-col items-end gap-1">{trail}</span>}
        {chevron && <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" strokeWidth={1.75} aria-hidden />}
      </span>
      {children}
    </>
  );
  const cls = clsx("block w-full text-left transition-colors active:bg-[#F1F5F9]", className);
  return (
    <li>
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : onClick ? (
        <button onClick={onClick} className={cls}>
          {body}
        </button>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

/** Day number over a short month: the lead of a dated row. Quiet, not a badge. */
export function DateBlock({ iso, lang }: { iso: string; lang: string }) {
  const d = new Date(iso + "T00:00:00");
  return (
    <span className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-[#EEF3F8] py-1.5 text-center">
      <span className="tnum text-[18px] font-semibold leading-6 text-ink-900">{d.getDate()}</span>
      <span className="text-[12px] font-medium leading-4 text-ink-500">{d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { month: "short" })}</span>
    </span>
  );
}

/** Two or more tabs with a navy underline, 48px tall. */
export function Tabs<K extends string>({ value, onChange, options, label }: { value: K; onChange: (k: K) => void; options: { key: K; text: string }[]; label: string }) {
  return (
    <div className="flex border-b border-[#DCE4ED]" role="tablist" aria-label={label}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={clsx("-mb-px min-h-[48px] flex-1 border-b-2 text-center text-[16px] transition-colors", on ? "border-[#0D2A5E] font-semibold text-[#0D2A5E]" : "border-transparent font-medium text-ink-500")}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

/** Operational primary action (48px), or the outlined secondary; route palette controls its fill. */
export function Button({ kind = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "line" }) {
  return (
    <button
      {...p}
      className={clsx(
        "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[16px] font-semibold transition-colors disabled:opacity-50",
        kind === "primary" ? "action-primary bg-[#0D2A5E] text-white active:bg-[#0A2149]" : "border border-[#C9D4E1] bg-white text-[#0D2A5E] active:bg-[#F1F5F9]",
        className
      )}
    />
  );
}

/** A plain message where a list would be. */
export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className={clsx(CARD, "px-4 py-4 text-[16px] leading-6 text-ink-500")}>{children}</p>;
}
