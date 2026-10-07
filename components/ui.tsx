"use client";

import clsx from "clsx";
import { Phone, RotateCw, WifiOff } from "lucide-react";
import { initials } from "@/lib/format";
import { useT } from "@/lib/i18n";

export function Avatar({ name, url, size = 48, muted }: { name: string; url?: string | null; size?: number; muted?: boolean }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className={clsx("grid shrink-0 place-items-center rounded-full font-bold", muted ? "bg-ink-200 text-ink-800" : "bg-brand-600 text-white")} style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials(name)}
    </span>
  );
}

/** The school's logo, or its initials on a deep sky tile when no logo is set in the ERP. */
export function SchoolMark({ name, url, size = 34 }: { name: string; url?: string | null; size?: number }) {
  const r = Math.round(size * 0.29);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="shrink-0 bg-white object-contain" style={{ width: size, height: size, borderRadius: r }} />
  ) : (
    <span className="grid shrink-0 place-items-center bg-brand-700 font-bold tracking-wide text-white" style={{ width: size, height: size, borderRadius: r, fontSize: size * 0.36, fontFamily: "Georgia, 'Noto Serif', serif" }}>
      {name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

/** A thin line under the top bar when the screen shows the saved copy because the network failed. */
export function OfflineNote({ show }: { show: boolean }) {
  const { t } = useT();
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-marigold-300/70 bg-marigold-50 px-3 py-2 text-xs font-medium text-ink-700">
      <WifiOff className="h-4 w-4 shrink-0 text-marigold-600" aria-hidden />
      {t("common.offline")}
    </div>
  );
}

export function ErrorCard({ offline, onRetry }: { offline?: boolean; onRetry: () => void }) {
  const { t } = useT();
  return (
    <div className="card flex flex-col items-start gap-3 p-5">
      <p className="text-ink-700">{offline ? t("common.offlineNoData") : t("common.error")}</p>
      <button className="btn-quiet" onClick={onRetry}>
        <RotateCw className="h-4 w-4" aria-hidden /> {t("common.retry")}
      </button>
    </div>
  );
}

export function CallOffice({ phone, className }: { phone?: string; className?: string }) {
  const { t } = useT();
  if (!phone) return null;
  return (
    <a href={`tel:${phone.replace(/\s/g, "")}`} className={clsx("btn-quiet", className)}>
      <Phone className="h-4 w-4" aria-hidden /> {t("common.call")}
    </a>
  );
}
