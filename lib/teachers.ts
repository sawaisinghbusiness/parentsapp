import type { Lang } from "./i18n";

/** Ask Teacher: the child's teachers and the messages with one of them. */
export interface TeacherRow {
  id: string;
  name: string;
  classTeacher: boolean;
  subjects: string[];
  last: { from: "parent" | "teacher"; text: string; at: string } | null;
  unread: number;
}

export interface ChatMessage {
  id: string;
  from: "parent" | "teacher";
  text: string;
  at: string;
  meeting: {
    date: string;
    time: string;
    minutes: number;
    place: "school" | "call" | "online";
    placeText: string;
    status: "waiting" | "yes" | "other";
    meetingId: string | null;
  } | null;
}

export interface Thread {
  teacher: { id: string; name: string; classTeacher: boolean; subjects: string[] };
  today: string;
  messages: ChatMessage[];
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Earthy avatar colours from the Ajrakh palette, picked by name so a teacher keeps theirs. */
const SHADES = ["#6E1E2B", "#A0522D", "#2B1A12", "#B8860B", "#7A3B12"];
export const shade = (name: string) => SHADES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % SHADES.length];

const loc = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");

/** "9:12 AM" today, "Mon" this week, else "12 Oct". */
export function when(iso: string, lang: Lang) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(loc(lang), { hour: "numeric", minute: "2-digit" });
  if (now.getTime() - d.getTime() < 6 * 864e5) return d.toLocaleDateString(loc(lang), { weekday: "short" });
  return d.toLocaleDateString(loc(lang), { day: "numeric", month: "short" });
}

export const clockOf = (iso: string, lang: Lang) => new Date(iso).toLocaleTimeString(loc(lang), { hour: "numeric", minute: "2-digit" });

/** "Today", "Yesterday" or "Mon, 12 Oct" for the day line between messages. */
export function dayLine(iso: string, lang: Lang) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return lang === "hi" ? "आज" : "Today";
  if (d.toDateString() === y.toDateString()) return lang === "hi" ? "कल" : "Yesterday";
  return d.toLocaleDateString(loc(lang), { weekday: "short", day: "numeric", month: "short" });
}
