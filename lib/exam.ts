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
}
export interface Report {
  exams: { id: string; title: string; startDate: string | null; endDate: string | null }[];
  card: Card | null;
  grades: { scale: { grade: string; min: number }[]; passPercent: number };
}
export interface Schedule {
  exam: { title: string; startDate: string; endDate: string } | null;
  papers: { subject: string; syllabus: string; max: number; pass: number; date: string; start: string; end: string }[];
}

/** "Social Studies" -> "SSt", "Maths" -> "Mat": short enough for a chart label or a tile. */
export function abbr(subject: string) {
  const words = subject.trim().split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0].toUpperCase()).join("").slice(0, 3);
  return subject.slice(0, 3);
}
