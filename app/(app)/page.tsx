"use client";
import "./reference-home.css";
import "@fontsource-variable/plus-jakarta-sans";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useParent} from "@/lib/parent";
import {useApi} from "@/lib/api";
import {useMenu} from "@/lib/menu";
import {ChildSheet} from "@/components/ChildSheet";
interface HomeData { month: {percent:number|null;present:number;absent?:number}; noticeCount?:number; attendance?:{status:string|null;holiday:string|null}; fees?:{dueNow:number;fine:number}|null; homework?:{id:string}[];result?:{exam:string}|null; }
export default function HomePage(){
const {me,child}=useParent();const {data,error,reload}=useApi<HomeData>(child ? `/home?student=${child.id}`:null);const {openMenu}=useMenu();const router=useRouter();const [switching,setSwitching]=useState(false);const [hour,setHour]=useState(12);useEffect(()=>setHour(new Date().getHours()),[]);const greet=hour<12?"Good Morning,":hour<17?"Good Afternoon,":"Good Evening,";const first=child?.name.split(" ")[0]||"";const town=me?.school.address?.split(",").pop()?.trim()||"";const many=(me?.children.length||0)>1;const month=data?.month;const percent=month?.percent==null?"\u2014":Math.round(month.percent)+"%";const due=(data?.fees?.dueNow||0)+(data?.fees?.fine||0);const fees=data?.fees?new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(due):"\u2014";
return <div className="reference-home min-h-screen bg-[#F8F9FB] pb-6" style={{fontFamily:"'Plus Jakarta Sans Variable',system-ui,sans-serif"}}>
{error && <button onClick={reload} className="m-5 rounded-xl bg-white p-3">Couldn't load details. Retry</button>}
<div id="view-home" className="tab-view block">
<header className="bg-gradient-to-b from-[#E2DCFA] via-[#F5F3FE] to-[#F8F9FB] pt-5 pb-3 px-5">
<div className="flex items-center justify-between">
<div className="flex items-center space-x-3">
<div className="w-11 h-11 rounded-full bg-white shadow-pill-btn border border-[#E2DCFA] flex items-center justify-center shrink-0 p-1">
{me?.school.logoUrl ? <img src={me.school.logoUrl} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="text-[13px] font-semibold text-[#6C5CE7]">{(me?.school.name || "").split(" ").map(n=>n[0]).slice(0,2).join("")}</span>}
</div>
<div className="relative">
<h1 className="text-[16px] font-bold tracking-tight text-[#18181B] leading-tight">{me?.school.name || ""}</h1>
<button onClick={openMenu} id="branch-selector-btn" type="button" className="flex items-center space-x-1 text-[12.5px] font-semibold text-[#6C5CE7] hover:text-[#5E4AE3] mt-0.5 focus:outline-none">
<span id="current-branch-name">{town}</span>
<svg id="branch-chevron" className="w-3.5 h-3.5 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7">
</path>
</svg>
</button>
</div>
</div>
<div className="flex items-center space-x-2.5">
<button onClick={() => router.push("/notice/")} id="notif-btn" type="button" aria-label="Notifications" className="relative w-[42px] h-[42px] rounded-full bg-white shadow-pill-btn border border-white flex items-center justify-center text-[#18181B] hover:bg-[#F5F3FE] active:scale-95 transition">
<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0">
</path>
</svg>
<span id="notif-dot" className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#6C5CE7] ring-2 ring-white" style={{display: (data?.noticeCount ?? 0) > 0 ? undefined : "none"}}>
</span>
</button>
<button onClick={() => router.push("/calendar/")} type="button" aria-label="Quick Calendar" className="w-[42px] h-[42px] rounded-full bg-white shadow-pill-btn border border-white flex items-center justify-center text-[#18181B] hover:bg-[#F5F3FE] active:scale-95 transition">
<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
<rect x="3" y="4" width="18" height="17" rx="3" ry="3">
</rect>
<path strokeLinecap="round" d="M8 2v4M16 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01">
</path>
</svg>
</button>
</div>
</div>
<div className="mt-6">
<p className="text-[22px] font-normal text-[#27272A] leading-snug tracking-tight">{greet}</p>
<h2 id="greeting-name" className="text-[28px] font-extrabold text-[#18181B] leading-tight tracking-tight">{first}</h2>
</div>
<div className="mt-5 flex items-center space-x-2.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Dashboard Categories">
<button type="button" data-pill="overview" className="cat-pill shrink-0 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-[#6C5CE7] text-white shadow-violet-glow transition">{"Overview"}</button>
<button onClick={() => router.push("/homework/")} type="button" data-pill="homework" className="cat-pill shrink-0 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-white text-[#18181B] shadow-pill-btn hover:bg-[#EFEAFE] transition">{"Homework"}</button>
<button onClick={() => router.push("/fees/")} type="button" data-pill="fees" className="cat-pill shrink-0 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-white text-[#18181B] shadow-pill-btn hover:bg-[#EFEAFE] transition">{"Fees"}</button>
<button onClick={() => router.push("/exam/?tab=result")} type="button" data-pill="results" className="cat-pill shrink-0 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-white text-[#18181B] shadow-pill-btn hover:bg-[#EFEAFE] transition">{"Results"}</button>
</div>
</header>
<div className="px-5 space-y-5 mt-2">
<button onClick={() => many ? setSwitching(true) : router.push("/profile/")} type="button" className="bg-white rounded-[22px] p-4 shadow-soft-card border border-slate-100/90 flex items-center justify-between active:scale-[0.99] transition cursor-pointer group">
<div className="flex items-center space-x-3.5 min-w-0">
<div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[#EFEAFE] bg-[#E2DCFA] shrink-0">
<StudentPhoto name={child?.name || ""} url={child?.photoUrl || null} />
</div>
<div className="min-w-0">
<div className="flex items-center space-x-2">
<h3 id="student-full-name" className="text-[16px] font-bold text-[#18181B] truncate">{child?.name || ""}</h3>
<span id="student-status-pill" className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFEAFE] text-[#6C5CE7]">{data?.attendance?.status || "Not marked"}</span>
</div>
<p id="student-class-info" className="text-[12.5px] font-medium text-[#71717A] mt-0.5 truncate">{child ? `Class ${child.classSec} • Roll No. ${child.rollNo}` : ""}</p>
</div>
</div>
<div className="w-8 h-8 rounded-full bg-[#F8F9FB] group-hover:bg-[#EFEAFE] text-[#71717A] group-hover:text-[#6C5CE7] flex items-center justify-center shrink-0 transition">
<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7">
</path>
</svg>
</div>
</button>
<div className="grid grid-cols-2 gap-3.5">
<button onClick={() => router.push("/calendar/")} type="button" className="bg-white rounded-[22px] p-4 shadow-soft-card border border-slate-100/80 hover:border-[#E2DCFA] active:scale-[0.98] transition cursor-pointer">

<div className="">
<h4 className="text-[14.5px] font-bold text-[#18181B]">{"Attendance"}</h4>
<p className="text-[11.5px] text-[#71717A] mt-0.5">{"This Month"}</p>
</div>
<div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
<span id="quick-present-label" className="text-[11.5px] font-semibold text-[#71717A]">{month ? `${month.present} Day${month.present === 1 ? "" : "s"} Present` : "—"}</span>
<span id="quick-attendance-pct" className="text-[17px] font-extrabold text-[#6C5CE7]">{percent}</span>
</div>
</button>
<button onClick={() => router.push("/fees/")} type="button" className="bg-white rounded-[22px] p-4 shadow-soft-card border border-slate-100/80 hover:border-[#E2DCFA] active:scale-[0.98] transition cursor-pointer">

<div className="">
<h4 className="text-[14.5px] font-bold text-[#18181B]">{"Fees Due"}</h4>
<p className="text-[11.5px] text-[#71717A] mt-0.5">{"Current Term"}</p>
</div>
<div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
<span className="text-[11.5px] font-semibold text-[#71717A]">{data?.fees ? (due === 0 ? "No Dues" : "Outstanding") : "Not available"}</span>
<span id="quick-fees-due" className="text-[17px] font-extrabold text-[#6C5CE7]">{fees}</span>
</div>
</button>
</div>
<section>
<div className="flex items-center justify-between mb-3">
<h2 className="text-[16.5px] font-bold text-[#18181B]">{"Today at school"}</h2>
<button onClick={() => router.push("/profile/")} type="button" className="text-[12.5px] font-semibold text-[#71717A] hover:text-[#6C5CE7] transition">{"See all"}</button>
</div>
<div className="space-y-2.5">
<button onClick={() => router.push("/profile/")} type="button" className="w-full bg-white rounded-[18px] p-3.5 shadow-soft-card border border-slate-100/80 flex items-center justify-between text-left hover:border-[#E2DCFA] active:scale-[0.99] transition">
<div className="flex items-center space-x-3 min-w-0">
<div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
</path>
</svg>
</div>
<div className="min-w-0">
<p className="text-[14px] font-bold text-[#18181B]">{"Attendance"}</p>
<p className="text-[11.5px] text-[#71717A] truncate">{"Daily Attendance"}</p>
</div>
</div>
<div className="flex items-center space-x-2 shrink-0 ml-2">
<span id="today-attendance-val" className="text-[12.5px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">{data?.attendance?.holiday || data?.attendance?.status || "Not marked"}</span>
<svg className="w-4 h-4 text-[#71717A]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7">
</path>
</svg>
</div>
</button>
<button onClick={() => router.push("/homework/")} type="button" className="w-full bg-white rounded-[18px] p-3.5 shadow-soft-card border border-slate-100/80 flex items-center justify-between text-left hover:border-[#E2DCFA] active:scale-[0.99] transition">
<div className="flex items-center space-x-3 min-w-0">
<div className="w-10 h-10 rounded-full bg-[#EFEAFE] text-[#6C5CE7] flex items-center justify-center shrink-0">
<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25">
</path>
</svg>
</div>
<div className="min-w-0">
<p className="text-[14px] font-bold text-[#18181B]">{"Homework"}</p>
<p className="text-[11.5px] text-[#71717A] truncate">{"Daily Class Diary"}</p>
</div>
</div>
<div className="flex items-center space-x-2 shrink-0 ml-2">
<span id="today-homework-val" className="text-[12.5px] font-semibold text-[#71717A]">{data?.homework ? (data.homework.length ? `${data.homework.length} to view` : "Nothing assigned") : "—"}</span>
<svg className="w-4 h-4 text-[#71717A]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7">
</path>
</svg>
</div>
</button>
<button onClick={() => router.push("/fees/")} type="button" className="w-full bg-white rounded-[18px] p-3.5 shadow-soft-card border border-slate-100/80 flex items-center justify-between text-left hover:border-[#E2DCFA] active:scale-[0.99] transition">
<div className="flex items-center space-x-3 min-w-0">
<div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M7 5h10M7 9.5h10M13.5 5a4.5 4.5 0 010 9H7l7.5 6">
</path>
</svg>
</div>
<div className="min-w-0">
<p className="text-[14px] font-bold text-[#18181B]">{"Fees due now"}</p>
<p className="text-[11.5px] text-[#71717A] truncate">{"Current dues"}</p>
</div>
</div>
<div className="flex items-center space-x-2 shrink-0 ml-2">
<span id="today-fees-val" className="text-[13.5px] font-bold text-[#18181B]">{fees}</span>
<svg className="w-4 h-4 text-[#71717A]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7">
</path>
</svg>
</div>
</button>
<button onClick={() => router.push("/profile/")} type="button" className="w-full bg-white rounded-[18px] p-3.5 shadow-soft-card border border-slate-100/80 flex items-center justify-between text-left hover:border-[#E2DCFA] active:scale-[0.99] transition">
<div className="flex items-center space-x-3 min-w-0">
<div className="w-10 h-10 rounded-full bg-[#EFEAFE] text-[#6C5CE7] flex items-center justify-center shrink-0">
<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m-5.5-9.5a5.5 5.5 0 0011 0V4.5h-11v7z">
</path>
</svg>
</div>
<div className="min-w-0">
<p className="text-[14px] font-bold text-[#18181B]">{"Results"}</p>
<p className="text-[11.5px] text-[#71717A] truncate">{"Latest assessment"}</p>
</div>
</div>
<div className="flex items-center space-x-2 shrink-0 ml-2">
<span id="today-results-val" className="text-[12px] font-bold text-[#6C5CE7] bg-[#EFEAFE] px-2.5 py-1 rounded-full">{data?.result ? `Available · ${data.result.exam}` : "Not published yet"}</span>
<svg className="w-4 h-4 text-[#71717A]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7">
</path>
</svg>
</div>
</button>
</div>
</section>
<section>
<button onClick={() => router.push("/calendar/")} type="button" className="bg-white rounded-[24px] p-5 shadow-soft-card border border-slate-100/90 hover:border-[#E2DCFA] transition cursor-pointer">
<div className="flex items-center justify-between mb-4">
<h2 className="text-[16.5px] font-bold text-[#18181B]">{"Attendance"}</h2>
<span className="text-[12px] font-semibold text-[#6C5CE7] bg-[#EFEAFE] px-3 py-1 rounded-full">{"This Month"}</span>
</div>
<div className="flex items-center justify-between gap-5">
<div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
<svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
<circle cx="50" cy="50" r="40" stroke="#EFEAFE" strokeWidth="11" fill="none">
</circle>
<circle id="attendance-ring-circle" cx="50" cy="50" r="40" stroke="#6C5CE7" strokeWidth="11" strokeLinecap="round" fill="none" strokeDasharray="251.2" strokeDashoffset="0" className="transition-all duration-700 ease-out" style={{strokeDashoffset: 251.2 * (1 - (month?.percent ?? 0) / 100)}}>
</circle>
</svg>
<span id="attendance-percent-text" className="absolute text-[18px] font-extrabold text-[#18181B]">{percent}</span>
</div>
<div className="flex-1 space-y-2.5 pl-1">
<div className="flex items-center justify-between">
<div className="flex items-center space-x-2">
<span className="w-2.5 h-2.5 rounded-full bg-emerald-500">
</span>
<span className="text-[13.5px] font-medium text-[#71717A]">{"Present"}</span>
</div>
<span id="stat-present-count" className="text-[14.5px] font-bold text-[#18181B]">{month?.present ?? "—"}</span>
</div>
<div className="flex items-center justify-between">
<div className="flex items-center space-x-2">
<span className="w-2.5 h-2.5 rounded-full bg-rose-500">
</span>
<span className="text-[13.5px] font-medium text-[#71717A]">{"Absent"}</span>
</div>
<span id="stat-absent-count" className="text-[14.5px] font-bold text-[#18181B]">{month?.absent ?? "—"}</span>
</div>
<div className="flex items-center justify-between">
<div className="flex items-center space-x-2">
<span className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7]">
</span>
<span className="text-[13.5px] font-medium text-[#71717A]">{"Holidays"}</span>
</div>
<span className="text-[14.5px] font-bold text-[#18181B]">{"—"}</span>
</div>
</div>
</div>
</button>
</section>
</div>
</div>{switching && <ChildSheet onClose={()=>setSwitching(false)}/>}</div>;}

function StudentPhoto({name,url}:{name:string;url:string|null}){const [failed,setFailed]=useState<string|null>(null);return url && failed!==url ? <img src={url} alt={name} onError={()=>setFailed(url)} className="w-full h-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#6C5CE7]">{name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span>;}
