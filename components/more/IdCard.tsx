"use client";

import { useL, useT } from "@/lib/i18n";
import { initials, phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";

/**
 * The child's ID card on the phone. Same look as the printed card in the ERP
 * (components/students/IdCardPrint.tsx) in layout: school band, photo over the band, details below.
 * The band takes the app's deep sky so the card matches the rest of the app.
 */

const BAND = "#0369A1";

export interface IdCardData {
  child: {
    name: string;
    classSec: string;
    rollNo: string;
    srNo: string;
    admissionNo: string;
    fatherName: string;
    motherName: string;
    photoUrl: string | null;
    dob: string | null;
    address: string;
    bus: string | null;
    mobile: string;
  };
  school: { name: string; shortName: string; logoUrl: string | null; address: string; officePhone: string };
  session: string;
}

const dob = (d: string | null, lang: "hi" | "en") =>
  d ? new Date(d + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export function IdCard({ data }: { data: IdCardData }) {
  const L = useL();
  const { lang } = useT();
  const { child: c, school: s } = data;
  const rows: [string, string][] = [
    [L(M.adm), c.admissionNo],
    [L(M.sr), c.srNo],
    [L(M.roll), c.rollNo],
    [L(M.father), c.fatherName],
    [L(M.mother), c.motherName],
    [L(M.dob), dob(c.dob, lang)],
    [L(M.mobile), phoneText(c.mobile)],
    [L(M.transport), c.bus || ""],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <article className="mx-auto w-full max-w-[360px] overflow-hidden rounded-3xl bg-white" aria-label={L(M.studentId)}>
      {/* School band */}
      <div className="px-4 pb-12 pt-4 text-white" style={{ background: BAND }}>
        <div className="flex items-center gap-3">
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-0.5" />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold" style={{ color: BAND, fontFamily: "Georgia, serif" }}>
              {s.shortName || initials(s.name)}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="text-[17px] font-semibold">{s.name}</p>
            {s.address && <p className="mt-0.5 truncate text-sm text-white/80">{s.address}</p>}
          </div>
        </div>
      </div>

      {/* Photo over the band */}
      <div className="-mt-11 flex justify-center">
        {c.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photoUrl} alt="" className="h-[124px] w-[100px] rounded-lg border-4 border-white bg-ink-100 object-cover shadow-md" />
        ) : (
          <span className="grid h-[124px] w-[100px] place-items-center rounded-lg border-4 border-white bg-ink-100 text-3xl font-bold text-ink-600 shadow-md">{initials(c.name)}</span>
        )}
      </div>

      <div className="px-4 pt-3 text-center">
        <p className="text-[22px] font-semibold leading-tight text-ink-900">{c.name}</p>
        <p className="mt-1 font-semibold text-ink-600">
          {L(M.class)} {c.classSec}
        </p>
      </div>

      <dl className="mx-4 mt-3 divide-y divide-ink-100 border-t border-ink-100">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-3 py-2">
            <dt className="w-[42%] shrink-0 text-sm text-ink-500">{k}</dt>
            <dd className="tnum min-w-0 break-words font-medium text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex items-center justify-between px-4 pb-3 text-sm text-ink-500">
        <span>
          {L(M.session)} {data.session}
        </span>
        <span className="tnum">{s.shortName}</span>
      </div>
      <div className="flex min-h-[36px] items-center justify-center px-4 text-sm font-semibold text-white" style={{ background: BAND }}>
        {s.officePhone ? `Ph. ${phoneText(s.officePhone)}` : s.name}
      </div>
    </article>
  );
}
