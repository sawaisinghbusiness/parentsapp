"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ChevronDown, Download, Repeat2, Share2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { num } from "@/lib/format";
import type { Report, SheetSchool } from "@/lib/exam";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, Skeleton } from "@/components/ui";
import { ReportBack, ReportFront, SHEET_H, SHEET_W, type SheetStudent } from "@/components/report/ReportSheets";

/**
 * The school's own report card, as released from the ERP (only locked exams reach parents).
 * Pick the exam on top; the A4 card fits the phone and turns over on tap to show its back.
 * Download prints both sides, which the phone saves as a PDF.
 */
export default function ReportCardPage() {
  const { me, child } = useParent();
  const L = useL();
  const [exam, setExam] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data, error, reload } = useApi<Report>(child ? `/report-card?student=${child.id}${exam ? `&exam=${encodeURIComponent(exam)}` : ""}` : null);

  // Fit the A4 sheet to the screen's width.
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / SHEET_W)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [data]);

  // A new exam or child starts on the front.
  useEffect(() => setFlipped(false), [exam, child?.id]);

  if (!child || !me) return <Skeleton className="h-[560px] w-full rounded-2xl" />;
  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <Skeleton className="h-[560px] w-full rounded-2xl" />;
  }
  const c = data.card;
  if (!data.exams.length || !c) return <Empty>{L(M.noResult)}</Empty>;

  // Older servers send no particulars or letterhead: use what the app already knows.
  const student: SheetStudent = c.student || { name: child.name, rollNo: child.rollNo, srNo: child.srNo, fatherName: child.fatherName, motherName: child.motherName, dob: null, classSec: child.classSec };
  const school: SheetSchool = data.school || {
    name: me.school.name,
    short: me.school.shortName,
    affiliationNo: "",
    schoolCode: "",
    place: me.school.address,
    city: "",
    pincode: "",
    phone: me.school.officePhone,
    email: "",
    logoUrl: me.school.logoUrl,
    principal: "",
  };
  const session = data.session || "";

  async function share() {
    const text = `${student.name} · ${c!.exam.title}: ${num(c!.grand)}/${c!.outOf} (${num(c!.percent)}%)${c!.grade ? ` · ${c!.grade}` : ""} · ${c!.result}`;
    try {
      if (navigator.share) await navigator.share({ title: L({ hi: "रिपोर्ट कार्ड", en: "Report card" }), text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* closed the share sheet */
    }
  }

  const front = <ReportFront card={c} student={student} school={school} session={session} />;
  const back = <ReportBack card={c} school={school} scale={data.grades.scale} passPercent={data.grades.passPercent} />;
  const h = SHEET_H * scale;

  return (
    <div className="animate-rise space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{L({ hi: "परीक्षा चुनें", en: "Choose exam" })}</span>
          <select
            value={c.exam.id}
            onChange={(e) => setExam(e.target.value)}
            className="h-12 w-full appearance-none truncate rounded-[10px] border border-ink-200 bg-ink-50 pl-3.5 pr-10 text-[16px] font-semibold text-ink-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          >
            {data.exams
              .slice()
              .reverse()
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden />
        </label>
        <button onClick={share} className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border border-ink-200 text-ink-900 active:bg-ink-50" aria-label={L({ hi: "शेयर करें", en: "Share" })}>
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
        <button onClick={() => window.print()} className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-brand-600 text-white active:bg-brand-700" aria-label={L({ hi: "PDF डाउनलोड करें", en: "Download PDF" })}>
          <Download className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {copied && <p className="text-[13px] text-ink-500">{L({ hi: "कॉपी हो गया", en: "Copied" })}</p>}

      <div ref={box}>
        <button
          className="flip block w-full"
          onClick={() => {
            setTouched(true);
            setFlipped((f) => !f);
          }}
          aria-pressed={flipped}
          aria-label={flipped ? L({ hi: "आगे का हिस्सा दिखाएँ", en: "Show the front" }) : L({ hi: "पीछे का हिस्सा दिखाएँ", en: "Show the back" })}
        >
          <span className={clsx("flip-inner", flipped && "is-flipped", !touched && "nudge")}>
            <Face h={h} scale={scale}>
              {front}
            </Face>
            <Face h={h} scale={scale} back>
              {back}
            </Face>
          </span>
        </button>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-[13px] text-ink-500">
        <Repeat2 className="h-4 w-4" aria-hidden />
        {flipped ? L({ hi: "वापस पलटने के लिए छुएँ", en: "Tap to turn back" }) : L({ hi: "पीछे देखने के लिए छुएँ", en: "Tap to see the back" })}
      </p>

      {/* Both sides at full A4 size, shown only when printing (Download → Save as PDF). */}
      {createPortal(
        <div id="rc-print">
          {front}
          {back}
        </div>,
        document.body
      )}
    </div>
  );
}

function Face({ h, scale, back, children }: { h: number; scale: number; back?: boolean; children: React.ReactNode }) {
  return (
    <span className={clsx("flip-face overflow-hidden rounded-md bg-white shadow-[0_6px_22px_rgba(11,34,82,0.16)] ring-1 ring-ink-200", back && "flip-back")} style={{ height: h }}>
      <span className="block origin-top-left text-left" style={{ width: SHEET_W, transform: `scale(${scale})` }}>
        {children}
      </span>
    </span>
  );
}
