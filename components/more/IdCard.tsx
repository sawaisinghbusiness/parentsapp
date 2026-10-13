"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { RotateCw } from "lucide-react";
import { useL } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { M } from "@/lib/text/more";

/**
 * The child's ID card, the same card the ERP prints (SMS BARMER components/students/IdCardPrint.tsx):
 * CR80 portrait (54 × 85.6 mm), jade band, photo over the band, QR on the back. Tap turns it over.
 * Drawn in millimetres and scaled to the phone, so it matches the printed card exactly.
 */

const CARD_W = 54;
const CARD_H = 85.6;
const MM = 96 / 25.4; // CSS pixels in a millimetre

/** Deep jade: the school colour on the card. White text on it is ~7.5:1. */
const BAND = "#0A5C4C";
/** A plain, narrow sans like the ERP's card face; the app's own font runs taller and pushes the bottom strip off the card. */
const CARD_FONT = 'Arial, "Helvetica Neue", Roboto, sans-serif';
const TINT = "#E6F1EE";

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
  /** The printed card's letterhead; older servers send none (the app falls back to `school`). */
  card?: { name: string; short: string; address: string; phone: string; affiliation: string; validTill: string | null };
}

interface CardSchool {
  name: string;
  short: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  affiliation: string;
  session: string;
  validTill: string | null;
}

const longDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dob = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const phone = (p?: string) => {
  const d = (p || "").replace(/\D/g, "").slice(-10);
  if (/^(\d)\1{9}$/.test(d)) return "—"; // 9999999999-style placeholders
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p || "—";
};
/** "Nursery - A" -> "Nursery – A", as on the printed card. */
const classLabel = (classSec: string) => classSec.replace(/\s*-\s*/, " – ");

function Logo({ school, size, onWhite }: { school: CardSchool; size: string; onWhite?: boolean }) {
  return school.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={school.logoUrl} alt="" className="shrink-0 rounded-full object-contain p-[0.5mm]" style={{ width: size, height: size, background: onWhite ? TINT : "#fff" }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full text-[6pt] font-extrabold" style={{ width: size, height: size, color: BAND, background: onWhite ? TINT : "#fff" }}>
      {school.short}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-[1.4mm]">
      <dt className="w-[11mm] shrink-0 text-[#62677A]">{label}</dt>
      <dd className="min-w-0 truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Front({ c, school }: { c: IdCardData["child"]; school: CardSchool }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3mm] bg-white text-[#141519] ring-[0.2mm] ring-[#C9CCD5]">
      <div className="px-[3mm] pb-[8mm] pt-[6mm] text-white" style={{ background: BAND }}>
        <div className="flex items-center gap-[1.8mm]">
          <Logo school={school} size="8.5mm" />
          <div className="min-w-0 leading-[1.15]">
            <div className="line-clamp-2 text-[8.4pt] font-bold">{school.name}</div>
            <div className="mt-[0.4mm] truncate text-[5.6pt] text-white/85">{school.address}</div>
            {school.affiliation && <div className="truncate text-[5.4pt] text-white/75">{school.affiliation}</div>}
          </div>
        </div>
      </div>
      <span aria-hidden className="h-[0.8mm] bg-[#FAB124]" />

      <div className="-mt-[7.6mm] flex justify-center">
        {c.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photoUrl} alt="" className="h-[24mm] w-[19.5mm] rounded-[1.5mm] border-[0.8mm] border-white object-cover shadow-[0_0.3mm_1mm_rgba(0,0,0,0.25)]" />
        ) : (
          <span className="flex h-[24mm] w-[19.5mm] items-center justify-center rounded-[1.5mm] border-[0.8mm] border-white text-[15pt] font-bold shadow-[0_0.3mm_1mm_rgba(0,0,0,0.25)]" style={{ background: TINT, color: BAND }}>
            {initials(c.name)}
          </span>
        )}
      </div>

      <div className="px-[3mm] pt-[1.6mm] text-center">
        <div className="line-clamp-2 text-[10.5pt] font-bold leading-[1.15]">{c.name}</div>
        <span className="mt-[1mm] inline-block rounded-[1mm] px-[1.8mm] py-[0.4mm] text-[6.8pt] font-bold" style={{ background: TINT, color: BAND }}>
          Class {classLabel(c.classSec)}
        </span>
      </div>

      <dl className="mt-[2mm] space-y-[0.7mm] px-[3.4mm] text-[6.6pt] leading-tight">
        <Row label="Adm. no." value={c.admissionNo || c.srNo || "—"} />
        <Row label="Roll no." value={c.rollNo || "—"} />
        <Row label="Father" value={c.fatherName || "—"} />
        <Row label="D.O.B." value={dob(c.dob)} />
        <Row label="Mobile" value={phone(c.mobile)} />
      </dl>

      <div className="mt-auto flex items-end justify-between px-[3.4mm] pb-[1.6mm] pt-[2mm]">
        <span className="text-[5.8pt] text-[#454957]">Session {school.session}</span>
        <span className="w-[17mm] border-t-[0.2mm] border-[#62677A] pt-[0.4mm] text-center text-[5.6pt] text-[#454957]">Principal</span>
      </div>
      <div className="flex h-[4mm] items-center justify-center text-[5.6pt] font-semibold text-white" style={{ background: BAND }}>
        {school.phone ? `Ph. ${phone(school.phone)}` : school.name}
      </div>
    </div>
  );
}

