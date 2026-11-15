"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError, useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL, useT, type Lang } from "@/lib/i18n";
import { monthYear, num, weekdayDate } from "@/lib/format";
import { LEAVE_TYPES, type Leave, type LeaveData, type LeaveStatus } from "@/lib/leave";
import { M } from "@/lib/text/more";
import { Empty, ErrorCard, ListSkeleton, Status, type Tone } from "@/components/ui";
import { Button, Group, Quiet, Row, Section } from "@/components/kit";
import "@/components/study.css";

const TONE: Record<LeaveStatus, Tone> = { pending: "wait", approved: "ok", rejected: "bad" };
const range = (q: Leave, lang: Lang) => (q.from === q.to ? weekdayDate(q.from, lang) : `${weekdayDate(q.from, lang)} – ${weekdayDate(q.to, lang)}`);

/** The child's leave applications, one card per month with ruled rows. + on the top bar applies. */
export default function LeavePage() {
  const { child } = useParent();
  const L = useL();
  const { lang } = useT();
  const { data, error, reload } = useApi<LeaveData>(child ? `/leave?student=${child.id}` : null);
  const [sent, setSent] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sent") === "1") {
      setSent(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, Leave[]>();
    for (const q of (data?.requests || []).slice().sort((a, b) => b.from.localeCompare(a.from))) {
      const k = q.from.slice(0, 7);
      m.set(k, [...(m.get(k) || []), q]);
    }
    return Array.from(m.entries());
  }, [data]);

  async function cancel(id: string) {
    setBusy(true);
    setProblem("");
    try {
      await api(`/leave/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setProblem(err instanceof ApiError && err.message ? err.message : L({ hi: "अर्ज़ी वापस नहीं हुई। दोबारा कोशिश करें।", en: "Could not cancel. Please try again." }));
    } finally {
      setAsking(null);
      setBusy(false);
    }
  }

  if (!data) {
    if (error && error.status !== 401) return <ErrorCard offline={error.status === 0} onRetry={reload} />;
    return <ListSkeleton />;
  }
  if (data.setupNeeded) return <Empty>{L(M.leaveSetup)}</Empty>;

  const span = (q: Leave) => (q.halfDay ? L({ hi: "आधा दिन", en: "Half day" }) : q.days === 1 ? L({ hi: "पूरा दिन", en: "Full day" }) : `${num(q.days)} ${L(M.days)}`);

  return (
    <div className="study space-y-6 pb-4 pt-1">
      {(sent || problem) && (
        <div className="study-in space-y-3">
          {sent && (
            <p role="status" className="rounded-2xl bg-[#EAF4EE] px-4 py-3 text-[16px] font-medium leading-6 text-[#21613F]">
              {L(M.sent)}
            </p>
          )}
          {problem && (
            <p role="alert" className="text-[14px] leading-5 text-[#A32F35]">
              {problem}
            </p>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <Section>
          <Quiet>{L(M.noPast)}</Quiet>
          <Link
            href="/leave/apply/"
            className="action-primary mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0D2A5E] px-5 text-[16px] font-semibold text-white transition-colors active:bg-[#0A2149]"
          >
            {L({ hi: "छुट्टी की अर्ज़ी भेजें", en: "Apply for leave" })}
          </Link>
        </Section>
      ) : (
        groups.map(([month, list], gi) => (
          <Section key={month} title={monthYear(month, lang)} delay={Math.min(gi, 2) * 70}>
            <Group>
              {list.map((q) => (
                <Row
                  key={q.id}
                  className="[&>span]:items-start"
                  title={<span className="tnum">{range(q, lang)}</span>}
                  sub={
                    <>
                      <span className="block">
                        {q.type ? L(LEAVE_TYPES[q.type]) : L({ hi: "छुट्टी", en: "Leave" })} · {span(q)}
                      </span>
                      <span className="mt-1 block whitespace-pre-line break-words text-ink-700">{q.reason}</span>
                      {q.status !== "pending" && q.decidedBy && (
                        <span className="mt-1 block">{lang === "hi" ? `${q.decidedBy} ${L(M.by)}` : `${L(M.by)} ${q.decidedBy}`}</span>
                      )}
                    </>
                  }
                  trail={<Status tone={TONE[q.status]}>{L(M[q.status])}</Status>}
                >
                  {q.status === "pending" &&
                    (asking === q.id ? (
                      <div className="-mt-1 space-y-3 px-4 pb-4">
                        <p className="text-[16px] leading-6 text-ink-900">{L(M.cancelSure)}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Button kind="line" onClick={() => setAsking(null)} disabled={busy}>
                            {L(M.no)}
                          </Button>
                          <Button onClick={() => cancel(q.id)} disabled={busy}>
                            {L(M.yesCancel)}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="-mt-3 px-4 pb-1">
                        <button onClick={() => setAsking(q.id)} className="min-h-[44px] text-[14px] font-medium leading-5 text-[#0D2A5E]">
                          {L(M.cancel)}
                        </button>
                      </div>
                    ))}
                </Row>
              ))}
            </Group>
          </Section>
        ))
      )}
    </div>
  );
}
