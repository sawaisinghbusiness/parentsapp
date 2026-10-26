"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronRight, CircleHelp, IdCard, Languages, PenLine, Phone, Users, type LucideIcon } from "lucide-react";
import { api, ApiError, markSignedIn, clearCache, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT } from "@/lib/i18n";
import { fullDate, phoneText } from "@/lib/format";
import { M } from "@/lib/text/more";
import type { IdCardData } from "@/components/more/IdCard";
import { Avatar, Sheet, Skeleton } from "@/components/ui";
import { ChildSheet } from "@/components/ChildSheet";

function Row({ icon: Icon, text, value, href, onClick, last }: { icon: LucideIcon; text: string; value?: string; href?: string; onClick?: () => void; last?: boolean }) {
  const inner = (
    <>
      <Icon className="h-5 w-5 shrink-0 text-ink-900" strokeWidth={1.8} aria-hidden />
      <span className="min-w-0 flex-1 text-[15px]">{text}</span>
      {value && <span className="shrink-0 text-[14px] text-ink-600">{value}</span>}
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-400" aria-hidden />
    </>
  );
  const cls = clsx("flex min-h-[52px] w-full items-center gap-3.5 pr-3.5 text-left active:bg-ink-50", !last && "border-b border-ink-100");
  if (href?.startsWith("tel:"))
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** A titled white box of rows, as on the staff app's profile (user, 2026-10-26). */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mb-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
      <div className="rounded-2xl border border-ink-100 bg-white pl-4">{children}</div>
    </section>
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
  const tint = Math.max(0, me?.children.findIndex((c) => c.id === child?.id) ?? 0);

  async function logout() {
    setLeaving(true);
    await api("/logout", { method: "POST" }).catch(() => null);
    clearCache();
    markSignedIn(false);
    window.location.replace("/login/");
  }

  if (!me || !child) {
    return (
      <div className="flex flex-col items-center gap-2 pt-2">
        <Skeleton className="h-[76px] w-[76px] rounded-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-48" />
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

  return (
    <div className="animate-rise space-y-3.5 pb-6 pt-1">
      <section className="flex items-center gap-3.5 rounded-2xl border border-ink-100 bg-white p-4">
        <Avatar name={child.name} url={child.photoUrl} size={60} tint={tint} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold">{child.name}</span>
          <span className="block truncate text-[13.5px] text-ink-600">
            {L({ hi: "कक्षा", en: "Class" })} {child.classSec}
            {child.rollNo ? ` · ${L({ hi: "रोल", en: "Roll" })} ${child.rollNo}` : ""}
          </span>
          <span className="block truncate text-[13px] text-ink-500">
            {child.srNo} · {me.school.name}
          </span>
        </span>
      </section>

      <Group title={L({ hi: "बच्चे की जानकारी", en: "Child's details" })}>
        {rows.map(([k, v], i) => (
          <div key={k} className={clsx("py-2.5 pr-3.5", i < rows.length - 1 && "border-b border-ink-100")}>
            <span className="block text-[12.5px] text-ink-500">{k}</span>
            <span className="block text-[15px] text-ink-900">{v}</span>
          </div>
        ))}
        <button type="button" onClick={() => setAsking(true)} className="flex min-h-[48px] w-full items-center gap-2 border-t border-ink-100 pr-3.5 text-left text-[14.5px] font-semibold text-brand-600 active:bg-ink-50">
          <PenLine className="h-[18px] w-[18px]" aria-hidden />
          {L({ hi: "स्कूल से सुधार करवाएँ", en: "Ask school to update" })}
        </button>
      </Group>

      <Group title={L({ hi: "सेटिंग", en: "Settings" })}>
        {me.children.length > 1 && <Row icon={Users} text={L({ hi: "बच्चा बदलें", en: "Switch child" })} value={child.name.split(" ")[0]} onClick={() => setSwitching(true)} />}
        <Row icon={IdCard} text={L(M.idCard)} href="/id-card/" />
        <Row icon={Languages} text={L({ hi: "भाषा", en: "Language" })} value={lang === "hi" ? "हिंदी" : "English"} onClick={() => setLang(lang === "hi" ? "en" : "hi")} last />
      </Group>

      <Group title={L({ hi: "मदद", en: "Help" })}>
        {me.school.officePhone && <Row icon={Phone} text={L({ hi: "स्कूल ऑफ़िस को कॉल करें", en: "Call school office" })} value={me.school.officePhone} href={`tel:${me.school.officePhone.replace(/\s/g, "")}`} />}
        <Row icon={CircleHelp} text={L({ hi: "स्कूल सहायक से पूछें", en: "Ask School Sahayak" })} href="/assistant/" last />
      </Group>

      <button type="button" onClick={logout} disabled={leaving} className="min-h-[50px] w-full rounded-2xl border border-ink-100 bg-white text-[15px] font-semibold text-rose-700 active:bg-ink-50 disabled:opacity-60">
        {leaving ? "…" : L({ hi: "लॉग आउट", en: "Log out" })}
      </button>
      <p className="text-center text-[12px] text-ink-500">+91 {phoneText(me.phone)}</p>

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
          <p className="text-ink-700">{L({ hi: "भेज दिया। स्कूल ऑफ़िस रिकॉर्ड ठीक करके बताएगा।", en: "Sent. The school office will correct the record and let you know." })}</p>
          <button onClick={onClose} className="btn-primary w-full">
            {L({ hi: "ठीक है", en: "Done" })}
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-3 pt-1" noValidate>
          <p className="text-[14px] text-ink-500">{L({ hi: "क्या गलत है और सही क्या है, लिखें। जैसे: जन्म तिथि 14 मार्च 2016 है।", en: "Write what is wrong and what is right. For example: date of birth is 14 March 2016." })}</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={500} className="textarea-box" autoFocus />
          {problem && (
            <p role="alert" className="text-[14px] text-rose-700">
              {problem}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "…" : L({ hi: "भेजें", en: "Send" })}
          </button>
        </form>
      )}
    </Sheet>
  );
}
