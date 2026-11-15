"use client";
import { Phone } from "lucide-react";
import { useApi } from "@/lib/api";
import { useParent } from "@/lib/parent";
import { useL } from "@/lib/i18n";
import { BusDisclosure } from "./BusDisclosure";
export function BusCrewDetails(){
 const {child}=useParent();const L=useL();const {data,error,reload}=useApi<{route?:{vehicleNo:string|null;driverName:string|null;driverPhone:string|null;conductorName:string|null;conductorPhone:string|null}|null}>(child?`/bus?student=${child.id}`:null);
 const route=data?.route;
 return <BusDisclosure title={L({hi:"बस और स्टाफ़ की जानकारी",en:"Bus and crew details"})}>{!data?error?<div role="alert"><p>{L({hi:"जानकारी नहीं मिली",en:"Could not load crew details"})}</p><button type="button" onClick={reload}>{L({hi:"दोबारा जाँचें",en:"Try again"})}</button></div>:<p>{L({hi:"लोड हो रहा है…",en:"Loading details…"})}</p>:<dl className="bus-crew-fields">{route?.vehicleNo&&<div><dt>{L({hi:"बस नंबर",en:"Vehicle"})}</dt><dd>{route.vehicleNo}</dd></div>}{[{name:route?.driverName,phone:route?.driverPhone,label:L({hi:"ड्राइवर",en:"Driver"})},{name:route?.conductorName,phone:route?.conductorPhone,label:L({hi:"कंडक्टर",en:"Conductor"})}].filter(p=>p.name||p.phone).map(person=><div key={person.label}><dt>{person.label}</dt><dd>{person.name||person.phone}{person.phone&&<a href={`tel:${person.phone}`} aria-label={`${L({hi:"कॉल करें",en:"Call"})} ${person.label}`}><Phone size={17} aria-hidden/></a>}</dd></div>)}{!route&&<p>{L({hi:"बस स्टाफ़ अभी नहीं जुड़ा",en:"Bus crew has not been assigned yet."})}</p>}</dl>}</BusDisclosure>;
}
