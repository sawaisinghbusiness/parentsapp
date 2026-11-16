"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useDialog } from "@/lib/useDialog";
import { BookOpen, CalendarDays, CheckCircle2, FileText, ImagePlus, Loader2, X } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/api";
import { prepareHomeworkFile } from "@/lib/homeworkFile";
import { useParent } from "@/lib/parent";
import { useL, useT, type Bi } from "@/lib/i18n";
import { dayMonth, weekdayDate } from "@/lib/format";
import { S } from "@/lib/text/study";
import { Empty, ErrorCard, ListSkeleton, Sheet, Status, type Tone } from "@/components/ui";

type HwStatus = "pending" | "checked" | "not_submitted";
interface Homework {
  id: string;
  subject: string;
  title: string;
  details: string;
  assignedOn: string;
  dueDate: string | null;
  /** What the teacher marked; servers without homework checking send none. */
  status?: HwStatus | null;
  /** Photos or PDFs the teacher attached (2026-10-26); older servers send none. */
  files?: HwFile[];
  /** What the family sent back as done (2026-11-16); older servers send none. */
  submission?: Sent | null;
}
type HwFile = { url: string; name: string; kind: "image" | "pdf" };
interface Sent {
  note: string;
  files: HwFile[];
  sentAt: string;
}
interface Page {
  setupNeeded: boolean;
  today: string;
  items: Homework[];
  nextBefore: string | null;
}

const STATUS: Record<HwStatus, { tone: Tone; text: Bi }> = {
  pending: { tone: "wait", text: { hi: "बाकी", en: "Pending" } },
  checked: { tone: "ok", text: { hi: "जाँच हो गई", en: "Checked" } },
  not_submitted: { tone: "bad", text: { hi: "जमा नहीं किया", en: "Not submitted" } },
};

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/** Monday of the week `iso` falls in. */
const mondayOf = (iso: string) => addDays(iso, -((new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7));

/** Homework, newest first, in weeks: subject, date, the task, and what the teacher marked. */
export default function HomeworkPage() {
  const { child } = useParent();
  return child ? <List key={child.id} studentId={child.id} /> : <ListSkeleton rows={4} />;
}

function List({ studentId }: { studentId: string }) {
  const L = useL();
  const { data, error, reload } = useApi<Page>(`/homework?student=${studentId}`);
  const [older, setOlder] = useState<Homework[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setOlder([]);
    setCursor(undefined);
  }, [studentId]);

  const next = cursor === undefined ? data?.nextBefore ?? null : cursor;

  async function loadOlder() {
    if (!next || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const p = await api<Page>(`/homework?student=${studentId}&before=${next}`);
      setOlder((o) => [...o, ...p.items]);
      setCursor(p.nextBefore);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const groups = useMemo(() => {
    if (!data) return [];
    const thisWeek = mondayOf(data.today);
    const lastWeek = addDays(thisWeek, -7);
    const seen = new Set<string>();
    const out: { key: string; label: Bi; items: Homework[] }[] = [];
    for (const h of [...data.items, ...older]) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      const key = h.assignedOn >= thisWeek ? "this" : h.assignedOn >= lastWeek ? "last" : "earlier";
      const label = key === "this" ? { hi: "इस हफ़्ते", en: "This week" } : key === "last" ? { hi: "पिछले हफ़्ते", en: "Last week" } : { hi: "पहले", en: "Earlier" };
      const g = out.find((x) => x.key === key);
      if (g) g.items.push(h);
      else out.push({ key, label, items: [h] });
    }
    return out;
  }, [data, older]);

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton rows={4} />;
  }
  if (data.setupNeeded) return <Empty>{L(S.hwNotStarted)}</Empty>;
  if (!groups.length) return <Empty>{L(S.noHomework)}</Empty>;

  return (
    <div className="animate-rise space-y-4">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h2 className="mlabel">{L(g.label)}</h2>
          <ul className="space-y-2">
            {g.items.map((h) => (
              <Item key={h.id} h={h} today={data.today} studentId={studentId} />
            ))}
          </ul>
        </section>
      ))}
      {next && (
        <div>
          <button className="btn-line w-full" onClick={loadOlder} disabled={busy}>
            {busy ? L(S.loading) : L(S.older)}
          </button>
          {failed && <p className="mt-2 px-1 text-[13px] text-rose-600">{L(S.olderFailed)}</p>}
        </div>
      )}
    </div>
  );
}

const LONG = 160;

