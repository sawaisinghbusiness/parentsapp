"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, Phone } from "lucide-react";
import { api, ApiError, clearCache } from "@/lib/api";
import { useL, useT } from "@/lib/i18n";
import { phoneText } from "@/lib/format";
import { DEMO, DEMO_CODE } from "@/lib/demo";
import { SchoolMark } from "@/components/ui";

interface PublicSchool {
  name: string;
  shortName: string;
  logoUrl: string | null;
  officePhone: string;
}

const RESEND_SECONDS = 30;

export default function LoginPage() {
  const { t, lang, setLang } = useT();
  const L = useL();
  const [school, setSchool] = useState<PublicSchool | null>(null);
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<PublicSchool>("/school").then(setSchool).catch(() => null);
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const fail = (e: unknown) => {
    const err = e instanceof ApiError ? e : new ApiError(0, "");
    setError(err.status === 0 ? t("common.offlineNoData") : err.message || t("common.error"));
    setShake((n) => n + 1);
  };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const digits = mobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError(t("login.badMobile"));
      setShake((n) => n + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/otp", { body: { mobile: digits } });
      setMobile(digits);
      setCode("");
      setStep("code");
      setWait(RESEND_SECONDS);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== 6) {
      setError(t("login.badCode"));
      setShake((n) => n + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/verify", { body: { mobile, code: value } });
      clearCache();
      window.location.replace("/");
    } catch (err) {
      fail(err);
      setCode("");
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-white px-5 pb-6">
      <div className="flex justify-end pt-3">
        <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-brand-700">
          {lang === "hi" ? "English" : "हिंदी"}
        </button>
      </div>

      <div className="flex flex-col items-center pb-6 pt-6 text-center">
        {school ? <SchoolMark name={school.name} url={school.logoUrl} size={72} /> : <div className="h-[72px] w-[72px] rounded-[21px] bg-ink-100" aria-hidden />}
        <p className="mt-4 text-[20px] font-semibold text-ink-900">{school?.name || " "}</p>
        <p className="mt-0.5 text-ink-500">{L({ hi: "अभिभावक ऐप", en: "Parent app" })}</p>
      </div>

      <div key={shake} className={clsx("pt-2", shake > 0 && "animate-shake")}>
        {step === "mobile" ? (
          <form onSubmit={sendCode} noValidate>
            <label htmlFor="mobile" className="mb-2 block font-semibold text-ink-800">
              {t("login.mobile")}
            </label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-ink-300 bg-white focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
              <span className="flex items-center pl-4 pr-1 font-medium text-ink-500">+91</span>
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d ]/g, ""))}
                className="tnum min-h-[54px] w-full px-2 text-lg font-semibold tracking-wide text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
                placeholder="98765 43210"
                autoFocus
              />
            </div>
            <p className="mt-2 text-sm text-ink-500">{DEMO ? L({ hi: "डेमो: कोई भी 10 अंकों का मोबाइल नंबर डालें।", en: "Demo: enter any 10-digit mobile number." }) : t("login.mobileHelp")}</p>
            {error && <p className="mt-3 font-medium text-rose-700" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
              {busy ? "…" : t("login.send")}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
            noValidate
          >
            <button type="button" onClick={() => { setStep("mobile"); setError(""); }} className="-ml-1 mb-2 flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand-700">
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t("login.change")}
            </button>
            {DEMO ? (
              <p className="text-ink-600">
                {L({ hi: "डेमो कोड:", en: "Demo code:" })} <span className="tnum text-lg font-bold tracking-widest text-ink-900">{DEMO_CODE}</span>
              </p>
            ) : (
              <p className="text-ink-600">
                {t("login.sentTo")} <span className="tnum font-semibold text-ink-900">+91 {phoneText(mobile)}</span>
              </p>
            )}
            <label htmlFor="code" className="mb-2 mt-4 block font-semibold text-ink-800">
              {t("login.code")}
            </label>
            <input
              ref={codeRef}
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                if (v.length === 6 && !busy) verify(v);
              }}
              className="field tnum text-center text-[28px] font-bold tracking-[0.5em] placeholder:tracking-[0.5em]"
              placeholder="······"
            />
            {error && <p className="mt-3 font-medium text-rose-700" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
              {busy ? "…" : t("login.verify")}
            </button>
            <div className="mt-3 text-center">
              {wait > 0 ? (
                <p className="tnum min-h-[44px] pt-3 text-sm text-ink-500">
                  {t("login.resendIn")} 0:{String(wait).padStart(2, "0")}
                </p>
              ) : (
                <button type="button" onClick={() => sendCode()} disabled={busy} className="link text-sm">
                  {t("login.resend")}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {school?.officePhone && (
        <div className="mt-auto pt-8 text-center text-sm text-ink-500">
          <p>{step === "code" ? t("login.noCode") : t("login.help")}</p>
          <a href={`tel:${school.officePhone.replace(/\s/g, "")}`} className="link justify-center">
            <Phone className="h-4 w-4" aria-hidden /> {school.officePhone}
          </a>
        </div>
      )}
    </main>
  );
}
