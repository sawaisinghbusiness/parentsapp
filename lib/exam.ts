/** The shapes behind /report-card and /exams/schedule, shared by the Exam screens. */

export interface Subject {
  subject: string;
  marks: Record<string, number>;
  absent: boolean;
  total: number | null;
  grade: string | null;
  passed: boolean;
  entered: boolean;
}
export interface Card {
  exam: { id: string; title: string; max: number; parts: { key: string; name: string; max: number }[]; startDate: string | null; endDate: string | null };
  subjects: Subject[];
  grand: number;
  outOf: number;
  percent: number;
  grade: string | null;
  result: string;
  complete: boolean;
  rank: number | null;
  classSize?: number | null;
  remark?: string | null;
  attendance: { present: number; days: number } | null;
  /** The child's particulars for the printed card; older servers send none (the app falls back to /me). */
  student?: { name: string; rollNo: string; srNo: string; fatherName: string; motherName: string; dob: string | null; classSec: string };
}
/** The printed card's letterhead (same fields as the ERP's report card page). */
export interface SheetSchool {
  name: string;
  short: string;
  affiliationNo: string;
  schoolCode: string;
  place: string;
  /** Town for "Place:" under the signatures; older servers send none (first part of `place` then). */
  city?: string;
  pincode: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  principal: string;
}
export interface Report {
  /** grand/outOf/percent are per exam for the % ring; older servers send none and the row shows no ring. */
  exams: { id: string; title: string; startDate: string | null; endDate: string | null; grand?: number; outOf?: number; percent?: number }[];
  card: Card | null;
  grades: { scale: { grade: string; min: number }[]; passPercent: number };
  school?: SheetSchool;
  session?: string;
}
export interface Schedule {
  exam: { title: string; startDate: string; endDate: string } | null;
  papers: { subject: string; syllabus: string; max: number; pass: number; date: string; start: string; end: string }[];
}

/** One colour per subject that stays with the subject (not its rank), so a child learns "Maths is green". */
const PALETTE = ["#6C4FE0", "#EB6834", "#1BAF7A", "#EDA100", "#E87BA4", "#2A78D6"];
const SUBJECT_COLOR: Record<string, number> = { english: 0, hindi: 1, maths: 2, mathematics: 2, science: 3, "social studies": 4, "social science": 4, sanskrit: 5, evs: 3 };
export function subjectColor(subject: string, index: number) {
  return PALETTE[SUBJECT_COLOR[subject.trim().toLowerCase()] ?? index % PALETTE.length];
}

/** "Social Studies" -> "SSt", "Maths" -> "Mat": short enough for a chart label or a tile. */
export function abbr(subject: string) {
  const words = subject.trim().split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0].toUpperCase()).join("").slice(0, 3);
  return subject.slice(0, 3);
}
