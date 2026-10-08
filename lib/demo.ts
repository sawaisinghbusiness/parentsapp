/**
 * Demo mode: the whole app runs on the phone with sample data, no backend and no real OTP.
 * Sign in with any 10-digit mobile and the code 123456.
 *
 * Off by default: the app uses the real backend. Set NEXT_PUBLIC_DEMO=1 (Vercel → Environment
 * Variables) to show the app with this sample family and no backend at all. To show schools the
 * app on real data with the code 123456, use the backend's PARENT_DEMO_LOGIN=1 instead.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
export const DEMO_CODE = "123456";

const SESSION = "pa:demo-session";
const STORE = "pa:demo-store";

class DemoError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ───────────── dates (India time, as YYYY-MM-DD) ───────────── */

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const weekday = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay();
/** The last school day (not Sunday) on or before `iso`. */
const schoolDay = (iso: string) => (weekday(iso) === 0 ? addDays(iso, -1) : iso);

/* ───────────── the sample family ───────────── */

const SCHOOL = {
  name: "Mother Teresa Nobles Academy",
  shortName: "MTNA",
  logoUrl: null,
  address: "Nehru Nagar, Barmer",
  officePhone: "94600 62543",
  upiId: "mtnabarmer@sbi",
  upiName: "Mother Teresa Nobles Academy",
};

const KIDS = [
  { id: "demo-laxman", name: "Laxman Garg", class: "Nursery", section: "A", classSec: "Nursery - A", rollNo: "01", srNo: "SR-2024-1001", admissionNo: "ADM-5001", photoUrl: null, fatherName: "Jagdish Prasad Garg", motherName: "Sugan Kanwar", bus: false, busRoute: null, busStop: null, dob: "2022-09-11" },
  { id: "demo-priya", name: "Priya Garg", class: "5th", section: "B", classSec: "5th - B", rollNo: "17", srNo: "SR-2021-0880", admissionNo: "ADM-4410", photoUrl: null, fatherName: "Jagdish Prasad Garg", motherName: "Sugan Kanwar", bus: true, busRoute: "Route 3 – Sindhari Road", busStop: "Sindhari Chauraha", dob: "2016-03-22" },
];
type Kid = (typeof KIDS)[number];

const kidOf = (id: string | null): Kid => {
  const k = KIDS.find((x) => x.id === id);
  if (!k) throw new DemoError(404, "Student not found.");
  return k;
};
const childPublic = ({ dob, ...c }: Kid) => c;

/* ───────────── what the parent adds (kept on the phone) ───────────── */

