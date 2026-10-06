"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "hi" | "en";

/** Hindi first. Short, plain words a parent would say; English for those who prefer it. */
const TEXT = {
  // tabs
  "tab.home": { hi: "होम", en: "Home" },
  "tab.fees": { hi: "फ़ीस", en: "Fees" },
  "tab.study": { hi: "पढ़ाई", en: "Study" },
  "tab.attendance": { hi: "हाज़िरी", en: "Attendance" },
  "tab.more": { hi: "और", en: "More" },

  // sign-in
  "login.title": { hi: "अभिभावक लॉगिन", en: "Parent sign-in" },
  "login.mobile": { hi: "मोबाइल नंबर", en: "Mobile number" },
  "login.mobileHelp": { hi: "वही नंबर डालें जो स्कूल में बच्चे के रिकॉर्ड में दर्ज है।", en: "Use the number the school has on your child's record." },
  "login.send": { hi: "WhatsApp पर कोड भेजें", en: "Send code on WhatsApp" },
  "login.code": { hi: "6 अंकों का कोड", en: "6-digit code" },
  "login.sentTo": { hi: "कोड WhatsApp पर भेजा गया", en: "Code sent on WhatsApp to" },
  "login.change": { hi: "नंबर बदलें", en: "Change number" },
  "login.verify": { hi: "लॉगिन करें", en: "Sign in" },
  "login.resendIn": { hi: "दोबारा भेजें", en: "Resend in" },
  "login.resend": { hi: "कोड दोबारा भेजें", en: "Resend code" },
  "login.noCode": { hi: "कोड नहीं आया? हो सकता है यह नंबर स्कूल में दर्ज न हो। ऑफ़िस से पूछें:", en: "No code? This number may not be on the school's record. Ask the office:" },
  "login.help": { hi: "मदद चाहिए? स्कूल ऑफ़िस:", en: "Need help? School office:" },
  "login.badMobile": { hi: "10 अंकों का मोबाइल नंबर डालें।", en: "Enter your 10-digit mobile number." },
  "login.badCode": { hi: "पूरा 6 अंकों का कोड डालें।", en: "Enter the full 6-digit code." },

  // common
  "common.offline": { hi: "इंटरनेट नहीं है। पुरानी जानकारी दिख रही है।", en: "No internet. Showing saved information." },
  "common.offlineNoData": { hi: "इंटरनेट नहीं है। कनेक्शन आने पर दोबारा कोशिश करें।", en: "No internet. Try again when you are connected." },
  "common.error": { hi: "कुछ गड़बड़ हुई। दोबारा कोशिश करें।", en: "Something went wrong. Please try again." },
  "common.retry": { hi: "दोबारा कोशिश करें", en: "Try again" },
  "common.roll": { hi: "रोल", en: "Roll" },
  "common.seeAll": { hi: "सब देखें", en: "See all" },
  "common.soon": { hi: "जल्द आ रहा है", en: "Coming soon" },
  "common.soonText": { hi: "यह हिस्सा अभी बन रहा है। तब तक स्कूल ऑफ़िस से पूछें।", en: "This part is being built. Until then, please ask the school office." },
  "common.call": { hi: "ऑफ़िस को कॉल करें", en: "Call the office" },

  // home
  "home.attendance": { hi: "आज की हाज़िरी", en: "Today's attendance" },
  "home.notMarked": { hi: "अभी नहीं लगी", en: "Not marked yet" },
  "home.holiday": { hi: "आज छुट्टी है", en: "School holiday" },
  "home.month": { hi: "पूरा महीना", en: "Whole month" },
  "home.fees": { hi: "फ़ीस", en: "Fees" },
  "home.due": { hi: "अभी जमा करनी है", en: "Due now" },
  "home.fine": { hi: "लेट फ़ाइन", en: "Late fine" },
  "home.payNow": { hi: "फ़ीस भरें", en: "Pay fees" },
  "home.allPaid": { hi: "अभी कोई फ़ीस बाकी नहीं", en: "Nothing due right now" },
  "home.next": { hi: "अगली किस्त", en: "Next instalment" },
  "home.feesUnavailable": { hi: "फ़ीस की जानकारी अभी नहीं मिल रही।", en: "Fee details are not available right now." },
  "home.homework": { hi: "होमवर्क", en: "Homework" },
  "home.noHomework": { hi: "आज कोई होमवर्क नहीं दिया गया।", en: "No homework given today." },
  "home.dueBy": { hi: "जमा करें", en: "Due" },
  "home.notice": { hi: "स्कूल का संदेश", en: "From the school" },
  "home.noNotice": { hi: "अभी कोई नया संदेश नहीं।", en: "No new messages." },

  // attendance statuses
  "att.Present": { hi: "उपस्थित", en: "Present" },
  "att.Absent": { hi: "अनुपस्थित", en: "Absent" },
  "att.Leave": { hi: "छुट्टी पर", en: "On leave" },
  "att.HalfDay": { hi: "आधा दिन", en: "Half day" },

  "att.thisMonth": { hi: "इस महीने की हाज़िरी", en: "This month" },
  "att.session": { hi: "सत्र में अब तक", en: "Session so far" },
  "att.days": { hi: "दिन", en: "days" },
  "att.noneMarked": { hi: "इस महीने अभी हाज़िरी नहीं लगी।", en: "No attendance marked this month yet." },
  "att.prev": { hi: "पिछला महीना", en: "Previous month" },
  "att.next": { hi: "अगला महीना", en: "Next month" },
  "att.holidays": { hi: "छुट्टियाँ", en: "Holidays" },
  "att.sunday": { hi: "रविवार", en: "Sunday" },
  "att.note": { hi: "प्रतिशत उन्हीं दिनों से निकलता है जिन दिन हाज़िरी लगी। आधा दिन = ½।", en: "Percent counts only the days attendance was taken. Half day = ½." },

  // more
  "more.language": { hi: "भाषा", en: "Language" },
  "more.logout": { hi: "लॉग आउट", en: "Sign out" },
  "more.children": { hi: "आपके बच्चे", en: "Your children" },
} as const;

export type TextKey = keyof typeof TEXT;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TextKey) => string }>({
  lang: "hi",
  setLang: () => {},
  t: (k) => TEXT[k].hi,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");
  useEffect(() => {
    try {
      if (localStorage.getItem("pa:lang") === "en") setLangState("en");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pa:lang", l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback((k: TextKey) => TEXT[k][lang], [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

/** Text kept next to its own feature: `const L = useL(); L({ hi: "…", en: "…" })`. */
export type Bi = { hi: string; en: string };
export function useL() {
  const { lang } = useContext(Ctx);
  return useCallback((b: Bi) => b[lang], [lang]);
}
