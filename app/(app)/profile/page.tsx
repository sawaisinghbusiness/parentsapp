"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronRight, CircleHelp, IdCard, Languages, LogOut, PenLine, Phone, Users, type LucideIcon } from "lucide-react";
import { api, ApiError, markSignedIn, clearOnSignOut, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { fullDate, phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";
import type { IdCardData } from "@/components/more/IdCard";
import { Sheet, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";
import { Button, CARD, RULED, Section } from "@/components/kit";
import "@/components/study.css";

/** Soft blue of the Home tiles, used once as a thin band at the top of the identity card. */
const BAND = "linear-gradient(160deg,#F4F7FF 0%,#DCE5FF 100%)";

/**
 * The child's picture, or initials on the neutral tile. Local copy of ui's Avatar: that one draws
 * initials in bold (700), and this page keeps to 400/500/600. A white ring lifts it off the band.
 */
function Face({ name, url, size }: { name: string; url?: string | null; size: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const ring = "shrink-0 rounded-full ring-4 ring-white";
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return url && failed !== url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} onError={() => setFailed(url)} className={clsx(ring, "object-cover object-[50%_22%]")} style={{ width: size, height: size }} />
  ) : (
    <span className={clsx(ring, "grid place-items-center bg-[#EAF0F6] text-[28px] font-semibold leading-9 text-[#0D2A5E]")} style={{ width: size, height: size }}>
      {letters}
    </span>
  );
}

/** A settings row in the reference look: 24px outline icon, 16 medium label, quiet value, chevron. */
function MenuRow({ icon: Icon, text, value, href, onClick }: { icon: LucideIcon; text: string; value?: string; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <Icon className="h-6 w-6 shrink-0 text-ink-700" strokeWidth={1.6} aria-hidden />
      <span className="min-w-0 flex-1 text-[16px] font-medium leading-6 text-ink-900">{text}</span>
      {value && <span className="shrink-0 text-[14px] leading-5 text-ink-500">{value}</span>}
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" strokeWidth={1.75} aria-hidden />
    </>
  );
  const cls = "flex min-h-[56px] w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-[#F1F5F9]";
  return (
    <li>
      {href?.startsWith("tel:") ? (
        <a href={href} className={cls}>
          {inner}
        </a>
      ) : href ? (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cls}>
          {inner}
        </button>
      )}
    </li>
  );
}

/** The child as the school has them, a way to ask for a correction, then the few settings. */
export default function ProfilePage() {
  const { me, child } = useParent();
  const L = useL();
  const { lang, setLang } = useT();
  const { data } = useApi<IdCardData>(child ? `/id-card?student=${child.id}` : null);
  const [leaving, setLeaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function logout() {
    setLeaving(true);
    await api("/logout", { method: "POST" }).catch(() => null);
    clearOnSignOut();
    markSignedIn(false);
    window.location.replace("/login/");
  }

  if (!me || !child) {
    return (
      <div className="space-y-6 pt-1">
        <div className={clsx(CARD, "p-4")}>
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <Skeleton className="mt-4 h-6 w-40" />
          <Skeleton className="mt-2 h-5 w-48" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-2xl" />
      </div>
    );
  }

  const c = data?.child;
  const rows: [string, string][] = [
    [L(M.dob), c?.dob ? fullDate(c.dob, lang) : ""],
    [L(M.father), child.fatherName],
    [L(M.mother), child.motherName],
    [L(M.mobile), phoneText(c?.mobile || me.phone)],
    [L(M.address), c?.address || ""],
  ].filter(([, v]) => v) as [string, string][];
  const facts: [string, string][] = [
    [L(M.sr), child.srNo],
    [L(M.adm), child.admissionNo],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="study space-y-6 pb-4 pt-1">
      {/* Who this is: picture over a thin soft band, name, class, school; the two school numbers below. */}
      <Section>
        <div className={CARD}>
          <div className="h-14" style={{ background: BAND }} aria-hidden />
          <div className="px-4 pb-4">
            <div className="-mt-9">
              <Face name={child.name} url={child.photoUrl} size={72} />
            </div>
            <h1 className="mt-3 break-words text-[20px] font-semibold leading-7 text-ink-900">{child.name}</h1>
            <p className="mt-1 text-[16px] leading-6 text-ink-700">
              {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
              {child.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}` : ""}
            </p>
            <p className="mt-1 break-words text-[14px] leading-5 text-ink-500">{me.school.name}</p>
          </div>
          {facts.length > 0 && (
            <dl className="flex divide-x divide-[#E6ECF3] border-t border-[#E6ECF3]">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0 flex-1 px-4 py-3">
                  <dt className="text-[14px] leading-5 text-ink-500">{k}</dt>
                  <dd className="tnum mt-0.5 break-words text-[16px] font-medium leading-6 text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Section>

      <Section title={L({ hi: "बच्चे की जानकारी", en: "Child's details" })} delay={70}>
        <div className={CARD}>
          <dl className={RULED}>
            {rows.map(([k, v]) => (
              <div key={k} className="flex min-h-[56px] items-baseline gap-4 px-4 py-4">
                <dt className="w-[40%] shrink-0 text-[14px] leading-6 text-ink-500">{k}</dt>
                <dd className="min-w-0 flex-1 break-words text-right text-[16px] leading-6 text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          <button type="button" onClick={() => setAsking(true)} className="flex min-h-[56px] w-full items-center gap-3 border-t border-[#E6ECF3] px-4 py-4 text-left text-[#0D2A5E] transition-colors active:bg-[#F1F5F9]">
            <PenLine className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 text-[16px] font-medium leading-6">{L({ hi: "स्कूल से सुधार करवाएँ", en: "Ask school to update" })}</span>
            <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </Section>

      <Section title={L({ hi: "यह बच्चा", en: "This child" })} delay={140}>
        <ul className={clsx(CARD, RULED)}>
          {me.children.length > 1 && <MenuRow icon={Users} text={L({ hi: "बच्चा बदलें", en: "Switch child" })} value={child.name.split(" ")[0]} onClick={() => setSwitching(true)} />}
          <MenuRow icon={IdCard} text={L(M.idCard)} href="/id-card/" />
        </ul>
      </Section>

      <Section title={L({ hi: "ऐप", en: "App" })} delay={140}>
        <ul className={clsx(CARD, RULED)}>
          <MenuRow icon={Languages} text={L({ hi: "भाषा", en: "Language" })} value={lang === "hi" ? "हिंदी" : "English"} onClick={() => setLang(lang === "hi" ? "en" : "hi")} />
        </ul>
      </Section>

      <Section title={L({ hi: "मदद", en: "Help" })} delay={140}>
        <ul className={clsx(CARD, RULED)}>
          {me.school.officePhone && <MenuRow icon={Phone} text={L({ hi: "स्कूल ऑफ़िस को कॉल करें", en: "Call school office" })} value={me.school.officePhone} href={`tel:${me.school.officePhone.replace(/\s/g, "")}`} />}
          <MenuRow icon={CircleHelp} text={L({ hi: "एआई असिस्टेंट से पूछें", en: "Ask AI Assistant" })} href="/assistant/" />
        </ul>
      </Section>

      <Section delay={140}>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#DCE4ED] bg-white text-[16px] font-medium leading-6 text-[#A32F35] transition-colors active:bg-[#F1F5F9] disabled:opacity-60"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          {leaving ? "…" : L({ hi: "लॉग आउट", en: "Log out" })}
        </button>
      </Section>

      {asking && <AskUpdate studentId={child.id} onClose={() => setAsking(false)} />}
      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </div>
  );
}

/** A correction request to the office: free text, the office changes the record in the ERP. */
function AskUpdate({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const L = useL();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return setProblem(L({ hi: "क्या बदलना है, लिखें।", en: "Write what needs to change." }));
    setBusy(true);
    setProblem("");
    try {
      await api("/profile/request", { body: { student: studentId, message: text.trim() } });
      setDone(true);
    } catch (err) {
      const x = err instanceof ApiError ? err : null;
      setProblem(x?.status === 404 ? L({ hi: "यह सुविधा अभी चालू नहीं है। स्कूल ऑफ़िस को कॉल करें।", en: "This is not switched on yet. Please call the school office." }) : x?.message || L({ hi: "नहीं भेजा जा सका। दोबारा कोशिश करें।", en: "Could not send. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={L({ hi: "स्कूल से सुधार करवाएँ", en: "Ask school to update" })} onClose={onClose}>
      {done ? (
        <div className="space-y-4 pt-1">
          <p className="text-[16px] leading-6 text-ink-700">{L({ hi: "भेज दिया। स्कूल ऑफ़िस रिकॉर्ड ठीक करके बताएगा।", en: "Sent. The school office will correct the record and let you know." })}</p>
          <Button onClick={onClose} className="w-full">
            {L({ hi: "ठीक है", en: "Done" })}
          </Button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-3 pt-1" noValidate>
          <label htmlFor="profile-ask" className="block text-[14px] leading-5 text-ink-500">
            {L({ hi: "क्या गलत है और सही क्या है, लिखें। जैसे: जन्म तिथि 14 मार्च 2016 है।", en: "Write what is wrong and what is right. For example: date of birth is 14 March 2016." })}
          </label>
          <textarea id="profile-ask" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={500} className="textarea-box text-[16px]" autoFocus />
          {problem && (
            <p role="alert" className="text-[14px] leading-5 text-[#A32F35]">
              {problem}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "…" : L({ hi: "भेजें", en: "Send" })}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