function Back({ c, school }: { c: IdCardData["child"]; school: CardSchool }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3mm] bg-white text-[#141519] ring-[0.2mm] ring-[#C9CCD5]">
      <span aria-hidden className="h-[1.6mm]" style={{ background: BAND }} />
      <div className="flex flex-1 flex-col px-[3.4mm] pt-[5mm]">
        <p className="text-center text-[5.8pt] text-[#454957]">If found, please return to</p>
        <div className="mt-[1mm] flex flex-col items-center text-center">
          <Logo school={school} size="7mm" onWhite />
          <div className="mt-[0.8mm] text-[8pt] font-bold leading-tight" style={{ color: BAND }}>
            {school.name}
          </div>
          <div className="mt-[0.4mm] text-[6pt] leading-snug text-[#2E313B]">{school.address}</div>
          {school.phone && <div className="text-[6.2pt] font-semibold tabular-nums">Ph. {phone(school.phone)}</div>}
        </div>

        <div className="mt-[2.6mm] rounded-[1.4mm] px-[2.2mm] py-[1.6mm]" style={{ background: TINT }}>
          <div className="text-[5.6pt] font-semibold" style={{ color: BAND }}>
            In emergency, call
          </div>
          <div className="text-[7pt] font-semibold leading-tight">{c.fatherName || "Parent"}</div>
          <div className="text-[9pt] font-bold tabular-nums leading-tight">{phone(c.mobile)}</div>
        </div>

        <div className="mt-[2mm] flex items-start gap-[2mm]">
          <dl className="min-w-0 flex-1 space-y-[1mm] text-[6.4pt] leading-snug">
            <div>
              <dt className="text-[5.6pt] text-[#62677A]">Address</dt>
              <dd className="line-clamp-3">{c.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-[5.6pt] text-[#62677A]">Transport</dt>
              <dd className="line-clamp-2">{c.bus || "Own"}</dd>
            </div>
          </dl>
          <StudentQr c={c} school={school} />
        </div>

        <ul className="mt-auto list-disc space-y-[0.3mm] pb-[1.6mm] pl-[3mm] text-[5.4pt] leading-snug text-[#454957]">
          <li>This card belongs to the school and cannot be transferred.</li>
          <li>Carry it every day and show it when asked.</li>
          <li>Tell the school office at once if it is lost.</li>
        </ul>
      </div>
      <div className="flex h-[4.6mm] items-center justify-center text-[6pt] font-semibold text-white" style={{ background: BAND }}>
        {school.validTill ? `Valid till ${longDate(school.validTill)}` : `Session ${school.session}`}
      </div>
    </div>
  );
}

/** Same QR as the printed card: the child's identity as plain text, drawn as SVG. */
function StudentQr({ c, school }: { c: IdCardData["child"]; school: CardSchool }) {
  const text = [c.name, `Class ${classLabel(c.classSec)}`, `SR no. ${c.srNo}`, c.admissionNo ? `Adm. no. ${c.admissionNo}` : "", school.name].filter(Boolean).join("\n");
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="h-[16mm] w-[16mm] shrink-0" role="img" aria-label={`QR code for ${c.name}`} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} fill="#fff" />
      <path d={d} fill="#141519" />
    </svg>
  );
}

function Face({ scale, back, children }: { scale: number; back?: boolean; children: React.ReactNode }) {
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-[3mm] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_10px_24px_-8px_rgba(16,24,40,0.22)] [backface-visibility:hidden] ${back ? "[transform:rotateY(180deg)]" : ""}`}>
      <div style={{ width: `${CARD_W}mm`, height: `${CARD_H}mm`, transform: `scale(${scale})`, transformOrigin: "top left", fontFamily: CARD_FONT, lineHeight: 1.2, letterSpacing: "normal" }}>{children}</div>
    </div>
  );
}

export function IdCard({ data }: { data: IdCardData }) {
  const L = useL();
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [scale, setScale] = useState(1.5);
  const { child: c, school: s, card } = data;
  const school: CardSchool = {
    name: card?.name || s.name,
    short: card?.short || s.shortName || initials(s.name),
    logoUrl: s.logoUrl,
    address: card?.address || s.address,
    phone: card?.phone || s.officePhone,
    affiliation: card?.affiliation || "",
    session: data.session,
    validTill: card?.validTill || null,
  };

  // As wide as the screen allows (at most ~1.75× the real card).
  useEffect(() => {
    const fit = () => setScale(Math.min(1.75, (ref.current?.clientWidth || 300) / (CARD_W * MM)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const turn = () => setFlipped((f) => !f);
  const w = CARD_W * MM * scale;
  const h = CARD_H * MM * scale;

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[360px] flex-col items-center">
      <div className="[perspective:1600px]" style={{ width: w, height: h }}>
        <div
          role="button"
          tabIndex={0}
          onClick={turn}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              turn();
            }
          }}
          aria-pressed={flipped}
          aria-label={L(M.studentId)}
          className="relative h-full w-full cursor-pointer select-none rounded-[3mm] transition-transform duration-700 [transform-style:preserve-3d] [transition-timing-function:cubic-bezier(0.3,0.9,0.3,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-jade-600/30 motion-reduce:duration-0"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          <Face scale={scale}>
            <Front c={c} school={school} />
          </Face>
          <Face scale={scale} back>
            <Back c={c} school={school} />
          </Face>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-500">
        <RotateCw className="h-3.5 w-3.5" aria-hidden />
        {flipped ? L({ hi: "पीछे का हिस्सा · आगे देखने के लिए टैप करें", en: "Back · tap to see the front" }) : L({ hi: "आगे का हिस्सा · पीछे देखने के लिए टैप करें", en: "Front · tap to see the back" })}
      </p>
    </div>
  );
}