function Item({ h, today, studentId }: { h: Homework; today: string; studentId: string }) {
  const L = useL();
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const long = h.details.length > LONG || h.details.split("\n").length > 3;
  const st = h.status ? STATUS[h.status] : null;
  const [sent, setSent] = useState<Sent | null>(h.submission || null);
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<HwFile | null>(null);

  let due: { text: string; soon: boolean } | null = null;
  if (h.dueDate && h.status !== "checked") {
    if (h.dueDate === today) due = { text: L(S.dueToday), soon: true };
    else if (h.dueDate === addDays(today, 1)) due = { text: L(S.dueTomorrow), soon: true };
    else if (h.dueDate > today) due = { text: `${L(S.dueBy)}: ${dayMonth(h.dueDate, lang)}`, soon: false };
  }

  return (
    <li className="row-card">
      <div className="flex items-center justify-between gap-2">
        <span className="meta">
          <span>
            <BookOpen aria-hidden />
            {h.subject}
          </span>
          <span>
            <CalendarDays aria-hidden />
            {weekdayDate(h.assignedOn, lang)}
          </span>
        </span>
        {st && <Status tone={st.tone}>{L(st.text)}</Status>}
      </div>
      <p className="mt-1 text-[15.5px] font-bold leading-snug">{h.title}</p>
      {h.details && (
        <>
          <p className={clsx("mt-1 whitespace-pre-line break-words text-[14px] text-ink-700", long && !open && "line-clamp-3")}>{h.details}</p>
          {long && (
            <button className="link -my-2 text-[13px]" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? L(S.readLess) : L(S.readMore)}
            </button>
          )}
        </>
      )}
      {h.files && h.files.length > 0 && <Files files={h.files} onView={setViewing} />}
      {due && <p className={clsx("mt-1 text-[13px]", due.soon ? "font-medium text-[#78552D]" : "text-ink-500")}>{due.text}</p>}

      {/* Done at home: sent to the teacher with photos / a PDF and a note, or the button to send it. */}
      {sent ? (
        <div className="hw-submission mt-4 border-t border-ink-100 pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-[#21613F]" aria-hidden />
            <p className="min-w-0 flex-1 text-[14px] font-semibold text-ink-900">{L({ hi: "टीचर को भेज दिया", en: "Sent to the teacher" })}</p>
            <span className="tnum shrink-0 text-[12px] text-ink-500">{sentWhen(sent.sentAt, lang)}</span>
          </div>
          {sent.note && <p className="mt-1.5 whitespace-pre-line break-words text-[14px] text-ink-700">{sent.note}</p>}
          {sent.files.length > 0 && <Files files={sent.files} onView={setViewing} />}
          <button className="mt-2 inline-flex min-h-[44px] items-center text-[13px] font-semibold text-ink-800 underline underline-offset-4" onClick={() => setSending(true)}>
            {L({ hi: "बदलकर फिर भेजें", en: "Change and send again" })}
          </button>
        </div>
      ) : h.status === "checked" ? null : (
        <button className="btn-line mt-3 w-full" onClick={() => setSending(true)}>
          <CheckCircle2 className="h-4 w-4" aria-hidden /> {L({ hi: "पूरा हुआ, टीचर को भेजें", en: "Done, send to teacher" })}
        </button>
      )}
      {sending && <SendSheet h={h} studentId={studentId} sent={sent} onClose={() => setSending(false)} onSent={(x) => { setSent(x); setSending(false); }} />}
      {viewing && <Viewer file={viewing} onClose={() => setViewing(null)} />}
    </li>
  );
}

