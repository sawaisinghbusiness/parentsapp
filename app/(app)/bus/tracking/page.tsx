"use client";
import { BusCrewDetails } from "@/components/BusCrewDetails";
import Link from "next/link";
import { BusFront, ChevronRight, RefreshCw } from "lucide-react";
import { useParent } from "@/lib/parent";
import { useLiveBus } from "@/components/LiveBus";
import { useL } from "@/lib/i18n";
import { LiveSheet } from "../live";
import "../bus-status.css";
import "../bus-overview.css";

export default function BusTrackingPage(){
  const {child}=useParent();const L=useL();const live=useLiveBus(child?.bus?child.id:null);
  if(live?.running&&child)return <div className="bus-tracking-page"><LiveSheet key={`${child.id}:${live.tripId||live.kind}`} live={live} childName={child.name} myTime={live.kind==="morning"?live.stops.find(s=>s.name===live.myStop)?.time||null:null}/><BusCrewDetails/></div>;
  return <section className="bus-tracking-empty"><BusFront size={28} aria-hidden/><h2>{!live&&child?.bus?L({hi:"ट्रिप की स्थिति देख रहे हैं",en:"Checking your trip"}):live?.unavailable?L({hi:"ट्रैकिंग अभी नहीं मिल रही",en:"Tracking is unavailable"}):live?.absent?L({hi:"आज बच्चे का पिकअप नहीं है",en:"No pickup expected today"}):L({hi:"अभी ट्रिप नहीं चल रही",en:"No trip running right now"})}</h2><p>{live?.unavailable?L({hi:"इंटरनेट और बस की जानकारी दोबारा जाँचें। पुराना डेटा लाइव नहीं दिखाया जाएगा।",en:"Check your connection and try again. A previous location will not be presented as live."}):L({hi:"ड्राइवर के ट्रिप शुरू करते ही यहाँ स्थिति दिखेगी।",en:"The trip appears here once the driver starts the run."})}</p>{live?.unavailable&&<button type="button" onClick={()=>document.dispatchEvent(new Event("visibilitychange"))}><RefreshCw size={16}/>{L({hi:"दोबारा जाँचें",en:"Try again"})}</button>}<Link href="/bus/">{L({hi:"बस की जानकारी देखें",en:"Back to bus details"})}<ChevronRight size={17}/></Link></section>;
}