interface Store {
  phone: string;
  leave: Record<string, any[]>;
  claims: Record<string, any[]>;
  requests: Record<string, any[]>;
}
function load(): Store {
  const blank = { phone: "9588894289", leave: {}, claims: {}, requests: {} };
  try {
    return { ...blank, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
  } catch {
    return blank;
  }
}
function save(s: Store) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
export const demoSignedIn = () => signedIn();
const signedIn = () => {
  try {
    return localStorage.getItem(SESSION) === "1";
  } catch {
    return false;
  }
};

/* ───────────── screens ───────────── */

function attendanceMonth(kid: Kid, month: string) {
  const t = today();
  const first = month + "-01";
  const n = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  const tot = { present: 0, absent: 0, leave: 0, half: 0, workingDays: 0, percent: null as number | null };
  const days = [];
  const seed = kid.id === "demo-priya" ? 3 : 0;
  for (let i = 1; i <= n; i++) {
    const date = addDays(first, i - 1);
    const sunday = weekday(date) === 0;
    const holiday = date.endsWith("-10-02") ? "Gandhi Jayanti" : date.endsWith("-08-15") ? "Independence Day" : null;
    let mark: "P" | "A" | "L" | "H" | null = null;
    if (!sunday && !holiday && date <= t && date >= "2026-04-01") {
      const k = (i + seed) % 17;
      mark = k === 5 ? "A" : k === 11 ? "L" : k === 14 ? "H" : "P";
      if (date === t) mark = "P";
      tot.workingDays++;
      tot[({ P: "present", A: "absent", L: "leave", H: "half" } as const)[mark]]++;
    }
    days.push({ date, mark, holiday, sunday });
  }
  tot.percent = tot.workingDays ? Math.round(((tot.present + tot.half / 2) / tot.workingDays) * 1000) / 10 : null;
  return { month, today: t, firstMonth: "2026-04", days, totals: tot, session: { percent: kid.id === "demo-priya" ? 92.6 : 88.4, workingDays: 131 } };
}

function feesFor(kid: Kid, s: Store) {
  const t = today();
  const claims = (s.claims[kid.id] || []).slice().reverse();
  if (kid.id === "demo-laxman") {
    const instalments = [
      { name: "Quarter 1", due: "2026-04-10", amount: 8500, paid: 8500, outstanding: 0, overdue: false, fine: 0, paidOn: "2026-04-08", heads: [{ key: "tuition_fee", amount: 4500 }, { key: "annual_fee", amount: 4000 }] },
      { name: "Quarter 2", due: "2026-07-10", amount: 5500, paid: 0, outstanding: 5500, overdue: true, fine: 500, paidOn: null, heads: [{ key: "tuition_fee", amount: 4500 }, { key: "exam_fee", amount: 1000 }] },
      { name: "Quarter 3", due: "2026-10-10", amount: 4500, paid: 0, outstanding: 4500, overdue: t > "2026-10-10", fine: 0, paidOn: null, heads: [{ key: "tuition_fee", amount: 4500 }] },
      { name: "Quarter 4", due: "2027-01-10", amount: 5500, paid: 0, outstanding: 5500, overdue: false, fine: 0, paidOn: null, heads: [{ key: "tuition_fee", amount: 4500 }, { key: "exam_fee", amount: 1000 }] },
    ];
    const dueNow = instalments.filter((i) => i.overdue).reduce((a, i) => a + i.outstanding, 0);
    const fine = instalments.reduce((a, i) => a + (i.overdue ? i.fine : 0), 0);
    return {
      asOf: t,
      available: true,
      pay: { upiId: SCHOOL.upiId, upiName: SCHOOL.upiName, officePhone: SCHOOL.officePhone },
      session: { total: 24000, paid: 8500, balance: 15500 },
      dueNow,
      fine,
      options: { dueNow: dueNow + fine, full: 15500 + fine },
      instalments,
      receipts: [{ id: "r1", receiptNo: "MTNA/2026-27/00412", amount: 8500, mode: "Cash", date: "2026-04-08", instalments: "Quarter 1", heads: [{ key: "tuition_fee", amount: 4500 }, { key: "annual_fee", amount: 4000 }], ref: null }],
      claims,
    };
  }
  return {
    asOf: t,
    available: true,
    pay: { upiId: SCHOOL.upiId, upiName: SCHOOL.upiName, officePhone: SCHOOL.officePhone },
    session: { total: 43500, paid: 25500, balance: 18000 },
    dueNow: 0,
    fine: 0,
    options: { dueNow: 0, full: 18000 },
    instalments: [
      { name: "Quarter 1", due: "2026-04-10", amount: 14500, paid: 14500, outstanding: 0, overdue: false, fine: 0, paidOn: "2026-04-07", heads: [{ key: "tuition_fee", amount: 5500 }, { key: "annual_fee", amount: 5000 }, { key: "transport_fee", amount: 3000 }, { key: "computer_fee", amount: 250 }, { key: "admission_fee", amount: 750 }] },
      { name: "Quarter 2", due: "2026-07-10", amount: 11000, paid: 11000, outstanding: 0, overdue: false, fine: 0, paidOn: "2026-07-06", heads: [{ key: "tuition_fee", amount: 5500 }, { key: "exam_fee", amount: 1000 }, { key: "transport_fee", amount: 3000 }, { key: "computer_fee", amount: 250 }, { key: "annual_fee", amount: 1250 }] },
      { name: "Quarter 3", due: "2026-10-10", amount: 8500, paid: 0, outstanding: 8500, overdue: false, fine: 0, paidOn: null, heads: [{ key: "tuition_fee", amount: 5500 }, { key: "transport_fee", amount: 3000 }, { key: "computer_fee", amount: 250 }, { key: "concession", amount: -250 }] },
      { name: "Quarter 4", due: "2027-01-10", amount: 9500, paid: 0, outstanding: 9500, overdue: false, fine: 0, paidOn: null, heads: [{ key: "tuition_fee", amount: 5500 }, { key: "exam_fee", amount: 1000 }, { key: "transport_fee", amount: 3000 }, { key: "computer_fee", amount: 250 }, { key: "concession", amount: -250 }] },
    ],
    receipts: [
      { id: "r3", receiptNo: "MTNA/2026-27/00671", amount: 11000, mode: "UPI / QR", date: "2026-07-06", instalments: "Quarter 2", heads: [{ key: "tuition_fee", amount: 5500 }, { key: "exam_fee", amount: 1000 }, { key: "transport_fee", amount: 3000 }, { key: "computer_fee", amount: 250 }, { key: "annual_fee", amount: 1250 }], ref: "618822004517" },
      { id: "r2", receiptNo: "MTNA/2026-27/00398", amount: 14500, mode: "Cash", date: "2026-04-07", instalments: "Quarter 1", heads: [{ key: "tuition_fee", amount: 5500 }, { key: "annual_fee", amount: 5000 }, { key: "transport_fee", amount: 3000 }, { key: "computer_fee", amount: 250 }, { key: "admission_fee", amount: 750 }], ref: null },
    ],
    claims,
  };
}

type HwStatus = "pending" | "checked" | "not_submitted";
const HW: Record<string, [number, string, string, string, number | null, HwStatus][]> = {
  // [days ago, subject, title, details, due in days, what the teacher marked]
  "demo-laxman": [
    [0, "Hindi", "अ से अः तक दो बार लिखें", "", 1, "pending"],
    [0, "Maths", "1 से 50 तक गिनती लिखें", "कॉपी में साफ़-साफ़ लिखें।", 1, "pending"],
    [1, "English", "Write A to Z in capital letters", "", null, "checked"],
    [2, "Drawing", "Draw and colour a mango", "Use crayons.", 3, "pending"],
    [5, "EVS", "Name 5 fruits and 5 vegetables", "Paste pictures if you can.", null, "checked"],
  ],
  "demo-priya": [
    [0, "Maths", "Exercise 4.2 — Q 1 to 10", "Show all steps.", 1, "pending"],
    [0, "Hindi", "पाठ 6 के प्रश्न-उत्तर याद करें", "", 2, "pending"],
    [1, "English", "Write a paragraph on 'My School'", "About 100 words.", 2, "checked"],
    [1, "Science", "Draw the parts of a plant", "Label root, stem, leaf, flower.", 3, "checked"],
    [3, "Social Studies", "Map work: mark 5 rivers of India", "", null, "not_submitted"],
    [6, "Computer", "Learn the parts of a computer", "", null, "checked"],
  ],
};

function homework(kid: Kid) {
  const t = today();
  const items = HW[kid.id].map(([ago, subject, title, details, due, status], i) => {
    const on = schoolDay(addDays(t, -ago));
    return { id: `${kid.id}-hw-${i}`, subject, title, details, assignedOn: on, dueDate: due === null ? null : addDays(on, due), status };
  });
  return { setupNeeded: false, today: t, items, nextBefore: null };
}

const PERIODS = [
  ["p1", "Period 1", "08:00", "08:40"],
  ["p2", "Period 2", "08:40", "09:20"],
  ["p3", "Period 3", "09:20", "10:00"],
  ["p4", "Period 4", "10:00", "10:40"],
  ["brk", "Interval", "10:40", "11:00"],
  ["p5", "Period 5", "11:00", "11:40"],
  ["p6", "Period 6", "11:40", "12:20"],
  ["p7", "Period 7", "12:20", "13:00"],
].map(([id, label, start, end]) => ({ id, label, start, end, isBreak: id === "brk" }));

const SUBJ: Record<string, [string, string][]> = {
  "demo-laxman": [
    ["English", "Neha Sharma"],
    ["Hindi", "Kamla Devi"],
    ["Maths", "Neha Sharma"],
    ["EVS", "Kamla Devi"],
    ["Drawing", "Ritu Jain"],
    ["Rhymes", "Neha Sharma"],
    ["Games", "Mahesh Choudhary"],
  ],
  "demo-priya": [
    ["Maths", "Rakesh Bishnoi"],
    ["English", "Anita Rathore"],
    ["Hindi", "Kamla Devi"],
    ["Science", "Suresh Meena"],
    ["Social Studies", "Pooja Vyas"],
    ["Computer", "Vikram Singh"],
    ["Sanskrit", "Hari Om Sharma"],
  ],
};

function timetable(kid: Kid) {
  const t = today();
  const days: Record<string, Record<string, { subject: string; teacher: string }>> = {};
  const list = SUBJ[kid.id];
  const lessons = PERIODS.filter((p) => !p.isBreak);
  for (let d = 1; d <= 6; d++) {
    days[d] = {};
    lessons.forEach((p, i) => {
      if (d === 6 && i >= 5) return; // short Saturday
      const [subject, teacher] = list[(i + d) % list.length];
      days[d][p.id] = { subject, teacher };
    });
  }
  return { setupNeeded: false, today: t, todayDay: weekday(t), periods: PERIODS, days };
}

function notices(kid: Kid) {
  const t = today();
  const first = kid.name.split(" ")[0];
  return [
    { id: "n1", title: "दशहरा अवकाश", body: `प्रिय अभिभावक, विद्यालय 20 से 22 अक्टूबर तक दशहरा अवकाश के कारण बंद रहेगा। 23 अक्टूबर से कक्षाएँ सामान्य रूप से लगेंगी।`, date: addDays(t, -1) },
    { id: "n2", title: "अभिभावक–शिक्षक बैठक", body: `${first} की अर्धवार्षिक परीक्षा की कॉपियाँ दिखाने के लिए शनिवार सुबह 9 से 11 बजे तक अभिभावक–शिक्षक बैठक होगी। कृपया अवश्य पधारें।`, date: addDays(t, -4) },
    { id: "n3", title: "फ़ीस की याद", body: "दूसरी किस्त की आख़िरी तारीख निकल चुकी है। लेट फ़ाइन से बचने के लिए फ़ीस जल्द जमा करें। अब आप ऐप से UPI द्वारा भी फ़ीस भर सकते हैं।", date: addDays(t, -9) },
    { id: "n4", title: "Annual Sports Day", body: "Sports Day will be held on 14 November. Children should come in house T-shirts. Parents are welcome.", date: addDays(t, -15) },
  ];
}

function busFor(kid: Kid) {
  if (!kid.bus) return { opted: false };
  const stops = [
    { name: "Station Road", time: "07:05" },
    { name: "Sindhari Chauraha", time: "07:15" },
    { name: "Ambedkar Circle", time: "07:25" },
    { name: "Nehru Nagar (School)", time: "07:40" },
  ];
  return {
    opted: true,
    routeName: kid.busRoute,
    stop: kid.busStop,
    pickup: "07:15",
    route: { vehicleNo: "RJ 04 PA 2231", driverName: "Bhanwar Lal", driverPhone: "9414000000", conductorName: "Mangi Lal", conductorPhone: null, stops },
  };
}

const GRADES = [
  ["A1", 91],
  ["A2", 81],
  ["B1", 71],
  ["B2", 61],
  ["C1", 51],
  ["C2", 41],
  ["D", 33],
  ["E", 0],
].map(([grade, min]) => ({ grade: grade as string, min: min as number }));
const gradeOf = (pct: number) => GRADES.find((g) => pct >= g.min)!.grade;

const EXAMS = [
  { id: "unit-1", title: "Unit Test 1", startDate: "2026-07-20", endDate: "2026-07-25", max: 50, parts: [{ key: "marks", name: "Marks", max: 50 }] },
  {
    id: "half-yearly",
    title: "Half Yearly Exam",
    startDate: "2026-09-15",
    endDate: "2026-09-26",
    max: 100,
    parts: [
      { key: "theory", name: "Theory", max: 80 },
      { key: "internal", name: "Internal", max: 20 },
    ],
  },
];

const MARKS: Record<string, Record<string, [string, ...number[]][]>> = {
  "demo-priya": {
    "unit-1": [["English", 42], ["Hindi", 44], ["Maths", 47], ["Science", 40], ["Social Studies", 38], ["Sanskrit", 45]],
    "half-yearly": [["English", 68, 18], ["Hindi", 72, 19], ["Maths", 75, 18], ["Science", 64, 17], ["Social Studies", 61, 16], ["Sanskrit", 70, 19]],
  },
  "demo-laxman": {
    "unit-1": [["English", 44], ["Hindi", 41], ["Maths", 46], ["EVS", 43]],
    "half-yearly": [["English", 74, 19], ["Hindi", 70, 18], ["Maths", 77, 20], ["EVS", 69, 18]],
  },
};

const REMARK: Record<string, string> = {
  "demo-priya": "Good in maths. Reading speed in English can improve.",
  "demo-laxman": "Very cheerful in class. Practise writing letters neatly.",
};

function reportCard(kid: Kid, examId: string | null) {
  const exam = EXAMS.find((e) => e.id === examId) || EXAMS[EXAMS.length - 1];
  const subjects = MARKS[kid.id][exam.id].map(([subject, ...m]) => {
    const marks = Object.fromEntries(exam.parts.map((p, i) => [p.key, m[i]]));
    const total = m.reduce((a, b) => a + b, 0);
    const pct = (total / exam.max) * 100;
    return { subject, marks, absent: false, total, grade: gradeOf(pct), passed: pct >= 33, entered: true };
  });
  const grand = subjects.reduce((a, s) => a + s.total, 0);
  const outOf = subjects.length * exam.max;
  const percent = Math.round((grand / outOf) * 1000) / 10;
  return {
    exams: EXAMS.map(({ id, title, startDate, endDate, max }) => {
      const g = MARKS[kid.id][id].reduce((a, [, ...m]) => a + m.reduce((x, y) => x + y, 0), 0);
      const o = MARKS[kid.id][id].length * max;
      return { id, title, startDate, endDate, grand: g, outOf: o, percent: Math.round((g / o) * 1000) / 10 };
    }),
    card: {
      exam: { id: exam.id, title: exam.title, max: exam.max, parts: exam.parts, startDate: exam.startDate, endDate: exam.endDate },
      subjects,
      grand,
      outOf,
      percent,
      grade: gradeOf(percent),
      result: "Pass",
      complete: true,
      rank: kid.id === "demo-priya" ? (exam.id === "unit-1" ? 6 : 4) : 2,
      classSize: kid.id === "demo-priya" ? 38 : 24,
      remark: exam.id === "half-yearly" ? REMARK[kid.id] : null,
      attendance: exam.id === "half-yearly" ? { present: 118, days: 128 } : null,
    },
    grades: { scale: GRADES, passPercent: 33 },
  };
}

/** The next exam's papers: syllabus, marks, date and time. */
function examSchedule(kid: Kid) {
  const t = today();
  let day = addDays(t, 14);
  const subjects = MARKS[kid.id]["half-yearly"].map(([s]) => s);
  const syllabus: Record<string, string> = {
    English: "Lessons 6–10, grammar",
    Hindi: "पाठ 7–12",
    Maths: "Chapters 6–9",
    Science: "Chapters 7–11",
    "Social Studies": "Chapters 6–10, map work",
    Sanskrit: "पाठ 5–8",
    EVS: "Chapters 6–10",
  };
  const papers = subjects.map((subject) => {
    if (weekday(day) === 0) day = addDays(day, 1);
    const row = { subject, syllabus: syllabus[subject] || "", max: 50, pass: 17, date: day, start: "08:00", end: subject === "Sanskrit" || subject === "EVS" ? "10:00" : "10:30" };
    day = addDays(day, 1);
    return row;
  });
  return { exam: { title: "Unit Test 2", startDate: papers[0].date, endDate: papers[papers.length - 1].date }, papers };
}

/** School events with their photos. A real school uploads photos; the demo draws scenes. */
function events() {
  const t = today();
  const pics = (scenes: string[], n: number, videoAt: number[] = []) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, url: null, scene: scenes[i % scenes.length], video: videoAt.includes(i) }));
  return [
    { id: "sports", title: "Sports Day", date: addDays(t, 7), scene: "sports", photos: [] as ReturnType<typeof pics> },
    { id: "mela", title: "Dussehra Mela", date: addDays(t, 12), scene: "mela", photos: [] as ReturnType<typeof pics> },
    // We only have one stock photo per scene, so each album shows each photo once.
    { id: "teachers", title: "Teachers' Day", date: "2026-09-05", scene: "teach", photos: pics(["teach", "stage"], 2) },
    { id: "independence", title: "Independence Day", date: "2026-08-15", scene: "flag", photos: pics(["flag", "march", "flag"], 3, [2]) },
    { id: "annual", title: "Annual Function", date: "2025-12-12", scene: "stage", photos: pics(["stage", "march"], 2) },
    { id: "diwali", title: "Diwali Celebration", date: "2025-10-30", scene: "diya", photos: pics(["diya", "mela"], 2) },
  ].map((e) => ({ ...e, coverUrl: null, upcoming: e.date >= t, photoCount: e.photos.filter((p) => !p.video).length, videoCount: e.photos.filter((p) => p.video).length }));
}

