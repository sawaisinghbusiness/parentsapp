"use client";
import { notFound } from "next/navigation";

import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { M } from "@/lib/text/more";
import { ErrorCard, Skeleton } from "@/components/ui";
import { SUPPORT } from "@/components/kit";
import type { IdCardData } from "@/components/more/IdCard";
import { IdCardPreview } from "./IdCardPreview";
import "@/components/study.css";

/**
 * Preview: the ID card screen. Same request and states as /id-card/ (card, error with retry, skeleton).
 * The card is redrawn as printed card stock (see IdCardPreview); the screen gives it room, a real
 * "Show back / Show front" control under it, and the official-card note.
 */
export default function IdCardPreviewPage() {
  if(process.env.NODE_ENV === "production")notFound();
  const { child } = useParent();
  const L = useL();
  const { data, error, reload } = useApi<IdCardData>(child ? `/id-card?student=${child.id}` : null);

  return (
    <div className="study space-y-6 pb-4 pt-3">
      {data ? (
        <>
          <div className="study-in">
            <IdCardPreview data={data} />
          </div>
          <p className={`${SUPPORT} px-1 text-center`}>{L(M.idNote)}</p>
        </>
      ) : error && error.status !== 401 ? (
        <ErrorCard offline={error.status === 0} onRetry={reload} />
      ) : (
        <Skeleton className="mx-auto h-[460px] w-full max-w-[290px] rounded-2xl" />
      )}
    </div>
  );
}
