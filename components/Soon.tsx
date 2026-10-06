"use client";

import { Hammer } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useParent } from "@/lib/parent";
import { CallOffice } from "./ui";

/** A tab that is not built yet: says so plainly and offers the office number. */
export function Soon() {
  const { t } = useT();
  const { me } = useParent();
  return (
    <div className="card animate-rise space-y-3 p-5">
      <Hammer className="h-6 w-6 text-ink-400" aria-hidden />
      <h1 className="text-lg font-bold">{t("common.soon")}</h1>
      <p className="text-ink-600">{t("common.soonText")}</p>
      <CallOffice phone={me?.school.officePhone} />
    </div>
  );
}
