"use client";
import Link from "next/link";
import { BusFront, ChevronRight } from "lucide-react";
import { isBusLocationFresh } from "@/lib/bus";
import { useLiveBus } from "./LiveBus";
import { useL } from "@/lib/i18n";

/** A child-scoped glance on Home; route details remain on the transport page. */
export function BusHomeStatus({studentId,name}:{studentId:string;name:string}) {
  const live=useLiveBus(studentId);const L=useL();const first=name.split(" ")[0];
  const quiet=!live||!isBusLocationFresh(live);
  const title=!live?L({hi:"बस की स्थिति देख रहे हैं",en:"Checking bus status"}):live.unavailable?L({hi:"बस की ताज़ा स्थिति नहीं मिली",en:"Bus status unavailable"}):live.absent?L({hi:"आज बच्चे का पिकअप नहीं है",en:"No pickup expected today"}):!live.running?L({hi:"अभी कोई ट्रिप नहीं चल रही",en:"No bus trip running"}):live.child.done?(live.kind==="morning"?L({hi:`${first} बस में है`,en:`${first} is on the bus`}):L({hi:`${first} उतर गया`,en:`${first} has been dropped off`})):live.delay?L({hi:`बस ${live.delay.minutes>=30?"30+":live.delay.minutes} मिनट देर से है`,en:`Bus delayed by ${live.delay.minutes>=30?"30+":live.delay.minutes} min`}):L({hi:"बस की ट्रिप जारी है",en:"Bus trip in progress"});
  const sub=live?.demo?L({hi:"डेमो · नमूना ट्रिप",en:"Demo · sample trip"}):live?.running&&quiet?L({hi:"नई लोकेशन का इंतज़ार · ट्रांसपोर्ट खोलें",en:"Waiting for a fresh location · open transport"}):live?.myStop||L({hi:"रूट और बस स्टाफ़ देखें",en:"View route and bus crew"});
  return <Link href="/bus/" className="flex min-h-[76px] items-center gap-3 border-y border-[#DCE4ED] py-3" aria-label={`${title}. ${sub}`}><BusFront className="h-5 w-5 shrink-0 text-[#3C5749]" aria-hidden/><span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold leading-5 text-[#242628]">{title}</strong><span className="mt-1 block text-[12px] leading-5 text-[#666A6E]">{sub}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[#666A6E]" aria-hidden/></Link>;
}
