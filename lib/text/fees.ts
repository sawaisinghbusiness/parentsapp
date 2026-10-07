/** Fees tab text. Hindi first, the words a parent would use. */
export const F = {
  dueNow: { hi: "अभी जमा करनी है", en: "Due now" },
  fine: { hi: "लेट फ़ाइन", en: "Late fine" },
  allPaid: { hi: "अभी कोई फ़ीस बाकी नहीं", en: "Nothing due right now" },
  yearFee: { hi: "साल की फ़ीस", en: "Year's fee" },
  paid: { hi: "जमा", en: "Paid" },
  left: { hi: "बाकी", en: "Left" },
  payUpi: { hi: "UPI से फ़ीस भरें", en: "Pay fees by UPI" },
  noOnline: { hi: "ऑनलाइन फ़ीस अभी चालू नहीं है। फ़ीस स्कूल ऑफ़िस में जमा करें।", en: "Online payment is not on yet. Please pay at the school office." },
  notAvailable: { hi: "इस बच्चे की फ़ीस की जानकारी अभी नहीं मिल रही। स्कूल ऑफ़िस से पूछें।", en: "Fee details for this child are not available. Please ask the school office." },

  instalments: { hi: "किस्तें", en: "Instalments" },
  insPaid: { hi: "जमा हो गई", en: "Paid" },
  insOverdue: { hi: "बकाया", en: "Overdue" },
  insPart: { hi: "कुछ जमा", en: "Part paid" },
  insUpcoming: { hi: "आने वाली", en: "Upcoming" },
  dueOn: { hi: "आख़िरी तारीख", en: "Due" },

  receipts: { hi: "रसीदें", en: "Receipts" },
  noReceipts: { hi: "अभी कोई रसीद नहीं।", en: "No receipts yet." },
  share: { hi: "शेयर करें", en: "Share" },
  receiptNo: { hi: "रसीद", en: "Receipt" },

  claims: { hi: "ऑनलाइन भुगतान", en: "Online payments" },
  claimPending: { hi: "स्कूल जाँच कर रहा है", en: "School is checking" },
  claimVerified: { hi: "रसीद बन गई", en: "Receipt made" },
  claimRejected: { hi: "मंज़ूर नहीं हुआ", en: "Not accepted" },

  // pay sheet
  howMuch: { hi: "कितनी फ़ीस भरनी है?", en: "How much do you want to pay?" },
  optDue: { hi: "अभी का बकाया", en: "Due now" },
  optFull: { hi: "पूरे साल की बाकी फ़ीस", en: "Whole year's balance" },
  optOther: { hi: "दूसरी रकम", en: "Another amount" },
  incFine: { hi: "लेट फ़ाइन सहित", en: "incl. late fine" },
  step1: { hi: "1. UPI से पैसे भेजें", en: "1. Send the money by UPI" },
  openApp: { hi: "UPI ऐप में भरें", en: "Pay in UPI app" },
  orCopy: { hi: "ऐप न खुले तो यह UPI ID कॉपी करके अपने ऐप से भेजें:", en: "If no app opens, copy this UPI ID and pay from your app:" },
  copy: { hi: "कॉपी करें", en: "Copy" },
  copied: { hi: "कॉपी हो गया", en: "Copied" },
  step2: { hi: "2. भेजने के बाद UTR नंबर डालें", en: "2. After paying, enter the UTR number" },
  utr: { hi: "UTR / UPI Ref नंबर (12 अंक)", en: "UTR / UPI Ref number (12 digits)" },
  utrHelp: { hi: "पेमेंट ऐप में \"UPI Ref No\" या \"UTR\" लिखा होता है।", en: "Shown as \"UPI Ref No\" or \"UTR\" in your payment app." },
  paidOn: { hi: "किस दिन भेजे", en: "Paid on" },
  amountPaid: { hi: "कितने रुपये भेजे", en: "Amount sent" },
  send: { hi: "स्कूल को भेजें", en: "Send to school" },
  thanks: { hi: "धन्यवाद! स्कूल बैंक से मिलान करके रसीद बनाएगा। रसीद यहीं दिखेगी।", en: "Thank you! The school will match it with the bank and make the receipt. It will show here." },
  close: { hi: "बंद करें", en: "Close" },
  enterAmount: { hi: "रकम डालें", en: "Enter the amount" },
  checkName: { hi: "पैसे भेजने से पहले नाम देख लें:", en: "Before paying, check the name:" },
} as const;

/** Fee heads as parents know them. */
export const HEAD: Record<string, { hi: string; en: string }> = {
  tuition_fee: { hi: "ट्यूशन फ़ीस", en: "Tuition" },
  annual_fee: { hi: "वार्षिक शुल्क", en: "Annual charges" },
  exam_fee: { hi: "परीक्षा शुल्क", en: "Exam fee" },
  computer_fee: { hi: "कंप्यूटर शुल्क", en: "Computer" },
  transport_fee: { hi: "बस शुल्क", en: "Bus" },
  admission_fee: { hi: "प्रवेश शुल्क", en: "Admission" },
  late_fine: { hi: "लेट फ़ाइन", en: "Late fine" },
  concession: { hi: "छूट", en: "Concession" },
};
