"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./bus-disclosure.css";
export function BusDisclosure({title,children}:{title:string;children:React.ReactNode}){
 const [open,setOpen]=useState(false);const id=useId();const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(content.current)content.current.inert=!open},[open]);
 return <section className="bus-disclosure"><button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(x=>!x)}><span>{title}</span><ChevronDown size={19} aria-hidden className={open?"is-open":""}/></button><div className="bus-disclosure-grid" data-open={open} aria-hidden={!open}><div ref={content} id={id}><div className="bus-disclosure-content">{children}</div></div></div></section>;
}