const sentWhen = (iso: string, lang: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

/** Photos as small pictures, PDFs as named chips; tapping one opens it. */
function Files({ files, onView, onRemove }: { files: HwFile[]; onView: (f: HwFile) => void; onRemove?: (f: HwFile) => void }) {
  const L = useL();
  return (
    <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
      {files.map(f=><li key={f.url} className="flex min-w-0 items-center gap-2 px-3 py-2">
        <button type="button" onClick={()=>f.kind==='pdf'?window.open(f.url,'_blank','noopener'):onView(f)} className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left">
          {f.kind==='image'?<img src={f.url} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover"/>:<span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ink-50"><FileText className="h-5 w-5 text-ink-700" aria-hidden/></span>}
          <span className="min-w-0 flex-1"><span className="block break-words text-[14px] font-semibold text-ink-900">{f.name}</span><span className="mt-0.5 block text-[12px] text-ink-500">{f.kind==='pdf'?'PDF':L({hi:'फ़ोटो',en:'Photo'})} · {L({hi:'देखने के लिए खोलें',en:'Open to view'})}</span></span>
        </button>
        {onRemove&&<button type="button" onClick={()=>onRemove(f)} aria-label={L({hi:'हटाएँ',en:'Remove'})+': '+f.name} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-600"><X className="h-[18px] w-[18px]" aria-hidden/></button>}
      </li>)}
    </ul>
  );
}

/** A photo opens full screen here; a PDF opens in the phone's own PDF viewer (new tab). */
function Viewer({ file, onClose }: { file: HwFile; onClose: () => void }) {
  const L = useL();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(file.kind === "image",panel,onClose);
  useEffect(() => {
    if (file.kind === "pdf") {
      window.open(file.url, "_blank", "noopener");
      onClose();
    }
  }, [file, onClose]);
  if (file.kind === "pdf") return null;
  return (
    <div ref={panel} tabIndex={-1} className="fixed inset-0 z-[60] flex flex-col bg-black/95 outline-none" role="dialog" aria-modal="true" aria-label={file.name}>
      <div className="pt-safe flex items-center justify-between px-2 py-1 text-white">
        <p className="min-w-0 truncate px-2 text-[14px]">{file.name}</p>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full active:bg-white/10" aria-label={L({ hi: "बंद करें", en: "Close" })}>
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={file.url} alt={file.name} className="min-h-0 flex-1 object-contain p-2" />
    </div>
  );
}

/**
 * "Done": up to five photos or PDFs of the work and a note, sent to the teacher. Each file is sent to the
 * school as soon as it is picked (photos made smaller first), so Send is quick.
 */
function SendSheet({ h, studentId, sent, onClose, onSent }: { h: Homework; studentId: string; sent: Sent | null; onClose: () => void; onSent: (s: Sent) => void }) {
  const L = useL();
  const pick = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<HwFile[]>(sent?.files || []);
  const [uploading, setUploading] = useState(0);
  const [note, setNote] = useState(sent?.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<HwFile | null>(null);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const room = 5 - files.length;
    const chosen = Array.from(list).slice(0, Math.max(0, room));
    if (list.length > room) setError(L({ hi: "ज़्यादा से ज़्यादा 5 फ़ाइलें भेज सकते हैं।", en: "You can send up to 5 files." }));
    for (const f of chosen) {
      setUploading((n) => n + 1);
      try {
        const ready = await prepareHomeworkFile(f);
        const up = await api<any>("/homework/files", { body: { student: studentId, dataUrl: ready.dataUrl, name: ready.name }, timeoutMs: 60_000 });
        const file: HwFile = up?.url ? up : up?.data;
        if (file?.url) setFiles((x) => [...x, file]);
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        setError(
          m === "big-pdf"
            ? L({ hi: "यह PDF 3.5 MB से बड़ी है। छोटी PDF या फ़ोटो भेजें।", en: "This PDF is over 3.5 MB. Send a smaller PDF or photos." })
            : m === "type"
              ? L({ hi: "सिर्फ़ फ़ोटो या PDF भेज सकते हैं।", en: "Only photos or PDFs can be sent." })
              : e instanceof ApiError && e.message && e.status !== 0
                ? e.message
                : L({ hi: "फ़ाइल नहीं जा पाई। फिर कोशिश करें।", en: "The file could not be sent. Try again." })
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function send() {
    if (!files.length && !note.trim()) return setError(L({ hi: "फ़ोटो, PDF या नोट जोड़ें।", en: "Add a photo, a PDF or a note." }));
    setBusy(true);
    setError("");
    try {
      const r = await api<{ submission: Sent }>("/homework/submit", { body: { student: studentId, homework: h.id, note: note.trim(), files } });
      onSent(r.submission);
    } catch (e) {
      setError(e instanceof ApiError && e.message && e.status !== 0 ? e.message : L({ hi: "भेजा नहीं जा सका। फिर कोशिश करें।", en: "Could not send. Try again." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={L({ hi: "होमवर्क टीचर को भेजें", en: "Send homework to teacher" })} onClose={() => !busy && !uploading && onClose()}>
      <div className="space-y-5">
        <div className="border-b border-ink-100 pb-4">
          <p className="text-[13px] text-ink-500">{h.subject}</p>
          <p className="text-[15.5px] font-bold leading-snug">{h.title}</p>
        </div>

        <section>
          <h3 className="text-[14px] font-semibold">{L({ hi: "पूरा किया हुआ काम", en: "Your completed work" })}</h3>
          <p className="text-[12.5px] text-ink-500">{L({ hi: "कॉपी के पन्नों की फ़ोटो लें या PDF चुनें (5 तक)।", en: "Take photos of the copy's pages or choose a PDF (up to 5)." })}</p>
          {files.length > 0 && <Files files={files} onView={setViewing} onRemove={(f) => setFiles((x) => x.filter((y) => y.url !== f.url))} />}
          <input ref={pick} type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
          {files.length < 5 && (
            <button type="button" className="btn-line mt-3 min-h-[52px] w-full" onClick={() => pick.current?.click()} disabled={busy || uploading > 0}>
              {uploading > 0 ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              {uploading > 0 ? L({ hi: "भेज रहे हैं…", en: "Uploading attachment…" }) : L({ hi: "फ़ोटो या PDF जोड़ें", en: "Add photo or PDF" })}
            </button>
          )}
        </section>

        <label className="block">
          <span className="text-[14px] font-semibold">{L({ hi: "टीचर के लिए नोट", en: "Note for the teacher (optional)" })}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} placeholder={L({ hi: "जैसे: सवाल 1 से 10 कर लिए, 11 समझ नहीं आया।", en: "E.g. Did questions 1 to 10, did not understand 11." })} className="textarea-box mt-1" />
        </label>

        <p className="text-[12.5px] leading-relaxed text-ink-500">{L({hi:"भेजने के बाद टीचर इसे देख और जाँच सकते हैं।",en:"Sending shares your work with the teacher. Their review appears separately."})}</p>
        {error && <p className="text-[13.5px] font-medium text-rose-700" role="alert">{error}</p>}
        <button type="button" className="btn-primary w-full" onClick={send} disabled={busy || uploading > 0}>
          {busy ? L({ hi: "भेज रहे हैं…", en: "Sending…" }) : L({ hi: "टीचर को भेजें", en: "Send to teacher" })}
        </button>
      </div>
      {viewing && <Viewer file={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}