/** Leave this child already had this session, shown until the parent sends their own. */
function seededLeave(kid: Kid): any[] {
  if (kid.id !== "demo-priya") return [];
  return [
    { id: "leave-s1", from: "2026-09-18", to: "2026-09-19", days: 2, type: "family", halfDay: false, reason: "Cousin's wedding in Balotra.", status: "approved", decidedBy: "Rakesh Bishnoi", decidedAt: "2026-09-16T10:00:00Z", createdAt: "2026-09-15T18:00:00Z" },
    { id: "leave-s2", from: "2026-09-07", to: "2026-09-07", days: 0.5, type: "sick", halfDay: true, reason: "Stomach ache in the morning.", status: "approved", decidedBy: "Rakesh Bishnoi", decidedAt: "2026-09-07T08:00:00Z", createdAt: "2026-09-07T06:30:00Z" },
    { id: "leave-s3", from: "2026-09-02", to: "2026-09-02", days: 1, type: "casual", halfDay: false, reason: "Going to the village for a puja.", status: "rejected", decidedBy: "Rakesh Bishnoi", decidedAt: "2026-09-01T12:00:00Z", createdAt: "2026-09-01T09:00:00Z" },
  ];
}

function leaveRules() {
  const t = today();
  return { today: t, minFrom: addDays(t, -7), maxFrom: addDays(t, 60), maxDays: 30, reasonMax: 300 };
}

