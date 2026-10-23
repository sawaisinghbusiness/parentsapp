/**
 * Icons for the Today card: Fees, Attendance and Homework (the user's spec, 2026-10-23). One style for all:
 * a #2563EB rounded tile (rx 28) with two depth circles, a big white object in the middle, accents only in
 * yellow #FBBF24, green #22C55E and navy #1E3A8A, light-blue details. Flat: no gradient, shadow or blur,
 * no text elements. Drawn on a 100×100 box, so they stay sharp at 24, 48 and 96px.
 *
 *   <FeesIcon size={48} />                      decorative (hidden from screen readers)
 *   <AttendanceIcon size={48} title="Attendance" />  announced with that name
 */

type IconProps = { size?: number; title?: string; className?: string };

function Tile({ size = 48, title, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="100" height="100" rx="28" fill="#2563EB" />
      <circle cx="72" cy="28" r="22" fill="#3B82F6" />
      <circle cx="22" cy="78" r="10" fill="#1D4ED8" />
      {children}
    </svg>
  );
}

/** A white note with a navy rupee sign, and a yellow coin over its bottom-right corner. */
export function FeesIcon(props: IconProps) {
  return (
    <Tile {...props}>
      <rect x="14" y="30" width="60" height="40" rx="9" fill="#FFFFFF" />
      <rect x="20" y="36" width="48" height="28" rx="6" fill="none" stroke="#BFDBFE" strokeWidth="2.5" />
      <g fill="none" stroke="#1E3A8A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 42H52" />
        <path d="M36 48H52" />
        <path d="M40 42C49 42 49 54 40 54H37L48 61" />
      </g>
      <circle cx="70" cy="67" r="15" fill="#FBBF24" stroke="#2563EB" strokeWidth="3" />
      <circle cx="70" cy="67" r="8.5" fill="none" stroke="#1E3A8A" strokeWidth="2.5" />
    </Tile>
  );
}

/** A white calendar with a navy header, two yellow rings, and a green tick badge in the middle. */
export function AttendanceIcon(props: IconProps) {
  return (
    <Tile {...props}>
      <rect x="18" y="24" width="64" height="58" rx="10" fill="#FFFFFF" />
      <path d="M18 34a10 10 0 0 1 10-10h44a10 10 0 0 1 10 10v8H18z" fill="#1E3A8A" />
      <rect x="31" y="16" width="7" height="15" rx="3.5" fill="#FBBF24" />
      <rect x="62" y="16" width="7" height="15" rx="3.5" fill="#FBBF24" />
      <g fill="#BFDBFE">
        <circle cx="29" cy="52" r="3.5" />
        <circle cx="71" cy="52" r="3.5" />
        <circle cx="29" cy="71" r="3.5" />
        <circle cx="71" cy="71" r="3.5" />
      </g>
      <circle cx="50" cy="62" r="14" fill="#22C55E" />
      <path d="M43.5 62.5L48.5 67.5L57 57.5" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </Tile>
  );
}

/** A white notebook with a navy spine and light-blue lines, and a tilted yellow pencil sticking out. */
export function HomeworkIcon(props: IconProps) {
  return (
    <Tile {...props}>
      <rect x="20" y="16" width="52" height="68" rx="9" fill="#FFFFFF" />
      <path d="M29 16h7v68h-7a9 9 0 0 1-9-9V25a9 9 0 0 1 9-9z" fill="#1E3A8A" />
      <g fill="#93C5FD">
        <circle cx="28" cy="32" r="2.5" />
        <circle cx="28" cy="50" r="2.5" />
        <circle cx="28" cy="68" r="2.5" />
      </g>
      <g fill="none" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round">
        <path d="M44 31H62" />
        <path d="M44 41H62" />
        <path d="M44 51H55" />
      </g>
      {/* The tile-blue outline separates the pencil from the page where they overlap. */}
      <g transform="translate(84 36) rotate(135)" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke">
        <rect x="0" y="-5.5" width="9" height="11" rx="3" fill="#1E3A8A" />
        <rect x="8" y="-5.5" width="25" height="11" fill="#FBBF24" />
        <path d="M33 -5.5L45 0L33 5.5Z" fill="#FFFFFF" />
        <path d="M41 -1.8L45 0L41 1.8Z" fill="#1E3A8A" stroke="none" />
      </g>
    </Tile>
  );
}
