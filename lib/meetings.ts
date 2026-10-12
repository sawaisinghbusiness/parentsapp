/** Meetings the school calls: a PTM (pick a time) or a general meeting (say if you'll come). */
export interface Meeting {
  id: string;
  title: string;
  kind: "general" | "ptm";
  host: string | null;
  date: string;
  start: string;
  end: string;
  place: string | null;
  onlineUrl: string | null;
  agenda: string | null;
  slotMinutes: number | null;
  audience: string;
  answer: "yes" | "no" | null;
  /** The PTM time this family has, "10:20". */
  slot: string | null;
}
export interface MeetingRow extends Meeting {
  slotsLeft: number | null;
}
export interface MeetingDetail extends Meeting {
  coming: number;
  slots: { time: string; taken: boolean; mine: boolean }[];
}

/** "10:20" -> "10:20 AM" */
export function ampm(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
