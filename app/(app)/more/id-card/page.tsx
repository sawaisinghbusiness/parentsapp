"use client";

import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { M } from "@/lib/text/more";
import { ErrorCard, Skeleton } from "@/components/ui";
import { SubHeader } from "@/components/more/parts";
import { IdCard, type IdCardData } from "@/components/more/IdCard";

export default function IdCardPage() {
  const { child } = useParent();
  const L = useL();
  const { data, error, reload } = useApi<IdCardData>(child ? `/id-card?student=${child.id}` : null);

  return (
    <div className="animate-rise space-y-3">
      <SubHeader title={L(M.idCard)} />
      {data ? (
        <>
          <IdCard data={data} />
          <p className="px-2 text-sm text-ink-500">{L(M.idNote)}</p>
        </>
      ) : error && error.status !== 401 ? (
        <ErrorCard offline={error.status === 0} onRetry={reload} />
      ) : (
        <Skeleton className="mx-auto h-[560px] w-full max-w-[360px] rounded-2xl" />
      )}
    </div>
  );
}