/* ───────────── router ───────────── */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Answers /api/parent/* like the backend would. Errors carry the same status codes. */
export async function demoApi(path: string, method: string, body: any): Promise<unknown> {
  await wait(250); // feel like a network, so loading states are seen once
  const u = new URL(path, "http://demo");
  const p = u.pathname;
  const student = u.searchParams.get("student");
  const s = load();

  try {
    if (p === "/school") return { name: SCHOOL.name, shortName: SCHOOL.shortName, logoUrl: SCHOOL.logoUrl, officePhone: SCHOOL.officePhone, address: SCHOOL.address };
    if (p === "/otp" && method === "POST") {
      if (!/^[6-9]\d{9}$/.test(String(body?.mobile || ""))) throw new DemoError(400, "Enter your 10-digit mobile number.");
      return { success: true };
    }
    if (p === "/verify" && method === "POST") {
      if (String(body?.code || "") !== DEMO_CODE) throw new DemoError(401, `That code is not right. (Demo code: ${DEMO_CODE})`);
      s.phone = String(body?.mobile || s.phone);
      save(s);
      localStorage.setItem(SESSION, "1");
      return { success: true };
    }
    if (p === "/logout") {
      localStorage.removeItem(SESSION);
      return { success: true };
    }

    if (!signedIn()) throw new DemoError(401, "Please sign in again.");

    if (p === "/me") return { phone: s.phone, children: KIDS.map(childPublic), school: SCHOOL };

    // School-wide: the same for every child.
    if (p === "/events") return { events: events().map(({ photos, ...e }) => e) };
    if (p === "/events/album") {
      const e = events().find((x) => x.id === u.searchParams.get("id"));
      if (!e) throw new DemoError(404, "Event not found.");
      return e;
    }

    const cancel = /^\/leave\/(.+)$/.exec(p);
    if (cancel && method === "DELETE") {
      for (const [k, list] of Object.entries(s.leave)) {
        const i = list.findIndex((x: any) => x.id === cancel[1] && x.status === "pending");
        if (i >= 0) {
          list.splice(i, 1);
          s.leave[k] = list;
          save(s);
          return { success: true, cancelled: true };
        }
      }
      throw new DemoError(404, "Application not found.");
    }

    const kid = kidOf(student || (body && body.student) || null);
    const t = today();

    switch (p) {
      case "/home": {
        const month = attendanceMonth(kid, t.slice(0, 7));
        const att = month.days.find((d) => d.date === t);
        const f = feesFor(kid, s);
        const hw = homework(kid).items.filter((h) => h.assignedOn === schoolDay(t) || (h.dueDate && h.dueDate >= t));
        const rc = reportCard(kid, null).card;
        return {
          date: t,
          child: childPublic(kid),
          month: { percent: month.totals.percent, present: month.totals.present, workingDays: month.totals.workingDays },
          result: rc ? { exam: rc.exam.title, percent: rc.percent, grade: rc.grade } : null,
          attendance: { status: att?.mark ? ({ P: "Present", A: "Absent", L: "Leave", H: "HalfDay" } as const)[att.mark] : null, holiday: att?.holiday || (weekday(t) === 0 ? "Sunday" : null) },
          fees: { dueNow: f.dueNow, fine: f.fine, balance: f.session.balance, next: f.instalments.filter((i) => i.due > t && i.outstanding > 0).map((i) => ({ name: i.name, due: i.due, amount: i.outstanding }))[0] || null },
          homework: hw,
          notice: notices(kid)[0],
          noticeCount: notices(kid).filter((n) => n.date >= addDays(t, -6)).length,
          events: events()
            .filter((e) => e.upcoming)
            .map(({ photos, ...e }) => e),
        };
      }
      case "/attendance": {
        const m = u.searchParams.get("month");
        return attendanceMonth(kid, m && /^\d{4}-\d{2}$/.test(m) && m <= t.slice(0, 7) && m >= "2026-04" ? m : t.slice(0, 7));
      }
      case "/fees":
        return feesFor(kid, s);
      case "/fees/claim": {
        const amount = Number(body?.amount);
        const utr = String(body?.utr || "").toUpperCase();
        if (!Number.isInteger(amount) || amount < 1) throw new DemoError(400, "Enter the amount you paid, in whole rupees.");
        if (!/^[A-Z0-9]{10,22}$/.test(utr)) throw new DemoError(400, "Enter the 12-digit UTR / UPI reference number from your payment app.");
        if (!body?.paidOn || body.paidOn > t) throw new DemoError(400, "Choose the date you paid.");
        if (amount > feesFor(kid, s).options.full) throw new DemoError(400, "This is more than the fee due.");
        if (Object.values(s.claims).flat().some((c: any) => c.utr === utr)) throw new DemoError(409, "This UTR has already been sent.");
        const claim = { id: `claim-${Date.now()}`, amount, utr, paidOn: body.paidOn, status: "pending", rejectReason: null, sentAt: new Date().toISOString() };
        (s.claims[kid.id] ||= []).push(claim);
        save(s);
        return { success: true, claim };
      }
      case "/homework":
        return homework(kid);
      case "/timetable":
        return timetable(kid);
      case "/notices": {
        const page = Math.max(0, Number(u.searchParams.get("page")) || 0);
        const all = notices(kid);
        return { page, notices: all.slice(page * 20, page * 20 + 20), hasMore: false };
      }
      case "/leave": {
        if (method === "POST") {
          const from = String(body?.from || "");
          const to = String(body?.to || from);
          const reason = String(body?.reason || "").trim();
          const r = leaveRules();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new DemoError(400, "Choose the first day of leave.");
          if (to < from) throw new DemoError(400, "The last day cannot be before the first day.");
          if (from < r.minFrom) throw new DemoError(400, "Leave can start at most 7 days back.");
          if (reason.length < 3) throw new DemoError(400, "Write the reason for leave.");
          const list = (s.leave[kid.id] ||= seededLeave(kid));
          if (list.some((x: any) => x.status !== "rejected" && x.from <= to && x.to >= from)) throw new DemoError(400, "You have already applied for leave on these days.");
          const halfDay = !!body?.halfDay && from === to;
          const days = halfDay ? 0.5 : Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;
          const type = ["sick", "family", "casual", "other"].includes(body?.type) ? body.type : "other";
          const row = { id: `leave-${Date.now()}`, from, to, days, type, halfDay, reason, status: "pending", decidedBy: null, decidedAt: null, createdAt: new Date().toISOString() };
          list.unshift(row);
          save(s);
          return { success: true, request: row };
        }
        return { setupNeeded: false, rules: leaveRules(), requests: s.leave[kid.id] || seededLeave(kid) };
      }
      case "/bus":
        return busFor(kid);
      case "/id-card":
        return {
          child: { name: kid.name, classSec: kid.classSec, rollNo: kid.rollNo, srNo: kid.srNo, admissionNo: kid.admissionNo, fatherName: kid.fatherName, motherName: kid.motherName, photoUrl: null, dob: kid.dob, address: "Sindhari Road, Near Bus Stand, Barmer", bus: kid.bus ? kid.busRoute : null, mobile: s.phone },
          school: { name: SCHOOL.name, shortName: SCHOOL.shortName, logoUrl: SCHOOL.logoUrl, address: SCHOOL.address, officePhone: SCHOOL.officePhone },
          session: "2026-27",
        };
      case "/report-card":
        return reportCard(kid, u.searchParams.get("exam"));
      case "/exams/schedule":
        return examSchedule(kid);
      case "/profile/request": {
        if (method !== "POST") break;
        const message = String(body?.message || "").trim();
        if (message.length < 3) throw new DemoError(400, "Write what needs to change.");
        (s.requests[kid.id] ||= []).unshift({ id: `req-${Date.now()}`, message, status: "pending", sentAt: new Date().toISOString() });
        save(s);
        return { success: true };
      }
    }

    throw new DemoError(404, "Not found");
  } catch (e) {
    if (e instanceof DemoError) throw e;
    throw new DemoError(500, "Something went wrong.");
  }
}

export { DemoError };
