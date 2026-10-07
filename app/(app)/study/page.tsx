"use client";

import { useEffect, useState } from "react";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { S } from "@/lib/text/study";
import { Segments } from "@/components/study/Segments";
import { HomeworkList } from "@/components/study/HomeworkList";
import { Timetable } from "@/components/study/Timetable";
import { Skeleton } from "@/components/ui";

type Tab = "homework" | "timetable";

/** पढ़ाई: the child's homework (newest first) and the class timetable. */
export default function StudyPage() {
  const { child } = useParent();
  const L = useL();
  const [tab, setTab] = useState<Tab>("homework");
  // Home's "Timetable" shortcut opens this page on the timetable.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "timetable") setTab("timetable");
  }, []);

  return (
    <div className="animate-rise space-y-3">
      <Segments
        label={L({ hi: "पढ़ाई", en: "Study" })}
        value={tab}
        onChange={setTab}
        options={[
          { key: "homework", text: L(S.homework) },
          { key: "timetable", text: L(S.timetable) },
        ]}
      />
      {!child ? (
        // The family is still loading: hold the space instead of a blank screen.
        <div className="card space-y-3 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : tab === "homework" ? (
        <HomeworkList key={child.id} studentId={child.id} />
      ) : (
        <Timetable key={child.id} studentId={child.id} />
      )}
    </div>
  );
}
