import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  Component,
  Suspense,
  useTransition,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { ReactNode } from "react";

// ==========================================
// 1. CONFIG & ENVIRONMENT MANAGEMENT
// ==========================================
const ENV_MODE = "production";
const CONFIG = {
  isProd: ENV_MODE === "production",
  apiBaseUrl:
    ENV_MODE === "production"
      ? "https://api.sahayaksetu.gov.in/v1"
      : "http://localhost:8080/v1",
  defaultLang: "en" as const,
  defaultTheme: "light" as const,
};

// ==========================================
// 1.5. SECURITY UTILITIES
// ==========================================
export const sanitizeInput = (input: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  const reg = /[&<>"'/]/gi;
  return input.replace(reg, (match) => map[match]);
};

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function useDynamicSEO(
  title: string,
  description: string,
  schemaData?: any,
) {
  useEffect(() => {
    document.title = `${title} | Sahayak Setu`;
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? `property="${name}"` : `name="${name}"`;
      let el = document.querySelector(`meta[${attr}]`);
      if (!el) {
        el = document.createElement("meta");
        isProperty
          ? el.setAttribute("property", name)
          : el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    let scriptEl = document.getElementById("seo-json-ld");
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = "seo-json-ld";
      scriptEl.setAttribute("type", "application/ld+json");
      document.head.appendChild(scriptEl);
    }

    const baseSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Sahayak Setu",
          url: "https://sahayaksetu.gov.in",
          description:
            "Step-by-step procedures for Indian government services.",
        },
      ],
    };

    if (schemaData) {
      baseSchema["@graph"].push(schemaData);
    }

    scriptEl.textContent = JSON.stringify(baseSchema);
  }, [title, description, schemaData]);
}

// ==========================================
// 2. TYPE SAFETY (TYPESCRIPT)
// ==========================================
type Language = "en" | "hi" | "bn" | "te" | "mr" | "ta";
type Theme = "light" | "dark";
// Added "wizard" to AppMode for the Smart Eligibility UI
type AppMode = "gateway" | "chat" | "home" | "wizard";

interface LocalizedString {
  en: string;
  hi?: string;
  bn?: string;
  te?: string;
  mr?: string;
  ta?: string;
}

interface ServiceMeta {
  time: LocalizedString;
  cost: LocalizedString;
  docs: LocalizedString;
}

interface GovernmentService {
  id: string;
  name: LocalizedString;
  meta: ServiceMeta;
  steps: Record<Language, string[]>;
  url?: string;
}

// New UserProfile interface for the ML Wizard
interface UserProfile {
  fullName: string;
  dob: string;
  gender: string;
  category: string;
  annualIncome: string;
  aadhaarLast4: string;
}

interface Scheme {
  title: LocalizedString;
  desc: LocalizedString;
  benefit: string;
  url: string;
  // ML Evaluation function for recommendations
  evaluate?: (profile: UserProfile) => { score: number; reason: string };
}

interface Category {
  id: string;
  icon: string;
  name: LocalizedString;
  schemes: Scheme[];
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  isHtml?: boolean;
}

// Utility to calculate age safely
const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

// ==========================================
// 3. MOCK DATABASE (MASSIVELY EXPANDED)
// ==========================================
const MOCK_DB = {
  services: [
    // Identity & Core Documents
    {
      id: "aadhaar_new",
      name: {
        en: "Apply for New Aadhaar",
        hi: "नया आधार कार्ड बनाएं",
        bn: "নতুন আধার কার্ড করুন",
        te: "కొత్త ఆధార్ కార్డ్ చేయండి",
        mr: "नवीन आधार कार्ड काढा",
        ta: "புதிய ஆதார் அட்டையைப் பெறுங்கள்",
      },
      meta: {
        time: {
          en: "60-90 Days",
          hi: "60-90 दिन",
          bn: "৬০-৯০ দিন",
          te: "60-90 రోజులు",
          mr: "६०-९० दिवस",
          ta: "60-90 நாட்கள்",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Identity & Address Proof",
          hi: "पहचान और पता प्रमाण",
          bn: "পরিচয় ও ঠিকানার প্রমাণ",
          te: "గుర్తింపు & చిరునామా రుజువు",
          mr: "ओळख आणि पत्ता पुरावा",
          ta: "அடையாளம் மற்றும் முகவரி சான்று",
        },
      },
      url: "https://uidai.gov.in/",
      steps: {
        en: [
          "Locate your nearest Aadhaar Enrollment Center via UIDAI portal.",
          "Book an appointment online or visit the center directly.",
          "Fill out the Aadhaar Enrollment Form.",
          "Submit demographic and biometric data.",
          "Collect the acknowledgment slip (EID).",
          "Track status online and download e-Aadhaar.",
        ],
        hi: [
          "UIDAI पोर्टल से निकटतम केंद्र खोजें।",
          "अपॉइंटमेंट बुक करें या सीधे केंद्र पर जाएं।",
          "आधार नामांकन फॉर्म भरें।",
          "बायोमेट्रिक डेटा जमा करें।",
          "पावती पर्ची (EID) प्राप्त करें।",
          "ई-आधार डाउनलोड करें।",
        ],
        bn: [
          "নিকটস্থ আধার কেন্দ্র খুঁজুন।",
          "অ্যাপয়েন্টমেন্ট বুক করুন।",
          "ফর্ম পূরণ করুন।",
          "বায়োমেট্রিক ডেটা জমা দিন।",
          "অ্যাকনলেজমেন্ট স্লিপ নিন।",
          "ই-আধার ডাউনলোড করুন।",
        ],
        te: [
          "సమీప ఆధార్ కేంద్రాన్ని కనుగొనండి.",
          "అపాయింట్‌మెంట్ బుక్ చేసుకోండి.",
          "ఫారమ్ నింపండి.",
          "బయోమెట్రిక్ డేటాను సమర్పించండి.",
          "రసీదు తీసుకోండి.",
          "ఇ-ఆధార్ డౌన్‌లోడ్ చేయండి.",
        ],
        mr: [
          "जवळचे आधार केंद्र शोधा.",
          "अपॉइंटमेंट बुक करा.",
          "फॉर्म भरा.",
          "बायोमेट्रिक डेटा सबमिट करा.",
          "पावती गोळा करा.",
          "ई-आधार डाउनलोड करा.",
        ],
        ta: [
          "அருகிலுள்ள மையத்தைக் கண்டறியவும்.",
          "சந்திப்பை முன்பதிவு செய்யவும்.",
          "படிவத்தை நிரப்பவும்.",
          "பயோமெட்ரிக் தரவை சமர்ப்பிக்கவும்.",
          "ஒப்புதல் சீட்டைப் பெறவும்.",
          "இ-ஆதாரை பதிவிறக்கவும்.",
        ],
      },
    },
    {
      id: "pan",
      name: {
        en: "Apply for PAN Card",
        hi: "पैन कार्ड लागू करें",
        bn: "প্যান কার্ডের আবেদন",
        te: "పాన్ కార్డ్ దరఖాస్తు",
        mr: "पॅन कार्ड अर्ज",
        ta: "பான் கார்டு விண்ணப்பம்",
      },
      meta: {
        time: {
          en: "10-15 Days",
          hi: "10-15 दिन",
          bn: "১০-১৫ দিন",
          te: "10-15 రోజులు",
          mr: "१०-१५ दिवस",
          ta: "10-15 நாட்கள்",
        },
        cost: {
          en: "₹107 (Online)",
          hi: "₹107 (ऑनलाइन)",
          bn: "₹১০৭ (অনলাইন)",
          te: "₹107 (ఆన్‌లైన్)",
          mr: "₹१०७ (ऑनलाइन)",
          ta: "₹107 (ஆன்லைன்)",
        },
        docs: {
          en: "Aadhaar, Photo, Sign",
          hi: "आधार, फोटो, हस्ताक्षर",
          bn: "আধার, ছবি, স্বাক্ষর",
          te: "ఆధార్, ఫోటో, సంతకం",
          mr: "आधार, फोटो, स्वाक्षरी",
          ta: "ஆதார், புகைப்படம், கையொப்பம்",
        },
      },
      url: "https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html",
      steps: {
        en: [
          "Visit the official NSDL or UTIITSL web portal.",
          "Select 'New PAN - Indian Citizen (Form 49A)'.",
          "Fill in personal details and upload Aadhaar digitally.",
          "Pay the application fee online using UPI/Card.",
          "Submit and save the 15-digit acknowledgement number.",
          "Physical card is delivered by India Post.",
        ],
        hi: [
          "NSDL या UTIITSL पोर्टल पर जाएं।",
          "फॉर्म 49A चुनें।",
          "आधार और विवरण अपलोड करें।",
          "ऑनलाइन शुल्क का भुगतान करें।",
          "पावती संख्या सहेजें।",
          "भौतिक कार्ड डाक द्वारा प्राप्त करें।",
        ],
        bn: [
          "NSDL বা UTIITSL পোর্টালে যান।",
          "ফর্ম 49A নির্বাচন করুন।",
          "আধার আপলোড করুন।",
          "ফি প্রদান করুন।",
          "ট্র্যাকিং নম্বর সংরক্ষণ করুন।",
          "কার্ড পোস্টের মাধ্যমে বিতরণ করা হয়।",
        ],
        te: [
          "NSDL లేదా UTIITSL పోర్టల్‌ని సందర్శించండి.",
          "ఫారం 49A ఎంచుకోండి.",
          "ఆధార్ అప్‌లోడ్ చేయండి.",
          "ఫీజు చెల్లించండి.",
          "ట్రాకింగ్ నంబర్‌ను సేవ్ చేయండి.",
          "కార్డ్ పోస్ట్ ద్వారా పంపిణీ చేయబడుతుంది.",
        ],
        mr: [
          "NSDL किंवा UTIITSL पोर्टलला भेट द्या.",
          "फॉर्म 49A निवडा.",
          "आधार अपलोड करा.",
          "फी भरा.",
          "ट्रॅकिंग क्रमांक जतन करा.",
          "कार्ड पोस्टाद्वारे वितरित केले जाते.",
        ],
        ta: [
          "NSDL அல்லது UTIITSL போர்ட்டலுக்குச் செல்லவும்.",
          "படிவம் 49A ஐத் தேர்ந்தெடுக்கவும்.",
          "ஆதாரைப் பதிவேற்றவும்.",
          "கட்டணம் செலுத்தவும்.",
          "கண்காணிப்பு எண்ணைச் சேமிக்கவும்.",
          "கார்டு தபால் மூலம் வழங்கப்படும்.",
        ],
      },
    },
    {
      id: "voterid",
      name: {
        en: "Register for Voter ID",
        hi: "वोटर आईडी पंजीकरण",
        bn: "ভোটার আইডির নিবন্ধন",
        te: "ఓటర్ ID నమోదు",
        mr: "मतदार ओळखपत्र नोंदणी",
        ta: "வாக்காளர் அட்டை பதிவு",
      },
      meta: {
        time: {
          en: "1 Month",
          hi: "1 महीना",
          bn: "১ মাস",
          te: "1 నెల",
          mr: "१ महिना",
          ta: "1 மாதம்",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Age & Address Proof",
          hi: "आयु और पता प्रमाण",
          bn: "বয়স এবং ঠিকানা প্রমাণ",
          te: "వయస్సు & చిరునామా రుజువు",
          mr: "वय आणि पत्ता पुरावा",
          ta: "வயது & முகவரி சான்று",
        },
      },
      url: "https://voters.eci.gov.in/",
      steps: {
        en: [
          "Visit the Election Commission portal (voters.eci.gov.in).",
          "Select 'Form 6' for new electoral roll inclusion.",
          "Fill demographic details and upload Age & Address proof.",
          "Submit the application and note the Reference ID.",
          "A Booth Level Officer (BLO) will verify details.",
          "EPIC (Voter ID) is generated and posted to you.",
        ],
        hi: [
          "चुनाव आयोग के पोर्टल पर जाएं।",
          "नए पंजीकरण के लिए 'फॉर्म 6' चुनें।",
          "आयु और पता प्रमाण अपलोड करें।",
          "आवेदन जमा करें और संदर्भ आईडी नोट करें।",
          "BLO विवरण सत्यापित करेगा।",
          "EPIC जनरेट किया जाता है और पोस्ट किया जाता है।",
        ],
        bn: [
          "voters.eci.gov.in পোর্টালে যান।",
          "ফর্ম 6 নির্বাচন করুন।",
          "প্রমাণ আপলোড করুন।",
          "আবেদন জমা দিন।",
          "BLO যাচাইকরণ করবে।",
          "EPIC আপনার ঠিকানায় পোস্ট করা হবে।",
        ],
        te: [
          "voters.eci.gov.in పోర్టల్‌ని సందర్శించండి.",
          "ఫారం 6 ఎంచుకోండి.",
          "రుజువును అప్‌లోడ్ చేయండి.",
          "దరఖాస్తును సమర్పించండి.",
          "BLO ధృవీకరిస్తారు.",
          "EPIC మీ చిరునామాకు పోస్ట్ చేయబడుతుంది.",
        ],
        mr: [
          "voters.eci.gov.in पोर्टलला भेट द्या.",
          "फॉर्म 6 निवडा.",
          "पुरावा अपलोड करा.",
          "अर्ज सबमिट करा.",
          "BLO पडताळणी करेल.",
          "EPIC तुमच्या पत्त्यावर पोस्ट केले जाईल.",
        ],
        ta: [
          "voters.eci.gov.in தளத்திற்குச் செல்லவும்.",
          "படிவம் 6 ஐத் தேர்ந்தெடுக்கவும்.",
          "சான்றைப் பதிவேற்றவும்.",
          "விண்ணப்பத்தை சமர்ப்பிக்கவும்.",
          "BLO சரிபார்க்கும்.",
          "EPIC உங்கள் முகவரிக்கு அனுப்பப்படும்.",
        ],
      },
    },
    {
      id: "passport",
      name: {
        en: "Passport Application",
        hi: "पासपोर्ट आवेदन",
        bn: "পাসপোর্ট আবেদন",
        te: "పాస్‌పోర్ట్ దరఖాస్తు",
        mr: "पासपोर्ट अर्ज",
        ta: "பாஸ்போர்ட் விண்ணப்பம்",
      },
      meta: {
        time: {
          en: "15-30 Days",
          hi: "15-30 दिन",
          bn: "১৫-৩০ দিন",
          te: "15-30 రోజులు",
          mr: "१५-३० दिवस",
          ta: "15-30 நாட்கள்",
        },
        cost: {
          en: "₹1,500",
          hi: "₹1,500",
          bn: "₹১,৫০০",
          te: "₹1,500",
          mr: "₹१,५००",
          ta: "₹1,500",
        },
        docs: {
          en: "Aadhaar, Address Proof",
          hi: "आधार, पता प्रमाण",
          bn: "আধার, ঠিকানা প্রমাণ",
          te: "ఆధార్, చిరునామా రుజువు",
          mr: "आधार, पत्ता पुरावा",
          ta: "ஆதார், முகவரி சான்று",
        },
      },
      url: "https://www.passportindia.gov.in/",
      steps: {
        en: [
          "Register on Passport Seva Online Portal.",
          "Fill 'Apply for Fresh Passport' form.",
          "Pay fee and Schedule Appointment at PSK.",
          "Visit PSK with original documents.",
          "Complete local police verification.",
          "Passport is dispatched via post.",
        ],
        hi: [
          "पासपोर्ट सेवा पोर्टल पर पंजीकरण करें।",
          "फॉर्म भरें और जमा करें।",
          "शुल्क का भुगतान करें और अपॉइंटमेंट लें।",
          "मूल दस्तावेजों के साथ PSK जाएं।",
          "पुलिस सत्यापन पूरा करें।",
          "पासपोर्ट डाक द्वारा भेजा जाता है।",
        ],
        bn: [
          "পাসপোর্ট পোর্টালে নিবন্ধন করুন।",
          "ফর্ম পূরণ করুন।",
          "ফি প্রদান করুন এবং অ্যাপয়েন্টমেন্ট বুক করুন।",
          "PSK তে যান।",
          "পুলিশ যাচাইকরণ সম্পন্ন করুন।",
          "পাসপোর্ট পাঠানো হয়।",
        ],
        te: [
          "పాస్‌పోర్ట్ పోర్టల్‌లో నమోదు చేయండి.",
          "ఫారమ్‌ను నింపండి.",
          "ఫీజు చెల్లించి అపాయింట్‌మెంట్ బుక్ చేయండి.",
          "PSK కి వెళ్లండి.",
          "పోలీస్ ధృవీకరణ పూర్తి చేయండి.",
          "పాస్‌పోర్ట్ పంపబడుతుంది.",
        ],
        mr: [
          "पासपोर्ट पोर्टलवर नोंदणी करा.",
          "फॉर्म भरा.",
          "फी भरा आणि अपॉइंटमेंट बुक करा.",
          "PSK ला भेट द्या.",
          "पोलीस पडताळणी पूर्ण करा.",
          "पासपोर्ट पाठवला जातो.",
        ],
        ta: [
          "பாஸ்போர்ட் இணையதளத்தில் பதிவு செய்யவும்.",
          "படிவத்தை நிரப்பவும்.",
          "கட்டணம் செலுத்தி சந்திப்பை பதிவு செய்யவும்.",
          "PSK-க்குச் செல்லவும்.",
          "காவல்துறை சரிபார்ப்பை முடிக்கவும்.",
          "பாஸ்போர்ட் அனுப்பப்படுகிறது.",
        ],
      },
    },
    // Finance, Tax & Compliance
    {
      id: "itr_filing",
      name: {
        en: "Income Tax Return (ITR)",
        hi: "आयकर रिटर्न (ITR)",
        bn: "আয়কর রিটার্ন (ITR)",
        te: "ఆదాయపు పన్ను రిటర్న్ (ITR)",
        mr: "इन्कम टॅक्स रिटर्न (ITR)",
        ta: "வருமான வரி தாக்கல் (ITR)",
      },
      meta: {
        time: {
          en: "Instant Filing",
          hi: "तत्काल",
          bn: "তাত্ক্ষণিক",
          te: "తక్షణమే",
          mr: "त्वरित",
          ta: "உடனடி",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Form 16, PAN, Aadhaar",
          hi: "फॉर्म 16, पैन, आधार",
          bn: "ফর্ম 16, প্যান, আধার",
          te: "ఫారం 16, పాన్, ఆధార్",
          mr: "फॉर्म 16, पॅन, आधार",
          ta: "படிவம் 16, பான், ஆதார்",
        },
      },
      url: "https://eportal.incometax.gov.in/",
      steps: {
        en: [
          "Log in to the e-Filing portal using PAN.",
          "Navigate to 'e-File' > 'Income Tax Returns'.",
          "Select the Assessment Year and ITR Form (e.g., ITR-1).",
          "Validate pre-filled data using Form 16 and AIS/TIS.",
          "Confirm tax computation and pay any due tax.",
          "e-Verify the return using Aadhaar OTP.",
        ],
        hi: [
          "पैन का उपयोग करके ई-फाइलिंग पोर्टल पर लॉग इन करें।",
          "'ई-फाइल' > 'आयकर रिटर्न' पर जाएं।",
          "आकलन वर्ष और आईटीआर फॉर्म चुनें।",
          "फॉर्म 16 का उपयोग करके डेटा को मान्य करें।",
          "टैक्स की पुष्टि करें और भुगतान करें।",
          "आधार ओटीपी का उपयोग करके ई-सत्यापित करें।",
        ],
        bn: [
          "ই-ফাইলিং পোর্টালে লগ ইন করুন।",
          "রিটার্ন নির্বাচন করুন।",
          "ফর্ম 16 দিয়ে ডেটা যাচাই করুন।",
          "ট্যাক্স নিশ্চিত করুন।",
          "আধার OTP দিয়ে ই-যাচাই করুন।",
          "জমা দিন।",
        ],
        te: [
          "ఇ-ఫైలింగ్ పోర్టల్‌లోకి లాగిన్ అవ్వండి.",
          "రిటర్న్స్ ఎంచుకోండి.",
          "ఫారం 16తో డేటాను ధృవీకరించండి.",
          "పన్ను నిర్ధారించండి.",
          "ఆధార్ OTPతో ఇ-వెరిఫై చేయండి.",
          "సమర్పించండి.",
        ],
        mr: [
          "ई-फायलिंग पोर्टलवर लॉग इन करा.",
          "रिटर्न्स निवडा.",
          "फॉर्म 16 सह डेटा सत्यापित करा.",
          "टॅक्सची पुष्टी करा.",
          "आधार OTP वापरून ई-सत्यापित करा.",
          "सबमिट करा.",
        ],
        ta: [
          "இ-ஃபைலிங் தளத்தில் உள்நுழையவும்.",
          "வருமான வரியைத் தேர்ந்தெடுக்கவும்.",
          "படிவம் 16 மூலம் தரவைச் சரிபார்க்கவும்.",
          "வரியை உறுதிப்படுத்தவும்.",
          "ஆதார் OTP மூலம் மின்-சரிபார்க்கவும்.",
          "சமர்ப்பிக்கவும்.",
        ],
      },
    },
    {
      id: "epf_withdraw",
      name: {
        en: "EPFO Withdrawal",
        hi: "ईपीएफ निकासी",
        bn: "ইপিএফ প্রত্যাহার",
        te: "EPF ఉపసంహరణ",
        mr: "EPF काढणे",
        ta: "EPF திரும்பப் பெறுதல்",
      },
      meta: {
        time: {
          en: "3-7 Days",
          hi: "3-7 दिन",
          bn: "৩-৭ দিন",
          te: "3-7 రోజులు",
          mr: "३-७ दिवस",
          ta: "3-7 நாட்கள்",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "UAN, Bank A/C, Aadhaar",
          hi: "UAN, बैंक खाता, आधार",
          bn: "UAN, ব্যাঙ্ক অ্যাকাউন্ট, আধার",
          te: "UAN, బ్యాంక్ ఖాతా, ఆధార్",
          mr: "UAN, बँक खाते, आधार",
          ta: "UAN, வங்கி கணக்கு, ஆதார்",
        },
      },
      url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
      steps: {
        en: [
          "Ensure UAN is linked with Aadhaar and Bank.",
          "Log in to EPFO Member e-Sewa portal.",
          "Navigate to 'Online Services' > 'Claim'.",
          "Verify bank account number.",
          "Select withdrawal reason and amount.",
          "Authenticate via Aadhaar OTP and submit.",
        ],
        hi: [
          "सुनिश्चित करें कि UAN आधार और बैंक से जुड़ा है।",
          "EPFO पोर्टल पर लॉग इन करें।",
          "'ऑनलाइन सेवा' > 'दावा' पर जाएं।",
          "बैंक खाता सत्यापित करें।",
          "निकासी का कारण चुनें।",
          "आधार OTP से प्रमाणित करें और सबमिट करें।",
        ],
        bn: [
          "UAN লিঙ্ক নিশ্চিত করুন।",
          "EPFO পোর্টালে লগ ইন করুন।",
          "ক্লেইম নির্বাচন করুন।",
          "ব্যাঙ্ক অ্যাকাউন্ট যাচাই করুন।",
          "কারণ নির্বাচন করুন।",
          "OTP দিয়ে সাবমিট করুন।",
        ],
        te: [
          "UAN లింక్‌ను నిర్ధారించుకోండి.",
          "EPFO పోర్టల్‌లోకి లాగిన్ అవ్వండి.",
          "క్లెయిమ్‌ను ఎంచుకోండి.",
          "బ్యాంక్ ఖాతాను ధృవీకరించండి.",
          "కారణం ఎంచుకోండి.",
          "OTP తో సమర్పించండి.",
        ],
        mr: [
          "UAN लिंक असल्याची खात्री करा.",
          "EPFO पोर्टलवर लॉग इन करा.",
          "क्लेम निवडा.",
          "बँक खाते सत्यापित करा.",
          "कारण निवडा.",
          "OTP सह सबमिट करा.",
        ],
        ta: [
          "UAN இணைக்கப்பட்டுள்ளதை உறுதிப்படுத்தவும்.",
          "EPFO தளத்தில் உள்நுழையவும்.",
          "உரிமைகோரலைத் தேர்ந்தெடுக்கவும்.",
          "வங்கி கணக்கை சரிபார்க்கவும்.",
          "காரணத்தைத் தேர்ந்தெடுக்கவும்.",
          "OTP மூலம் சமர்ப்பிக்கவும்.",
        ],
      },
    },
    // Driving, Transport & Travel
    {
      id: "driving_license",
      name: {
        en: "Driving License (New)",
        hi: "ड्राइविंग लाइसेंस (नया)",
        bn: "ড্রাইভিং লাইসেন্স",
        te: "డ్రైవింగ్ లైసెన్స్",
        mr: "ड्रायव्हिंग लायसन्स",
        ta: "ஓட்டுநர் உரிமம்",
      },
      meta: {
        time: {
          en: "30 Days",
          hi: "30 दिन",
          bn: "৩০ দিন",
          te: "30 రోజులు",
          mr: "३० दिवस",
          ta: "30 நாட்கள்",
        },
        cost: {
          en: "₹200 - ₹500",
          hi: "₹200 - ₹500",
          bn: "₹২০০ - ₹৫০০",
          te: "₹200 - ₹500",
          mr: "₹२०० - ₹५००",
          ta: "₹200 - ₹500",
        },
        docs: {
          en: "Learner's DL, ID Proof",
          hi: "लर्नर डीएल, आईडी प्रमाण",
          bn: "লার্নার্স ডিএল, আইডি",
          te: "లెర్నర్స్ DL, ID",
          mr: "लर्निंग डीएल, आयडी",
          ta: "கற்றல் DL, ID",
        },
      },
      url: "https://sarathi.parivahan.gov.in/",
      steps: {
        en: [
          "Visit Parivahan Sewa portal.",
          "Select State and click 'Apply for Driving Licence'.",
          "Enter your Learner's License number.",
          "Fill application and upload documents.",
          "Book a slot for the driving test at RTO.",
          "Pass the test to receive your permanent DL.",
        ],
        hi: [
          "परिवहन सेवा पोर्टल पर जाएं।",
          "'ड्राइविंग लाइसेंस के लिए आवेदन' पर क्लिक करें।",
          "लर्नर लाइसेंस नंबर दर्ज करें।",
          "दस्तावेज अपलोड करें।",
          "RTO में ड्राइविंग टेस्ट के लिए स्लॉट बुक करें।",
          "टेस्ट पास करें और स्थायी डीएल प्राप्त करें।",
        ],
        bn: [
          "পরিবহন পোর্টালে যান।",
          "ড্রাইভিং লাইসেন্সের আবেদন করুন।",
          "লার্নার্স নম্বর দিন।",
          "টেস্ট স্লট বুক করুন।",
          "RTO তে যান।",
          "টেস্ট পাস করুন।",
        ],
        te: [
          "పరివాహన్ పోర్టల్‌కు వెళ్లండి.",
          "డ్రైవింగ్ లైసెన్స్ కోసం దరఖాస్తు చేయండి.",
          "లెర్నర్స్ నంబర్ ఇవ్వండి.",
          "టెస్ట్ స్లాట్ బుక్ చేయండి.",
          "RTO కు వెళ్లండి.",
          "టెస్ట్ పాస్ అవ్వండి.",
        ],
        mr: [
          "परिवहन पोर्टलवर जा.",
          "ड्रायव्हिंग लायसन्ससाठी अर्ज करा.",
          "लर्निंग नंबर द्या.",
          "टेस्ट स्लॉट बुक करा.",
          "RTO ला भेट द्या.",
          "टेस्ट पास करा.",
        ],
        ta: [
          "பரிவாஹன் தளத்திற்குச் செல்லவும்.",
          "உரிமத்திற்கு விண்ணப்பிக்கவும்.",
          "கற்றல் எண்ணை வழங்கவும்.",
          "தேர்வுக்கான நேரத்தை பதிவு செய்யவும்.",
          "RTO செல்லவும்.",
          "தேர்வில் தேர்ச்சி பெறவும்.",
        ],
      },
    },
    {
      id: "vehicle_rc",
      name: {
        en: "Vehicle Registration (RC)",
        hi: "वाहन पंजीकरण (RC)",
        bn: "গাড়ির নিবন্ধন",
        te: "వాహన నమోదు",
        mr: "वाहन नोंदणी",
        ta: "வாகன பதிவு",
      },
      meta: {
        time: {
          en: "7-15 Days",
          hi: "7-15 दिन",
          bn: "৭-১৫ দিন",
          te: "7-15 రోజులు",
          mr: "७-१५ दिवस",
          ta: "7-15 நாட்கள்",
        },
        cost: {
          en: "Varies by State",
          hi: "राज्य अनुसार",
          bn: "রাজ্য অনুযায়ী",
          te: "రాష్ట్రం బట్టి",
          mr: "राज्यानुसार",
          ta: "மாநிலத்தைப் பொறுத்து",
        },
        docs: {
          en: "Invoice, Insurance, ID",
          hi: "चालान, बीमा, आईडी",
          bn: "ইনভয়েস, বিমা, আইডি",
          te: "ఇన్‌వాయిస్, బీమా, ID",
          mr: "इन्व्हॉइस, विमा, आयडी",
          ta: "விலைப்பட்டியல், காப்பீடு, ID",
        },
      },
      url: "https://vahan.parivahan.gov.in/",
      steps: {
        en: [
          "Ensure dealer has initiated registration on Vahan portal.",
          "Pay required road tax and fees online.",
          "RTO verifies the documents and chassis number.",
          "Vehicle number is assigned.",
          "Download digital RC from DigiLocker.",
          "Smart card RC is sent via speed post.",
        ],
        hi: [
          "सुनिश्चित करें कि डीलर ने वाहन पोर्टल पर पंजीकरण शुरू कर दिया है।",
          "ऑनलाइन रोड टैक्स का भुगतान करें।",
          "RTO दस्तावेजों को सत्यापित करता है।",
          "वाहन संख्या आवंटित की जाती है।",
          "डिजिलॉकर से डिजिटल आरसी डाउनलोड करें।",
          "स्मार्ट कार्ड आरसी पोस्ट द्वारा भेजा जाता है।",
        ],
        bn: [
          "ডিলার নিবন্ধন শুরু করেছে কিনা নিশ্চিত করুন।",
          "ট্যাক্স প্রদান করুন।",
          "RTO যাচাই করবে।",
          "নম্বর বরাদ্দ করা হবে।",
          "ডিজিটাল RC ডাউনলোড করুন।",
          "স্মার্ট কার্ড পোস্ট করা হবে।",
        ],
        te: [
          "డీలర్ నమోదు ప్రారంభించారని నిర్ధారించుకోండి.",
          "పన్ను చెల్లించండి.",
          "RTO ధృవీకరిస్తుంది.",
          "నంబర్ కేటాయించబడుతుంది.",
          "డిజిటల్ RC డౌన్‌లోడ్ చేయండి.",
          "స్మార్ట్ కార్డ్ పోస్ట్ చేయబడుతుంది.",
        ],
        mr: [
          "डीलरने नोंदणी सुरू केली असल्याची खात्री करा.",
          "टॅक्स भरा.",
          "RTO पडताळणी करेल.",
          "नंबर वाटप केला जाईल.",
          "डिजिटल RC डाउनलोड करा.",
          "स्मार्ट कार्ड पोस्ट केले जाईल.",
        ],
        ta: [
          "டீலர் பதிவை தொடங்கியுள்ளாரா என்பதை உறுதிப்படுத்தவும்.",
          "வரி செலுத்தவும்.",
          "RTO சரிபார்க்கும்.",
          "எண் ஒதுக்கப்படும்.",
          "டிஜிட்டல் RC ஐப் பதிவிறக்கவும்.",
          "ஸ்மார்ட் கார்டு அனுப்பப்படும்.",
        ],
      },
    },
    // Banking & Financial Access
    {
      id: "bank_account",
      name: {
        en: "Open Bank Account (Jan Dhan)",
        hi: "बैंक खाता खोलें (जन धन)",
        bn: "ব্যাঙ্ক অ্যাকাউন্ট",
        te: "బ్యాంక్ ఖాతా",
        mr: "बँक खाते",
        ta: "வங்கி கணக்கு",
      },
      meta: {
        time: {
          en: "Instant",
          hi: "तत्काल",
          bn: "তাত্ক্ষণিক",
          te: "తక్షణమే",
          mr: "त्वरित",
          ta: "உடனடி",
        },
        cost: {
          en: "Zero Balance",
          hi: "जीरो बैलेंस",
          bn: "শূন্য ব্যালেন্স",
          te: "జీరో బ్యాలెన్స్",
          mr: "झिरो बॅलन्स",
          ta: "ஜீரோ பேலன்ஸ்",
        },
        docs: {
          en: "Aadhaar, PAN",
          hi: "आधार, पैन",
          bn: "আধার, প্যান",
          te: "ఆధార్, పాన్",
          mr: "आधार, पॅन",
          ta: "ஆதார், பான்",
        },
      },
      url: "https://pmjdy.gov.in/",
      steps: {
        en: [
          "Visit any bank branch or Bank Mitra.",
          "Request the PMJDY account opening form.",
          "Fill in the details and provide Aadhaar for e-KYC.",
          "No initial deposit is required.",
          "Collect your RuPay Debit card and passbook.",
          "Ensure mobile number is linked for SMS alerts.",
        ],
        hi: [
          "किसी भी बैंक शाखा या बैंक मित्र पर जाएं।",
          "PMJDY खाता खोलने का फॉर्म मांगें।",
          "ई-केवाईसी के लिए आधार प्रदान करें।",
          "कोई प्रारंभिक जमा आवश्यक नहीं है।",
          "अपना रुपे डेबिट कार्ड और पासबुक लें।",
          "सुनिश्चित करें कि मोबाइल नंबर जुड़ा हुआ है।",
        ],
        bn: [
          "ব্যাঙ্ক বা ব্যাঙ্ক মিত্রের কাছে যান।",
          "ফর্ম পূরণ করুন।",
          "আধার দিয়ে ই-কেওয়াইসি করুন।",
          "RuPay কার্ড সংগ্রহ করুন।",
          "মোবাইল নম্বর লিঙ্ক করুন।",
          "কোন প্রাথমিক জমার প্রয়োজন নেই।",
        ],
        te: [
          "బ్యాంకు లేదా బ్యాంక్ మిత్రను సందర్శించండి.",
          "ఫారమ్ నింపండి.",
          "ఆధార్‌తో ఇ-కైవైసి చేయండి.",
          "RuPay కార్డు తీసుకోండి.",
          "మొబైల్ నంబర్ లింక్ చేయండి.",
          "ప్రారంభ డిపాజిట్ అవసరం లేదు.",
        ],
        mr: [
          "बँक किंवा बँक मित्राला भेट द्या.",
          "फॉर्म भरा.",
          "आधारसह ई-केवायसी करा.",
          "RuPay कार्ड गोळा करा.",
          "मोबाईल नंबर लिंक करा.",
          "कोणत्याही प्रारंभिक ठेव आवश्यक नाही.",
        ],
        ta: [
          "வங்கி அல்லது வங்கி மித்ராவை அணுகவும்.",
          "படிவத்தை நிரப்பவும்.",
          "ஆதார் மூலம் இ-கேஒய்சி செய்யவும்.",
          "RuPay கார்டைப் பெறவும்.",
          "மொபைல் எண்ணை இணைக்கவும்.",
          "ஆரம்ப வைப்பு தேவையில்லை.",
        ],
      },
    },
    // Healthcare & Social Security
    {
      id: "ayushman_card",
      name: {
        en: "Ayushman Bharat Card Apply",
        hi: "आयुष्मान कार्ड आवेदन",
        bn: "আয়ুষ্মান কার্ড",
        te: "ఆయుష్మాన్ కార్డ్",
        mr: "आयुष्मान कार्ड",
        ta: "ஆயுஷ்மான் கார்டு",
      },
      meta: {
        time: {
          en: "Instant Approval",
          hi: "तत्काल",
          bn: "তাত্ক্ষণিক",
          te: "తక్షణమే",
          mr: "त्वरित",
          ta: "உடனடி",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Aadhaar, Ration Card",
          hi: "आधार, राशन कार्ड",
          bn: "আধার, রেশন কার্ড",
          te: "ఆధార్, రేషన్ కార్డ్",
          mr: "आधार, रेशन कार्ड",
          ta: "ஆதார், ரேஷன் அட்டை",
        },
      },
      url: "https://beneficiary.nha.gov.in/",
      steps: {
        en: [
          "Visit the PMJAY Beneficiary Portal.",
          "Login using Mobile Number and OTP.",
          "Search for your name in the eligible list (SECC data).",
          "Complete e-KYC using Aadhaar.",
          "Wait for instant approval from the system.",
          "Download the PMJAY card PDF.",
        ],
        hi: [
          "PMJAY लाभार्थी पोर्टल पर जाएं।",
          "मोबाइल नंबर और OTP का उपयोग करके लॉगिन करें।",
          "पात्र सूची में अपना नाम खोजें।",
          "आधार का उपयोग करके ई-केवाईसी पूरा करें।",
          "तत्काल अनुमोदन की प्रतीक्षा करें।",
          "PMJAY कार्ड पीडीएफ डाउनलोड करें।",
        ],
        bn: [
          "PMJAY পোর্টালে যান।",
          "লগইন করুন।",
          "তালিকা থেকে নাম খুঁজুন।",
          "আধার দিয়ে ই-কেওয়াইসি করুন।",
          "অনুমোদনের জন্য অপেক্ষা করুন।",
          "কার্ড ডাউনলোড করুন।",
        ],
        te: [
          "PMJAY పోర్టల్‌కు వెళ్లండి.",
          "లాగిన్ అవ్వండి.",
          "జాబితాలో పేరును కనుగొనండి.",
          "ఆధార్‌తో ఇ-కైవైసి చేయండి.",
          "ఆమోదం కోసం వేచి ఉండండి.",
          "కార్డును డౌన్‌లోడ్ చేయండి.",
        ],
        mr: [
          "PMJAY पोर्टलवर जा.",
          "लॉगिन करा.",
          "यादीतून नाव शोधा.",
          "आधारसह ई-केवायसी करा.",
          "मंजुरीची प्रतीक्षा करा.",
          "कार्ड डाउनलोड करा.",
        ],
        ta: [
          "PMJAY தளத்திற்குச் செல்லவும்.",
          "உள்நுழையவும்.",
          "பட்டியலில் பெயரைத் தேடவும்.",
          "ஆதார் மூலம் இ-கேஒய்சி செய்யவும்.",
          "ஒப்புதலுக்கு காத்திருக்கவும்.",
          "அட்டையைப் பதிவிறக்கவும்.",
        ],
      },
    },
    // Education & Exams
    {
      id: "scholarship_apply",
      name: {
        en: "Scholarship Application (NSP)",
        hi: "छात्रवृत्ति आवेदन (NSP)",
        bn: "বৃত্তি আবেদন",
        te: "స్కాలర్‌షిప్ దరఖాస్తు",
        mr: "शिष्यवृत्ती अर्ज",
        ta: "உதவித்தொகை விண்ணப்பம்",
      },
      meta: {
        time: {
          en: "15-45 Days",
          hi: "15-45 दिन",
          bn: "১৫-৪৫ দিন",
          te: "15-45 రోజులు",
          mr: "१५-४५ दिवस",
          ta: "15-45 நாட்கள்",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Income Cert, Marks, Bank",
          hi: "आय प्रमाण, अंक, बैंक",
          bn: "আয়, মার্কস, ব্যাঙ্ক",
          te: "ఆదాయం, మార్కులు, బ్యాంక్",
          mr: "उत्पन्न, गुण, बँक",
          ta: "வருமானம், மதிப்பெண்கள், வங்கி",
        },
      },
      url: "https://scholarships.gov.in/",
      steps: {
        en: [
          "Visit the National Scholarship Portal (NSP).",
          "Register as a New Student generating an Application ID.",
          "Login and fill out the detailed application form.",
          "Upload Income, Caste, and Bonafide certificates.",
          "Submit the application for Institute verification.",
          "Track application status till DBT disbursement.",
        ],
        hi: [
          "राष्ट्रीय छात्रवृत्ति पोर्टल (NSP) पर जाएं।",
          "नए छात्र के रूप में पंजीकरण करें।",
          "विस्तृत आवेदन पत्र भरें।",
          "आय, जाति और बोनाफाइड प्रमाण पत्र अपलोड करें।",
          "सत्यापन के लिए आवेदन जमा करें।",
          "DBT संवितरण तक स्थिति ट्रैक करें।",
        ],
        bn: [
          "NSP পোর্টালে যান।",
          "নতুন ছাত্র হিসেবে নিবন্ধন করুন।",
          "ফর্ম পূরণ করুন।",
          "নথিপত্র আপলোড করুন।",
          "যাচাইয়ের জন্য জমা দিন।",
          "স্ট্যাটাস ট্র্যাক করুন।",
        ],
        te: [
          "NSP పోర్టల్‌కు వెళ్లండి.",
          "కొత్త విద్యార్థిగా నమోదు చేయండి.",
          "ఫారమ్ నింపండి.",
          "పత్రాలను అప్‌లోడ్ చేయండి.",
          "ధృవీకరణ కోసం సమర్పించండి.",
          "స్థితిని ట్రాక్ చేయండి.",
        ],
        mr: [
          "NSP पोर्टलवर जा.",
          "नवीन विद्यार्थी म्हणून नोंदणी करा.",
          "फॉर्म भरा.",
          "कागदपत्रे अपलोड करा.",
          "पडताळणीसाठी सबमिट करा.",
          "स्थिती ट्रॅक करा.",
        ],
        ta: [
          "NSP தளத்திற்குச் செல்லவும்.",
          "புதிய மாணவராகப் பதிவு செய்யவும்.",
          "படிவத்தை நிரப்பவும்.",
          "ஆவணங்களைப் பதிவேற்றவும்.",
          "சரிபார்ப்புக்கு சமர்ப்பிக்கவும்.",
          "நிலையைக் கண்காணிக்கவும்.",
        ],
      },
    },
    // Employment & Labour
    {
      id: "mgnrega_card",
      name: {
        en: "MGNREGA Job Card Apply",
        hi: "मनरेगा जॉब कार्ड",
        bn: "মনরেগা জব কার্ড",
        te: "MGNREGA జాబ్ కార్డ్",
        mr: "मनरेगा जॉब कार्ड",
        ta: "MGNREGA வேலை அட்டை",
      },
      meta: {
        time: {
          en: "15 Days",
          hi: "15 दिन",
          bn: "১৫ দিন",
          te: "15 రోజులు",
          mr: "१५ दिवस",
          ta: "15 நாட்கள்",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Aadhaar, Photo, Bank A/C",
          hi: "आधार, फोटो, बैंक खाता",
          bn: "আধার, ছবি, ব্যাঙ্ক",
          te: "ఆధార్, ఫోటో, బ్యాంక్",
          mr: "आधार, फोटो, बँक",
          ta: "ஆதார், புகைப்படம், வங்கி",
        },
      },
      url: "https://nrega.nic.in/",
      steps: {
        en: [
          "Visit your local Gram Panchayat office.",
          "Submit a written or oral request for registration.",
          "Provide Aadhaar and Bank account details of adult members.",
          "Gram Rozgar Sahayak verifies local residence.",
          "Job Card is issued within 15 days.",
          "Demand work and get allocation within 15 days.",
        ],
        hi: [
          "अपने स्थानीय ग्राम पंचायत कार्यालय पर जाएं।",
          "पंजीकरण के लिए अनुरोध जमा करें।",
          "वयस्क सदस्यों का आधार और बैंक विवरण दें।",
          "ग्राम रोजगार सहायक निवास की पुष्टि करता है।",
          "15 दिनों के भीतर जॉब कार्ड जारी किया जाता है।",
          "काम की मांग करें।",
        ],
        bn: [
          "গ্রাম পঞ্চায়েতে যান।",
          "নিবন্ধনের জন্য অনুরোধ করুন।",
          "আধার ও ব্যাঙ্ক বিবরণ দিন।",
          "সহায়ক যাচাই করবে।",
          "জব কার্ড প্রদান করা হবে।",
          "কাজের দাবি করুন।",
        ],
        te: [
          "గ్రామ పంచాయతీకి వెళ్లండి.",
          "నమోదు కోసం అభ్యర్థించండి.",
          "ఆధార్ & బ్యాంక్ వివరాలను ఇవ్వండి.",
          "సహాయక్ ధృవీకరిస్తారు.",
          "జాబ్ కార్డ్ ఇవ్వబడుతుంది.",
          "పని కోసం అడగండి.",
        ],
        mr: [
          "ग्रामपंचायतीला भेट द्या.",
          "नोंदणीसाठी विनंती करा.",
          "आधार आणि बँक तपशील द्या.",
          "सहाय्यक पडताळणी करेल.",
          "जॉब कार्ड दिले जाईल.",
          "कामाची मागणी करा.",
        ],
        ta: [
          "கிராம பஞ்சாயத்திற்குச் செல்லவும்.",
          "பதிவு செய்ய கோரவும்.",
          "ஆதார் மற்றும் வங்கி விவரங்களை வழங்கவும்.",
          "உதவியாளர் சரிபார்ப்பார்.",
          "வேலை அட்டை வழங்கப்படும்.",
          "வேலை கேட்கவும்.",
        ],
      },
    },
    // Business & Startup Services
    {
      id: "udyam_msme",
      name: {
        en: "Udyam (MSME) Registration",
        hi: "उद्यम (MSME) पंजीकरण",
        bn: "এমএসএমই নিবন্ধন",
        te: "MSME నమోదు",
        mr: "MSME नोंदणी",
        ta: "MSME பதிவு",
      },
      meta: {
        time: {
          en: "Instant - 2 Days",
          hi: "तत्काल - 2 दिन",
          bn: "তাত্ক্ষণিক - ২ দিন",
          te: "తక్షణమే - 2 రోజులు",
          mr: "त्वरित - २ दिवस",
          ta: "உடனடி - 2 நாட்கள்",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Aadhaar, PAN, Bank Details",
          hi: "आधार, पैन, बैंक विवरण",
          bn: "আধার, প্যান, ব্যাঙ্ক বিবরণ",
          te: "ఆధార్, పాన్, బ్యాంక్ వివరాలు",
          mr: "आधार, पॅन, बँक तपशील",
          ta: "ஆதார், பான், வங்கி விவரங்கள்",
        },
      },
      url: "https://udyamregistration.gov.in/",
      steps: {
        en: [
          "Visit the official Udyam Registration portal.",
          "Enter your Aadhaar number and validate using OTP.",
          "Provide PAN for automatic verification.",
          "Fill enterprise details and select NIC Codes.",
          "Enter bank and investment details.",
          "Submit with OTP and download the certificate.",
        ],
        hi: [
          "आधिकारिक उद्यम पोर्टल पर जाएं।",
          "आधार नंबर दर्ज करें और OTP मान्य करें।",
          "पैन कार्ड का विवरण प्रदान करें।",
          "उद्यम विवरण और NIC कोड भरें।",
          "बैंक खाता और निवेश विवरण दर्ज करें।",
          "सबमिट करें और प्रमाण पत्र डाउनलोड करें।",
        ],
        bn: [
          "উদ্যম পোর্টালে যান।",
          "আধার ও OTP দিন।",
          "প্যান বিবরণ দিন।",
          "এন্টারপ্রাইজ বিবরণ পূরণ করুন।",
          "ব্যাঙ্ক বিবরণ দিন।",
          "শংসাপত্র ডাউনলোড করুন।",
        ],
        te: [
          "ఉద్యమ్ పోర్టల్‌కు వెళ్లండి.",
          "ఆధార్ & OTP ఇవ్వండి.",
          "పాన్ వివరాలను ఇవ్వండి.",
          "ఎంటర్‌ప్రైజ్ వివరాలను నింపండి.",
          "బ్యాంక్ వివరాలను ఇవ్వండి.",
          "సర్టిఫికెట్ డౌన్‌లోడ్ చేయండి.",
        ],
        mr: [
          "उद्यम पोर्टलवर जा.",
          "आधार आणि OTP द्या.",
          "पॅन तपशील द्या.",
          "एंटरप्राइझ तपशील भरा.",
          "बँक तपशील द्या.",
          "प्रमाणपत्र डाउनलोड करा.",
        ],
        ta: [
          "உத்யோக் தளத்திற்குச் செல்லவும்.",
          "ஆதார் மற்றும் OTP ஐ வழங்கவும்.",
          "பான் விவரங்களை வழங்கவும்.",
          "நிறுவன விவரங்களை நிரப்பவும்.",
          "வங்கி விவரங்களை வழங்கவும்.",
          "சான்றிதழைப் பதிவிறக்கவும்.",
        ],
      },
    },
    // Property & Legal
    {
      id: "land_records",
      name: {
        en: "Check Land Records (Bhulekh)",
        hi: "भूलेख (भूमि रिकॉर्ड) देखें",
        bn: "জমির রেকর্ড",
        te: "భూ రికార్డులు",
        mr: "जमिनीच्या नोंदी (भूलेख)",
        ta: "நில பதிவுகள்",
      },
      meta: {
        time: {
          en: "Instant",
          hi: "तत्काल",
          bn: "তাত্ক্ষণিক",
          te: "తక్షణమే",
          mr: "त्वरित",
          ta: "உடனடி",
        },
        cost: {
          en: "Free",
          hi: "निःशुल्क",
          bn: "বিনামূল্যে",
          te: "ఉచితం",
          mr: "मोफत",
          ta: "இலவசம்",
        },
        docs: {
          en: "Khasra/Khatauni Number",
          hi: "खसरा/खतौनी नंबर",
          bn: "খসরা নম্বর",
          te: "ఖస్రా నంబర్",
          mr: "खसरा नंबर",
          ta: "கஸ்ரா எண்",
        },
      },
      url: "https://dilrmp.gov.in/",
      steps: {
        en: [
          "Visit your state's specific Bhulekh/Land Record portal.",
          "Select your District, Tehsil, and Village.",
          "Search by Khasra/Gata Number or Owner's Name.",
          "View the digitized RoR (Record of Rights).",
          "Download or print the land record copy.",
          "For legally certified copies, pay the nominal fee online.",
        ],
        hi: [
          "अपने राज्य के भूलेख पोर्टल पर जाएं।",
          "अपना जिला, तहसील और गांव चुनें।",
          "खसरा/गाटा संख्या या मालिक के नाम से खोजें।",
          "डिजिटल अधिकार अभिलेख (RoR) देखें।",
          "भूमि रिकॉर्ड की प्रति डाउनलोड या प्रिंट करें।",
          "प्रमाणित प्रतियों के लिए ऑनलाइन शुल्क का भुगतान करें।",
        ],
        bn: [
          "রাজ্যের পোর্টালে যান।",
          "জেলা ও গ্রাম নির্বাচন করুন।",
          "নম্বর দিয়ে খুঁজুন।",
          "রেকর্ড দেখুন।",
          "ডাউনলোড করুন।",
          "ফি প্রদান করে শংসাপত্র নিন।",
        ],
        te: [
          "రాష్ట్ర పోర్టల్‌కు వెళ్లండి.",
          "జిల్లా & గ్రామాన్ని ఎంచుకోండి.",
          "నంబర్‌తో శోధించండి.",
          "రికార్డును చూడండి.",
          "డౌన్‌లోడ్ చేయండి.",
          "ఫీజు చెల్లించి సర్టిఫికెట్ తీసుకోండి.",
        ],
        mr: [
          "राज्याच्या पोर्टलवर जा.",
          "जिल्हा आणि गाव निवडा.",
          "नंबरने शोधा.",
          "रेकॉर्ड पहा.",
          "डाउनलोड करा.",
          "फी भरून प्रमाणपत्र घ्या.",
        ],
        ta: [
          "மாநில தளத்திற்குச் செல்லவும்.",
          "மாவட்டம் & கிராமத்தைத் தேர்ந்தெடுக்கவும்.",
          "எண் மூலம் தேடவும்.",
          "பதிவைக் காணவும்.",
          "பதிவிறக்கவும்.",
          "கட்டணம் செலுத்தி சான்றிதழைப் பெறவும்.",
        ],
      },
    },
    // Utilities & Civic Services
    {
      id: "electricity_bill",
      name: {
        en: "Pay Electricity Bill / New Connection",
        hi: "बिजली बिल / नया कनेक्शन",
        bn: "বিদ্যুৎ বিল",
        te: "విద్యుత్ బిల్లు",
        mr: "वीज बिल",
        ta: "மின் கட்டணம்",
      },
      meta: {
        time: {
          en: "Instant",
          hi: "तत्काल",
          bn: "তাত্ক্ষণিক",
          te: "తక్షణమే",
          mr: "त्वरित",
          ta: "உடனடி",
        },
        cost: {
          en: "Varies",
          hi: "बिल अनुसार",
          bn: "ভিন্ন",
          te: "మారుతుంది",
          mr: "बदलते",
          ta: "மாறுபடும்",
        },
        docs: {
          en: "Consumer Number",
          hi: "उपभोक्ता संख्या",
          bn: "গ্রাহক নম্বর",
          te: "వినియోగదారు సంఖ్య",
          mr: "ग्राहक क्रमांक",
          ta: "நுகர்வோர் எண்",
        },
      },
      url: "https://www.bharatbillpay.com/",
      steps: {
        en: [
          "Open Bharat BillPay or your State Electricity Board portal.",
          "Select your electricity distribution company (DISCOM).",
          "Enter your Consumer Number/Account ID.",
          "Fetch the exact bill amount.",
          "Pay securely via UPI, Netbanking, or Card.",
          "Download the payment receipt immediately.",
        ],
        hi: [
          "भारत बिलपे या अपने राज्य बोर्ड पोर्टल पर जाएं।",
          "अपनी बिजली वितरण कंपनी (DISCOM) चुनें।",
          "अपना उपभोक्ता नंबर दर्ज करें।",
          "बिल राशि प्राप्त करें।",
          "सुरक्षित रूप से भुगतान करें।",
          "भुगतान रसीद डाउनलोड करें।",
        ],
        bn: [
          "বিলপে পোর্টালে যান।",
          "বোর্ড নির্বাচন করুন।",
          "নম্বর দিন।",
          "বিল দেখুন।",
          "পে করুন।",
          "রসিদ ডাউনলোড করুন।",
        ],
        te: [
          "బిల్‌పే పోర్టల్‌కు వెళ్లండి.",
          "బోర్డు ఎంచుకోండి.",
          "నంబర్ ఇవ్వండి.",
          "బిల్లు చూడండి.",
          "పే చేయండి.",
          "రసీదు డౌన్‌లోడ్ చేయండి.",
        ],
        mr: [
          "बिलपे पोर्टलवर जा.",
          "बोर्ड निवडा.",
          "नंबर द्या.",
          "बिल पहा.",
          "पे करा.",
          "पावती डाउनलोड करा.",
        ],
        ta: [
          "பில்பே தளத்திற்குச் செல்லவும்.",
          "வாரியத்தைத் தேர்ந்தெடுக்கவும்.",
          "எண்ணை வழங்கவும்.",
          "பில்லைக் காணவும்.",
          "செலுத்தவும்.",
          "ரசீதைப் பதிவிறக்கவும்.",
        ],
      },
    },
  ] as GovernmentService[],
  categories: [
    {
      id: "agriculture",
      icon: "fa-seedling",
      name: {
        en: "Agriculture & Farmers",
        hi: "कृषि और किसान",
        bn: "কৃষি ও কৃষক",
        te: "వ్యవసాయం & రైతులు",
        mr: "कृषी आणि शेतकरी",
        ta: "விவசாயம் மற்றும் விவசாயிகள்",
      },
      schemes: [
        {
          title: {
            en: "PM-KISAN Samman Nidhi",
            hi: "पीएम-किसान सम्मान निधि",
            bn: "পিএম-কিষাণ সম্মান নিধি",
            te: "పిఎం-కిసాన్ సమ్మాన్ నిధి",
            mr: "पीएम-किसान सन्मान निधी",
            ta: "பிஎம்-கிசான் சம்மான் நிதி",
          },
          desc: {
            en: "Direct income support of ₹6,000 per year transferred securely via DBT to landholding farmer families.",
            hi: "भूमिधारी किसान परिवारों को प्रत्यक्ष आय सहायता।",
            bn: "কৃষক পরিবারগুলিকে বছরে ₹৬,০০০ আর্থিক সহায়তা।",
            te: "రైతులకు సంవత్సరానికి ₹6,000 ఆర్థిక మద్దతు.",
            mr: "शेतकऱ्यांना दरवर्षी ₹६,००० ची आर्थिक मदत.",
            ta: "விவசாயிகளுக்கு ஆண்டுக்கு ₹6,000 நேரடி வருமான ஆதரவு.",
          },
          benefit: "₹6,000 / Year",
          url: "https://pmkisan.gov.in/",
          evaluate: (p: UserProfile) => {
            const inc = parseInt(p.annualIncome.replace(/,/g, "")) || 0;
            if (inc < 500000)
              return {
                score: 95,
                reason:
                  "Income level indicates potential small/marginal farmer status.",
              };
            if (inc < 800000)
              return {
                score: 50,
                reason: "Eligible if you own cultivable land.",
              };
            return {
              score: 10,
              reason: "Income exceeds standard scheme limits.",
            };
          },
        },
        {
          title: {
            en: "Pradhan Mantri Fasal Bima Yojana",
            hi: "प्रधानमंत्री फसल बीमा योजना",
            bn: "প্রধানমন্ত্রী ফসল বিমা যোজনা",
            te: "ప్రధాన మంత్రి ఫసల్ బీమా యోజన",
            mr: "पंतप्रधान पीक विमा योजना",
            ta: "பிரதம மந்திரி பயிர் காப்பீட்டுத் திட்டம்",
          },
          desc: {
            en: "Comprehensive crop insurance policy ensuring financial protection against non-preventable natural risks.",
            hi: "व्यापक फसल बीमा पॉलिसी।",
            bn: "ব্যাপক শস্য বিমা পলিসি।",
            te: "సమగ్ర పంట బీమా విధానం.",
            mr: "सर्वसमावेशक पीक विमा.",
            ta: "விரிவான பயிர் காப்பீட்டு கொள்கை.",
          },
          benefit: "Crop Insurance",
          url: "https://pmfby.gov.in/",
          evaluate: (p: UserProfile) => {
            return {
              score: 80,
              reason: "Universal scheme for all farmers regardless of income.",
            };
          },
        },
        {
          title: {
            en: "Soil Health Card Scheme",
            hi: "मृदा स्वास्थ्य कार्ड",
            bn: "মৃত্তিকা স্বাস্থ্য কার্ড",
            te: "మట్టి ఆరోగ్య కార్డు",
            mr: "मृदा आरोग्य कार्ड",
            ta: "மண் ஆரோக்கிய அட்டை",
          },
          desc: {
            en: "Provides farmers with crop-wise recommendations of appropriate nutrients and fertilizers.",
            hi: "उर्वरकों के उचित उपयोग के लिए सिफारिशें।",
            bn: "সঠিক সারের জন্য সুপারিশ।",
            te: "సరియైన ఎరువుల కోసం సిఫార్సులు.",
            mr: "योग्य खतांसाठी शिफारसी.",
            ta: "சரியான உரங்களுக்கான பரிந்துரைகள்.",
          },
          benefit: "Free Soil Testing",
          url: "https://soilhealth.dac.gov.in/",
          evaluate: () => ({
            score: 90,
            reason: "Applicable for all landholding farmers.",
          }),
        },
        {
          title: {
            en: "Kisan Credit Card (KCC)",
            hi: "किसान क्रेडिट कार्ड",
            bn: "কিষাণ ক্রেডিট কার্ড",
            te: "కిసాన్ క్రెడిట్ కార్డ్",
            mr: "किसान क्रेडिट कार्ड",
            ta: "கிசான் கிரெடிட் கார்டு",
          },
          desc: {
            en: "Credit support to the agricultural sector providing timely and adequate bank credit.",
            hi: "किसानों को समय पर बैंक ऋण सहायता।",
            bn: "কৃষকদের জন্য ব্যাংক ঋণ।",
            te: "రైతులకు బ్యాంకు రుణాలు.",
            mr: "शेतकऱ्यांसाठी बँक कर्ज.",
            ta: "விவசாயிகளுக்கான வங்கி கடன்.",
          },
          benefit: "Low-Interest Loan",
          url: "https://www.myscheme.gov.in/schemes/kcc",
          evaluate: (p: UserProfile) => {
            const inc = parseInt(p.annualIncome.replace(/,/g, "")) || 0;
            return inc < 1000000
              ? {
                  score: 85,
                  reason:
                    "Excellent credit support for low/mid income agriculture.",
                }
              : {
                  score: 40,
                  reason: "Loans available but subject to bank scrutiny.",
                };
          },
        },
      ],
    },
    {
      id: "education",
      icon: "fa-book",
      name: {
        en: "Education & Students",
        hi: "शिक्षा और छात्र",
        bn: "শিক্ষা ও শিক্ষার্থী",
        te: "విద్య & విద్యార్థులు",
        mr: "शिक्षण आणि विद्यार्थी",
        ta: "கல்வி மற்றும் மாணவர்கள்",
      },
      schemes: [
        {
          title: {
            en: "National Scholarship Portal",
            hi: "राष्ट्रीय छात्रवृत्ति पोर्टल",
            bn: "জাতীয় বৃত্তি পোর্টাল",
            te: "జాతీయ స్కాలర్‌షిప్ పోర్టల్",
            mr: "राष्ट्रीय शिष्यवृत्ती पोर्टल",
            ta: "தேசிய உதவித்தொகை போர்டல்",
          },
          desc: {
            en: "Centralized one-stop portal for applying to various scholarships.",
            hi: "छात्रवृत्ति के लिए केंद्रीकृत पोर्टल।",
            bn: "বৃত্তির জন্য কেন্দ্রীভূত পোর্টাল।",
            te: "స్కాలర్‌షిప్‌ల కోసం పోర్టల్.",
            mr: "शिष्यवृत्तीसाठी पोर्टल.",
            ta: "உதவித்தொகைக்கான தளம்.",
          },
          benefit: "Financial Aid",
          url: "https://scholarships.gov.in/",
          evaluate: (p: UserProfile) => {
            const age = calculateAge(p.dob);
            if (age >= 10 && age <= 25)
              return {
                score: 98,
                reason: "Prime age range for national scholarships.",
              };
            return {
              score: 10,
              reason: "Usually applicable for active students under 25.",
            };
          },
        },
        {
          title: {
            en: "PM eVIDYA",
            hi: "पीएम ई-विद्या",
            bn: "পিএম ই-বিদ্যা",
            te: "పిఎం ఇ-విద్యా",
            mr: "पीएम ई-विद्या",
            ta: "பிஎம் இ-வித்யா",
          },
          desc: {
            en: "Unifies all efforts related to digital/online education.",
            hi: "डिजिटल शिक्षा के लिए मंच।",
            bn: "ডিজিটাল শিক্ষার প্ল্যাটফর্ম।",
            te: "డిజిటల్ విద్య కోసం వేదిక.",
            mr: "डिजिटल शिक्षणासाठी व्यासपीठ.",
            ta: "டிஜிட்டல் கல்விக்கான தளம்.",
          },
          benefit: "Free E-Learning",
          url: "https://pmevidya.education.gov.in/",
          evaluate: () => ({
            score: 100,
            reason: "Open digital access for all citizens.",
          }),
        },
        {
          title: {
            en: "Skill India Mission",
            hi: "स्किल इंडिया",
            bn: "স্কিল ইন্ডিয়া",
            te: "స్కిల్ ఇండియా",
            mr: "स्किल इंडिया",
            ta: "திறன் இந்தியா",
          },
          desc: {
            en: "Empowers the youth with skill sets making them more employable.",
            hi: "युवाओं के लिए कौशल प्रशिक्षण।",
            bn: "দক্ষতা प्रशिक्षण।",
            te: "నైపుణ్య శిక్షణ.",
            mr: "कौशल्य प्रशिक्षण.",
            ta: "திறன் பயிற்சி.",
          },
          benefit: "Skill Training",
          url: "https://www.skillindiadigital.gov.in/",
          evaluate: (p: UserProfile) => {
            const age = calculateAge(p.dob);
            if (age >= 16 && age <= 35)
              return {
                score: 95,
                reason: "Prime demographic for skill development programs.",
              };
            return { score: 40, reason: "Open to all, but targeted at youth." };
          },
        },
      ],
    },
    {
      id: "healthcare",
      icon: "fa-heart-pulse",
      name: {
        en: "Healthcare & Insurance",
        hi: "स्वास्थ्य और बीमा",
        bn: "স্বাস্থ্যসেবা ও বীমা",
        te: "ఆరోగ్య సంరక్షణ & భీమా",
        mr: "आरोग्य आणि विमा",
        ta: "சுகாதாரம் மற்றும் காப்பீடு",
      },
      schemes: [
        {
          title: {
            en: "Ayushman Bharat",
            hi: "आयुष्मान भारत",
            bn: "আয়ুষ্মান ভারত",
            te: "ఆయుష్మాన్ భారత్",
            mr: "आयुष्मान भारत",
            ta: "ஆயுஷ்மான் பாரத்",
          },
          desc: {
            en: "Health cover of ₹5 lakhs per family per year.",
            hi: "5 लाख रुपये तक का मुफ्त इलाज।",
            bn: "৫ লক্ষ টাকা পর্যন্ত কভার।",
            te: "₹5 లక్షల వరకు కవర్.",
            mr: "₹5 लाखांपर्यंत कव्हर.",
            ta: "₹5 லட்சம் வரை காப்பீடு.",
          },
          benefit: "₹5 Lakh Cover",
          url: "https://pmjay.gov.in/",
          evaluate: (p: UserProfile) => {
            const inc = parseInt(p.annualIncome.replace(/,/g, "")) || 0;
            if (p.category === "SC" || p.category === "ST")
              return {
                score: 95,
                reason: "Automatically eligible based on declared category.",
              };
            if (inc <= 500000)
              return {
                score: 85,
                reason: "Income qualifies for lower-income bracket criteria.",
              };
            return {
              score: 10,
              reason: "Standard premium applies based on higher income.",
            };
          },
        },
        {
          title: {
            en: "National Health Mission (NHM)",
            hi: "राष्ट्रीय स्वास्थ्य मिशन",
            bn: "জাতীয় স্বাস্থ্য মিশন",
            te: "జాతీయ ఆరోగ్య మిషన్",
            mr: "राष्ट्रीय आरोग्य अभियान",
            ta: "தேசிய சுகாதார பணி",
          },
          desc: {
            en: "Providing accessible, affordable and quality health care.",
            hi: "गुणवत्तापूर्ण स्वास्थ्य देखभाल।",
            bn: "স্বাস্থ্যসেবা।",
            te: "ఆరోగ్య సంరక్షణ.",
            mr: "आरोग्य सेवा.",
            ta: "சுகாதாரப் பராமரிப்பு.",
          },
          benefit: "Subsidized Care",
          url: "https://nhm.gov.in/",
          evaluate: () => ({
            score: 90,
            reason: "Universal accessibility for rural/urban areas.",
          }),
        },
        {
          title: {
            en: "e-Sanjeevani",
            hi: "ई-संजीवनी",
            bn: "ই-সঞ্জীবনী",
            te: "ఇ-సంజీవని",
            mr: "ई-संजीवनी",
            ta: "இ-சஞ்சீவனி",
          },
          desc: {
            en: "National teleconsultation service offering free online medical consultation.",
            hi: "मुफ्त चिकित्सा परामर्श।",
            bn: "বিনামূল্যে চিকিৎসা পরামর্শ।",
            te: "ఉచిత వైద్య సంప్రదింపులు.",
            mr: "मोफत वैद्यकीय सल्ला.",
            ta: "இலவச மருத்துவ ஆலோசனை.",
          },
          benefit: "Free Consultation",
          url: "https://esanjeevaniopd.in/",
          evaluate: () => ({
            score: 100,
            reason: "Open digital platform for all citizens.",
          }),
        },
      ],
    },
    {
      id: "employment",
      icon: "fa-briefcase",
      name: {
        en: "Employment & Skills",
        hi: "रोजगार और कौशल",
        bn: "কর্মসংস্থান ও দক্ষতা",
        te: "ఉపాధి & నైపుణ్యాలు",
        mr: "रोजगार आणि कौशल्ये",
        ta: "வேலைவாய்ப்பு மற்றும் திறன்கள்",
      },
      schemes: [
        {
          title: {
            en: "MGNREGA",
            hi: "मनरेगा",
            bn: "এমজিএনআরইজিএ",
            te: "MGNREGA",
            mr: "मनरेगा",
            ta: "MGNREGA",
          },
          desc: {
            en: "Guarantees 100 days of wage employment in a financial year.",
            hi: "100 दिन का रोजगार।",
            bn: "১০০ দিনের কাজের গ্যারান্টি।",
            te: "100 రోజుల పని హామీ.",
            mr: "१०० दिवसांच्या रोजगाराची हमी.",
            ta: "100 நாட்கள் வேலை உத்தரவாதம்.",
          },
          benefit: "Guaranteed Work",
          url: "https://nrega.nic.in/",
          evaluate: (p: UserProfile) => {
            const inc = parseInt(p.annualIncome.replace(/,/g, "")) || 0;
            if (inc < 300000)
              return {
                score: 98,
                reason:
                  "High probability of eligibility in rural demographics.",
              };
            return {
              score: 30,
              reason: "Primarily for rural wage employment.",
            };
          },
        },
        {
          title: {
            en: "National Career Service",
            hi: "राष्ट्रीय करियर सेवा",
            bn: "জাতীয় ক্যারিয়ার পরিষেবা",
            te: "జాతీయ కెరీర్ సేవ",
            mr: "राष्ट्रीय करिअर सेवा",
            ta: "தேசிய தொழில் சேவை",
          },
          desc: {
            en: "Portal connecting job seekers with employers.",
            hi: "नौकरी चाहने वालों और नियोक्ताओं को जोड़ना।",
            bn: "ক্যারিয়ার পোর্টাল।",
            te: "కెరీర్ పోర్టల్.",
            mr: "करिअर पोर्टल.",
            ta: "தொழில் தளம்.",
          },
          benefit: "Job Portal",
          url: "https://www.ncs.gov.in/",
          evaluate: (p: UserProfile) => {
            const age = calculateAge(p.dob);
            if (age >= 18 && age <= 50)
              return {
                score: 100,
                reason: "Working age demographic matches perfectly.",
              };
            return { score: 50, reason: "Open to all job seekers." };
          },
        },
      ],
    },
    {
      id: "women",
      icon: "fa-child-reaching",
      name: {
        en: "Women & Child Welfare",
        hi: "महिला एवं बाल कल्याण",
        bn: "নারী ও শিশু কল্যাণ",
        te: "మహిళా & శిశు సంక్షేమం",
        mr: "महिला आणि बाल विकास",
        ta: "பெண்கள் மற்றும் குழந்தைகள் நலன்",
      },
      schemes: [
        {
          title: {
            en: "Beti Bachao Beti Padhao",
            hi: "बेटी बचाओ बेटी पढ़ाओ",
            bn: "বেটি বাঁচাও",
            te: "బేటీ బచావో",
            mr: "बेटी बचाओ",
            ta: "பெண் குழந்தையை காப்போம்",
          },
          desc: {
            en: "Campaign for survival, protection, and education of the girl child.",
            hi: "बालिकाओं की शिक्षा और संरक्षण।",
            bn: "কন্যা সন্তানের শিক্ষা।",
            te: "ఆడపిల్లల విద్య.",
            mr: "मुलींचे शिक्षण.",
            ta: "பெண் குழந்தைகளின் கல்வி.",
          },
          benefit: "Social Security",
          url: "https://wcd.nic.in/bbbp-schemes",
          evaluate: (p: UserProfile) => {
            return p.gender === "Female" || p.gender === "Other"
              ? {
                  score: 95,
                  reason: "Directly applicable based on gender demographic.",
                }
              : {
                  score: 40,
                  reason: "Applicable if you have a girl child in the family.",
                };
          },
        },
        {
          title: {
            en: "PM Matru Vandana Yojana",
            hi: "पीएम मातृ वंदना योजना",
            bn: "মাতৃ বন্দনা যোজনা",
            te: "మాతృ వందన యోజన",
            mr: "मातृ वंदना योजना",
            ta: "மாத்ரு வந்தனா யோஜனா",
          },
          desc: {
            en: "Maternity benefit program providing cash incentives.",
            hi: "गर्भवती महिलाओं के लिए नकद प्रोत्साहन।",
            bn: "নগদ প্রণোদনা।",
            te: "నగదు ప్రోత్సాహకాలు.",
            mr: "रोख प्रोत्साहन.",
            ta: "பண ஊக்கத்தொகை.",
          },
          benefit: "₹5,000 Cash",
          url: "https://wcd.nic.in/schemes/pradhan-mantri-matru-vandana-yojana",
          evaluate: (p: UserProfile) => {
            if (p.gender === "Female")
              return { score: 90, reason: "Applicable for expecting mothers." };
            return {
              score: 0,
              reason: "Maternity scheme specific to females.",
            };
          },
        },
        {
          title: {
            en: "Sukanya Samriddhi Yojana",
            hi: "सुकन्या समृद्धि योजना",
            bn: "সুকন্যা সমৃদ্ধি যোজনা",
            te: "సుకున్య సమృద్ధి యోజన",
            mr: "सुकन्या समृद्धी योजना",
            ta: "சுகன்யா சம்ருத்தி யோஜனா",
          },
          desc: {
            en: "Government-backed savings scheme to secure the future of girl child.",
            hi: "बालिकाओं के लिए बचत योजना।",
            bn: "কন্যা সন্তানের জন্য সঞ্চয়।",
            te: "ఆడపిల్లల కోసం పొదుపు.",
            mr: "मुलींसाठी बचत योजना.",
            ta: "பெண் குழந்தைகளுக்கான சேமிப்பு.",
          },
          benefit: "High Interest",
          url: "https://www.indiapost.gov.in/Financial/Pages/Content/Sukanya-Samriddhi-Account.aspx",
          evaluate: () => ({
            score: 85,
            reason: "Applicable if you are a parent of a girl child under 10.",
          }),
        },
      ],
    },
    {
      id: "housing",
      icon: "fa-building",
      name: {
        en: "Housing & Urban",
        hi: "आवास और शहरी",
        bn: "আবাসন ও নগর",
        te: "హౌసింగ్ & అర్బన్",
        mr: "गृहनिर्माण आणि नागरी",
        ta: "வீட்டுவசதி மற்றும் நகர்ப்புறம்",
      },
      schemes: [
        {
          title: {
            en: "PM Awas Yojana",
            hi: "प्रधानमंत्री आवास योजना",
            bn: "প্রধানমন্ত্রী আবাস যোজনা",
            te: "ప్రధాన మంత్రి ఆవాస్ యోజన",
            mr: "पंतप्रधान आवास योजना",
            ta: "பிரதம மந்திரி ஆவாஸ் யோஜனா",
          },
          desc: {
            en: "Provides affordable housing for the urban and rural poor.",
            hi: "गरीबों के लिए किफायती आवास।",
            bn: "গরীবদের জন্য সাশ্রয়ী আবাসন।",
            te: "పేదలకు సరసమైన ఇళ్లు.",
            mr: "गरिबांसाठी परवडणारी घरे.",
            ta: "ஏழைகளுக்கு மலிவு விலை வீடுகள்.",
          },
          benefit: "Housing Subsidy",
          url: "https://pmaymis.gov.in/",
          evaluate: (p: UserProfile) => {
            const inc = parseInt(p.annualIncome.replace(/,/g, "")) || 0;
            if (inc <= 300000)
              return {
                score: 98,
                reason:
                  "Income falls strictly in EWS (Economically Weaker Section) category.",
              };
            if (inc <= 600000)
              return {
                score: 75,
                reason:
                  "Income falls in LIG category. Partial subsidy applicable.",
              };
            return {
              score: 10,
              reason: "Income exceeds standard scheme limits.",
            };
          },
        },
        {
          title: {
            en: "Swachh Bharat Mission",
            hi: "स्वच्छ भारत अभियान",
            bn: "স্বচ্ছ ভারত মিশন",
            te: "స్వచ్ఛ భారత్ మిషన్",
            mr: "स्वच्छ भारत अभियान",
            ta: "தூய்மை இந்தியா திட்டம்",
          },
          desc: {
            en: "Aiming to achieve an open-defecation-free India.",
            hi: "शौचालय निर्माण हेतु सब्सिडी।",
            bn: "শৌচালয় নির্মাণের জন্য ভর্তুকি।",
            te: "మరుగుదొడ్డి నిర్మాణానికి సబ్సిడీ.",
            mr: "शौचालय बांधणीसाठी सबसिडी.",
            ta: "கழிப்பறை கட்ட மானியம்.",
          },
          benefit: "Toilet Subsidy",
          url: "https://swachhbharatmission.gov.in/",
          evaluate: () => ({
            score: 80,
            reason:
              "Available to eligible households without sanitation facilities.",
          }),
        },
      ],
    },
    {
      id: "finance",
      icon: "fa-building-columns",
      name: {
        en: "Finance, Banking & Insurance",
        hi: "वित्त, बैंकिंग और बीमा",
        bn: "অর্থ, ব্যাংকিং ও বীমা",
        te: "ఫైనాన్స్, బ్యాంకింగ్ & భీమా",
        mr: "वित्त, बँकिंग आणि विमा",
        ta: "நிதி, வங்கி மற்றும் காப்பீடு",
      },
      schemes: [
        {
          title: {
            en: "PM Jan Dhan Yojana",
            hi: "पीएम जन धन योजना",
            bn: "জন ধন যোজনা",
            te: "జన్ ధన్ యోజన",
            mr: "जन धन योजना",
            ta: "ஜன் தன் யோஜனா",
          },
          desc: {
            en: "National mission for financial inclusion to ensure access to banking facilities.",
            hi: "जीरो बैलेंस बैंक खाता।",
            bn: "শূন্য ব্যালেন্স ব্যাঙ্ক অ্যাকাউন্ট।",
            te: "జీరో బ్యాలెన్స్ బ్యాంక్ ఖాతా.",
            mr: "झिरो बॅलन्स बँक खाते.",
            ta: "ஜீரோ பேலன்ஸ் வங்கி கணக்கு.",
          },
          benefit: "Zero Balance A/C",
          url: "https://pmjdy.gov.in/",
          evaluate: () => ({
            score: 100,
            reason:
              "Universal scheme open to all citizens without a bank account.",
          }),
        },
        {
          title: {
            en: "Atal Pension Yojana",
            hi: "अटल पेंशन योजना",
            bn: "অটল পেনশন যোজনা",
            te: "అటల్ పెన్షన్ యోజన",
            mr: "अटल पेन्शन योजना",
            ta: "அடல் ஓய்வூதிய திட்டம்",
          },
          desc: {
            en: "A guaranteed pension scheme focused on the unorganized sector.",
            hi: "गारंटीकृत पेंशन।",
            bn: "নিশ্চিত পেনশন।",
            te: "హామీ పెన్షన్.",
            mr: "हमी दिलेली पेन्शन.",
            ta: "உத்தரவாத ஓய்வூதிய திட்டம்.",
          },
          benefit: "₹1k-5k / Month",
          url: "https://pfrda.org.in/",
          evaluate: (p: UserProfile) => {
            const age = calculateAge(p.dob);
            if (age >= 18 && age <= 40)
              return {
                score: 95,
                reason: "Perfect age bracket to start investing in APY.",
              };
            return {
              score: 0,
              reason: "Applicant must be between 18 and 40 years of age.",
            };
          },
        },
        {
          title: {
            en: "Mudra Loans",
            hi: "मुद्रा ऋण",
            bn: "মুদ্রা ঋণ",
            te: "ముద్రా రుణాలు",
            mr: "मुद्रा कर्ज",
            ta: "முத்ரா கடன்கள்",
          },
          desc: {
            en: "Loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises.",
            hi: "छोटे उद्यमों के लिए ऋण।",
            bn: "ছোট ব্যবসার জন্য ঋণ।",
            te: "చిన్న వ్యాపారాలకు రుణాలు.",
            mr: "लहान व्यवसायांसाठी कर्ज.",
            ta: "சிறிறு தொழில்களுக்கான கடன்கள்.",
          },
          benefit: "Up to ₹10L Loan",
          url: "https://www.mudra.org.in/",
          evaluate: () => ({
            score: 85,
            reason:
              "Applicable if looking to start or expand a micro-enterprise.",
          }),
        },
      ],
    },
    {
      id: "social-welfare",
      icon: "fa-users",
      name: {
        en: "Social Welfare",
        hi: "समाज कल्याण",
        bn: "সমাজ কল্যাণ",
        te: "సాంఘిక సంక్షేమం",
        mr: "समाज कल्याण",
        ta: "சமூக நலம்",
      },
      schemes: [
        {
          title: {
            en: "National Social Assistance (NSAP)",
            hi: "राष्ट्रीय सामाजिक सहायता",
            bn: "জাতীয় সামাজিক সহায়তা",
            te: "జాతీయ సామాజిక సహాయం",
            mr: "राष्ट्रीय सामाजिक सहाय्य",
            ta: "தேசிய சமூக உதவி",
          },
          desc: {
            en: "Provides financial assistance to the elderly, widows, and persons with disabilities.",
            hi: "बुजुर्गों और दिव्यांगों को पेंशन।",
            bn: "বয়স্ক ও প্রতিবন্ধীদের পেনশন।",
            te: "వృద్ధులకు & వికలాంగులకు పెన్షన్.",
            mr: "वृद्ध आणि अपंगांना पेन्शन.",
            ta: "முதியோர் & மாற்றுத்திறனாளிகளுக்கு ஓய்வூதியம்.",
          },
          benefit: "Monthly Pension",
          url: "https://nsap.nic.in/",
          evaluate: (p: UserProfile) => {
            const age = calculateAge(p.dob);
            if (age >= 60)
              return {
                score: 100,
                reason:
                  "Applicant meets the minimum age requirement of 60 years.",
              };
            return {
              score: 20,
              reason: `Applicant is ${age} years old. Minimum age is usually 60 unless disabled/widowed.`,
            };
          },
        },
        {
          title: {
            en: "SC/ST Welfare Schemes",
            hi: "SC/ST कल्याण योजनाएं",
            bn: "SC/ST কল্যাণ",
            te: "SC/ST సంక్షేమం",
            mr: "SC/ST कल्याण",
            ta: "SC/ST நலம்",
          },
          desc: {
            en: "Targeted schemes including scholarships and hostels for marginalized groups.",
            hi: "छात्रवृत्ति और कल्याण कोष।",
            bn: "বৃত্তি এবং কল্যাণ তহবিল।",
            te: "స్కాలర్‌షిప్‌లు మరియు సంక్షేమ నిధులు.",
            mr: "शिष्यवृत्ती आणि कल्याण निधी.",
            ta: "உதவித்தொகை மற்றும் நலன்புரி நிதிகள்.",
          },
          benefit: "Financial Grants",
          url: "https://socialjustice.gov.in/",
          evaluate: (p: UserProfile) => {
            if (p.category === "SC" || p.category === "ST")
              return {
                score: 100,
                reason: "Directly matches declared social category.",
              };
            return {
              score: 0,
              reason: "Scheme restricted to SC/ST categories.",
            };
          },
        },
      ],
    },
  ] as Category[],
  i18n: {
    en: {
      "t-hero-title": "Empowering Citizens with Information",
      "t-hero-desc":
        "Detailed step-by-step procedures for government responsibilities and a curated list of official benefits, subsidies, and scholarships.",
      "t-hero-badge": "Updated April 2026",
      "t-sec1-title": "Government Services Guide",
      "t-select-service": "SELECT A SERVICE:",
      "t-search-services": "Search services...",
      "t-key-docs": "KEY DOCUMENTS",
      "t-step-label": "Step",
      "t-procedure-title": "Step-by-Step Procedure",
      "t-sec2-title": "Schemes & Benefits Explorer",
      "btn-apply": "Official Portal",
      "t-search": "Search schemes...",
      "t-time": "Est. Time",
      "t-cost": "Fees/Cost",
      "t-empty": "No items found for this search.",
      "toast-lang": "Language changed to English",
      "toast-copy": "Official link copied to clipboard!",
      "t-chat-welcome":
        "Hello! I am your Sahayak Setu AI Assistant. You can ask me how to apply for a PAN card, Voter ID, Aadhaar, or inquire about schemes for farmers, students, etc.",
      "t-chat-input-placeholder":
        "Ask or speak about any government service...",
      "t-chat-disclaimer":
        "*AI Disclaimer: Please verify all steps on the official portal.",
      // New T&C and Wizard strings
      "tc-title": "Terms of Service & Cookie Policy",
      "tc-desc": "Required for accessing AI features and document processing",
      "tc-accept": "I Accept & Continue",
      "tc-text1":
        "1. Data Privacy: Any documents uploaded (Aadhaar, PAN) are processed entirely in memory via secure browser OCR. We use 256-bit encryption. No PII is saved to external databases.",
      "tc-text2":
        "2. Cookies: We use essential session cookies to maintain your login status and language preferences.",
      "tc-text3":
        "3. AI Processing: Queries to the Assistant may be processed via secure LLM APIs to provide context-aware help.",
      "tc-text4":
        "4. External Links: We provide direct links to official government portals but are not responsible for their independent privacy practices.",
      "wiz-title": "Smart Eligibility Wizard",
      "wiz-desc":
        "AI-powered document scanning to auto-fill your profile and discover eligible government schemes instantly.",
      "wiz-step1": "Document Scan",
      "wiz-step2": "Verify Profile",
      "wiz-step3": "View Schemes",
      "wiz-upload": "Identity Verification",
      "wiz-upload-desc":
        "Upload an official document to auto-fill your profile securely.",
      "wiz-click-upload": "Click to Upload Document",
      "wiz-upload-help": "Supports Aadhaar, PAN, or Voter ID (JPG, PNG, PDF)",
      "wiz-btn-next": "Proceed to Verify",
      "wiz-verify-title": "Verify Your Details",
      "wiz-verify-desc":
        "Review extracted data and fill in the missing information.",
      "wiz-fullname": "Full Name",
      "wiz-dob": "Date of Birth",
      "wiz-gender": "Gender",
      "wiz-category": "Social Category",
      "wiz-income": "Family Annual Income",
      "wiz-btn-back": "Back",
      "wiz-btn-evaluate": "Evaluate Schemes",
      "wiz-success": "Eligibility Analysis Complete",
      "wiz-match-score": "Match Score",
      "wiz-reason": "Reason",
      "btn-start-wizard": "Start AI Wizard",
    },
    hi: {
      "t-hero-title": "सूचना के साथ नागरिकों का सशक्तिकरण",
      "t-hero-desc":
        "सरकारी जिम्मेदारियों के लिए विस्तृत चरण-दर-चरण प्रक्रियाएं और आधिकारिक लाभों, सब्सिडी और छात्रवृत्ति की सूची।",
      "t-hero-badge": "अद्यतित अप्रैल 2026",
      "t-sec1-title": "सरकारी सेवाएं मार्गदर्शक",
      "t-select-service": "एक सेवा चुनें:",
      "t-search-services": "सेवाएं खोजें...",
      "t-key-docs": "मुख्य दस्तावेज़",
      "t-step-label": "चरण",
      "t-procedure-title": "चरण-दर-चरण प्रक्रिया",
      "t-sec2-title": "योजनाएं और लाभ एक्सप्लोरर",
      "btn-apply": "आधिकारिक पोर्टल",
      "t-search": "योजनाएं खोजें...",
      "t-time": "अनुमानित समय",
      "t-cost": "शुल्क/लागत",
      "t-empty": "इस खोज के लिए कोई परिणाम नहीं मिला।",
      "toast-lang": "भाषा बदलकर हिंदी कर दी गई है",
      "toast-copy": "लिंक क्लिपबोर्ड पर कॉपी किया गया!",
      "t-chat-welcome":
        "नमस्ते! मैं आपका सहायक सेतु एआई सहायक हूँ। आप मुझसे पैन कार्ड, आधार, या योजनाओं के बारे में पूछ सकते हैं।",
      "t-chat-input-placeholder":
        "किसी भी सरकारी सेवा के बारे में पूछें या बोलें...",
      "t-chat-disclaimer":
        "*एआई अस्वीकरण: कृपया आधिकारिक पोर्टल पर जानकारी सत्यापित करें।",
      "tc-title": "सेवा की शर्तें और कुकी नीति",
      "tc-desc": "AI सुविधाओं तक पहुँचने के लिए आवश्यक",
      "tc-accept": "मैं स्वीकार करता हूँ",
      "tc-text1":
        "1. डेटा गोपनीयता: सुरक्षित ब्राउज़र ओसीआर के माध्यम से स्मृति में पूरी तरह से संसाधित दस्तावेज़। कोई व्यक्तिगत डेटा सहेजा नहीं गया है।",
      "tc-text2": "2. कुकीज़: हम आवश्यक सत्र कुकीज़ का उपयोग करते हैं।",
      "tc-text3":
        "3. एआई प्रसंस्करण: सुरक्षित LLM APIs का उपयोग किया जा सकता है।",
      "tc-text4":
        "4. बाहरी लिंक: हम आधिकारिक सरकारी पोर्टलों के लिंक प्रदान करते हैं।",
      "wiz-title": "स्मार्ट पात्रता विज़ार्ड",
      "wiz-desc": "आपकी प्रोफ़ाइल को स्वतः भरने के लिए एआई-संचालित स्कैनिंग।",
      "wiz-step1": "दस्तावेज़ स्कैन",
      "wiz-step2": "प्रोफ़ाइल जांचें",
      "wiz-step3": "योजनाएं देखें",
      "wiz-upload": "पहचान सत्यापन",
      "wiz-upload-desc":
        "सुरक्षित रूप से प्रोफ़ाइल भरने के लिए एक आधिकारिक दस्तावेज़ अपलोड करें।",
      "wiz-click-upload": "दस्तावेज़ अपलोड करने के लिए क्लिक करें",
      "wiz-upload-help": "आधार, पैन, या वोटर आईडी का समर्थन करता है",
      "wiz-btn-next": "आगे बढ़ें",
      "wiz-verify-title": "अपना विवरण सत्यापित करें",
      "wiz-verify-desc":
        "निकाले गए डेटा की समीक्षा करें और छूटी हुई जानकारी भरें।",
      "wiz-fullname": "पूरा नाम",
      "wiz-dob": "जन्म तिथि",
      "wiz-gender": "लिंग",
      "wiz-category": "सामाजिक श्रेणी",
      "wiz-income": "पारिवारिक वार्षिक आय",
      "wiz-btn-back": "पीछे",
      "wiz-btn-evaluate": "योजनाओं का मूल्यांकन करें",
      "wiz-success": "पात्रता विश्लेषण पूर्ण",
      "wiz-match-score": "मैच स्कोर",
      "wiz-reason": "कारण",
      "btn-start-wizard": "एआई विज़ार्ड प्रारंभ करें",
    },
    bn: {
      "t-hero-title": "তথ্যের মাধ্যমে নাগরিকদের ক্ষমতায়ন",
      "t-hero-desc":
        "সরকারি দায়িত্বের জন্য বিস্তারিত ধাপে ধাপে পদ্ধতি এবং সরকারী সুবিধা, ভর্তুকি এবং বৃত্তির তালিকা।",
      "t-hero-badge": "আপডেট এপ্রিল 2026",
      "t-sec1-title": "সরকারি পরিষেবা গাইড",
      "t-select-service": "একটি পরিষেবা নির্বাচন করুন:",
      "t-search-services": "পরিষেবা খুঁজুন...",
      "t-key-docs": "প্রয়োজনীয় নথিপত্র",
      "t-step-label": "ধাপ",
      "t-procedure-title": "ধাপে ধাপে পদ্ধতি",
      "t-sec2-title": "স্কিম এবং সুবিধা এক্সপ্লোরার",
      "btn-apply": "অফিসিয়াল পোর্টাল",
      "t-search": "স্কিম খুঁজুন...",
      "t-time": "আনুমানিক সময়",
      "t-cost": "ফি/খরচ",
      "t-empty": "কোন ফলাফল পাওয়া যায়নি।",
      "toast-lang": "ভাষা বাংলা করা হয়েছে",
      "toast-copy": "লিঙ্ক কপি করা হয়েছে!",
      "t-chat-welcome":
        "হ্যালো! আমি আপনার সহায়ক সেতু এআই সহকারী। আপনি আমাকে প্যান কার্ড, আধার বা বিভিন্ন স্কিম সম্পর্কে জিজ্ঞাসা করতে পারেন।",
      "t-chat-input-placeholder":
        "যেকোনো সরকারি পরিষেবা সম্পর্কে জিজ্ঞাসা করুন...",
      "t-chat-disclaimer":
        "*এআই দাবিদ্যাগ: অনুগ্রহ করে অফিসিয়াল পোর্টালে যাচাই করুন।",
      "tc-title": "পরিষেবার শর্তাবলী এবং কুকি নীতি",
      "tc-desc":
        "AI বৈশিষ্ট্য এবং দস্তাবেজ প্রক্রিয়াকরণ অ্যাক্সেস করার জন্য প্রয়োজনীয়",
      "tc-accept": "আমি স্বীকার করছি",
      "tc-text1":
        "1. ডেটা গোপনীয়তা: আপলোড করা যে কোনো নথি (আধার, প্যান) ব্রাউজার OCR-এর মাধ্যমে প্রক্রিয়া করা হয়। কোনো ব্যক্তিগত তথ্য সংরক্ষণ করা হয় না।",
      "tc-text2":
        "2. কুকিজ: আমরা আপনার ভাষা পছন্দ বজায় রাখতে কুকিজ ব্যবহার করি।",
      "tc-text3":
        "3. এআই প্রক্রিয়াকরণ: এআই এপিআইগুলির মাধ্যমে আপনার অনুসন্ধানগুলি প্রক্রিয়া করা হতে পারে।",
      "tc-text4":
        "4. বহিরাগত লিঙ্ক: আমরা অফিসিয়াল সরকারী পোর্টালগুলিতে লিঙ্ক প্রদান করি।",
      "wiz-title": "স্মার্ট যোগ্যতা উইজার্ড",
      "wiz-desc": "স্বয়ংক্রিয়ভাবে আপনার প্রোফাইল পূরণ করতে AI স্ক্যানিং।",
      "wiz-step1": "ডকুমেন্ট স্ক্যান",
      "wiz-step2": "প্রোফাইল যাচাই",
      "wiz-step3": "স্কিম দেখুন",
      "wiz-upload": "পরিচয় যাচাইকরণ",
      "wiz-upload-desc":
        "নিরাপদে আপনার প্রোফাইল স্বয়ংক্রিয়ভাবে পূরণ করতে একটি ডকুমেন্ট আপলোড করুন।",
      "wiz-click-upload": "ডকুমেন্ট আপলোড করতে ক্লিক করুন",
      "wiz-upload-help": "আধার, প্যান বা ভোটার আইডি সমর্থন করে",
      "wiz-btn-next": "এগিয়ে যান",
      "wiz-verify-title": "আপনার বিবরণ যাচাই করুন",
      "wiz-verify-desc": "উত্তোলিত ডেটা পর্যালোচনা করুন এবং তথ্য পূরণ করুন।",
      "wiz-fullname": "পুরো নাম",
      "wiz-dob": "জন্ম তারিখ",
      "wiz-gender": "লিঙ্গ",
      "wiz-category": "সামাজিক বিভাগ",
      "wiz-income": "বার্ষিক আয়",
      "wiz-btn-back": "পিছনে",
      "wiz-btn-evaluate": "স্কিম মূল্যায়ন করুন",
      "wiz-success": "যোগ্যতা বিশ্লেষণ সম্পূর্ণ",
      "wiz-match-score": "ম্যাচ স্কোর",
      "wiz-reason": "কারণ",
      "btn-start-wizard": "এআই উইজার্ড শুরু করুন",
    },
    te: {
      "t-hero-title": "సమాచారంతో పౌరుల సాధికారత",
      "t-hero-desc":
        "ప్రభుత్వ బాధ్యతల కోసం దశలవారీ విధానాలు మరియు అధికారిక ప్రయోజనాలు, సబ్సిడీలు మరియు స్కాలర్‌షిప్‌ల జాబితా.",
      "t-hero-badge": "నవీకరించబడింది ఏప్రిల్ 2026",
      "t-sec1-title": "ప్రభుత్వ సేవల మార్గదర్శి",
      "t-select-service": "ఒక సేవను ఎంచుకోండి:",
      "t-search-services": "సేవలను శోధించండి...",
      "t-key-docs": "ముఖ్య పత్రాలు",
      "t-step-label": "దశ",
      "t-procedure-title": "దశలవారీ విధానం",
      "t-sec2-title": "పథకాలు & ప్రయోజనాల అన్వేషకి",
      "btn-apply": "అధికారిక పోర్టల్",
      "t-search": "పథకాలను శోధించండి...",
      "t-time": "అంచనా సమయం",
      "t-cost": "రుసుము/ఖర్చు",
      "t-empty": "ఎలాంటి ఫలితాలు కనుగొనబడలేదు.",
      "toast-lang": "భాష తెలుగులోకి మార్చబడింది",
      "toast-copy": "లింక్ కాపీ చేయబడింది!",
      "t-chat-welcome":
        "నమస్తే! నేను మీ సహాయక్ సేతు AI అసిస్టెంట్‌ని. మీరు పాన్ కార్డ్, ఆధార్ లేదా వివిధ పథకాల గురించి నన్ను అడగవచ్చు.",
      "t-chat-input-placeholder": "ఏదైనా ప్రభుత్వ సేవ గురించి అడగండి...",
      "t-chat-disclaimer":
        "*AI నిరాకరణ: దయచేసి అధికారిక పోర్టల్‌లో సమాచారాన్ని ధృవీకరించండి.",
      "tc-title": "సేవా నిబంధనలు & కుకీ విధానం",
      "tc-desc": "AI ఫీచర్‌లను యాక్సెస్ చేయడానికి అవసరం",
      "tc-accept": "నేను అంగీకరిస్తున్నాను",
      "tc-text1":
        "1. డేటా గోప్యత: అప్‌లోడ్ చేసిన పత్రాలు బ్రౌజర్ OCR ద్వారా ప్రాసెస్ చేయబడతాయి. వ్యక్తిగత డేటా నిల్వ చేయబడదు.",
      "tc-text2":
        "2. కుకీలు: మీ ప్రాధాన్యతలను నిర్వహించడానికి మేము కుకీలను ఉపయోగిస్తాము.",
      "tc-text3":
        "3. AI ప్రాసెసింగ్: ప్రశ్నలు సురక్షిత LLM ద్వారా ప్రాసెస్ చేయబడతాయి.",
      "tc-text4":
        "4. బాహ్య లింక్‌లు: మేము అధికారిక పోర్టల్‌లకు లింక్‌లను అందిస్తాము.",
      "wiz-title": "స్మార్ట్ అర్హత విజిర్డ్",
      "wiz-desc": "మీ ప్రొఫైల్‌ను ఆటో-ఫిల్ చేయడానికి AI స్కానింగ్.",
      "wiz-step1": "పత్రం స్కాన్",
      "wiz-step2": "ప్రొఫైల్ తనిఖీ",
      "wiz-step3": "పథకాలను చూడండి",
      "wiz-upload": "గుర్తింపు ధృవీకరణ",
      "wiz-upload-desc":
        "మీ ప్రొఫైల్‌ను ఆటో-ఫిల్ చేయడానికి పత్రాన్ని అప్‌లోడ్ చేయండి.",
      "wiz-click-upload": "పత్రం అప్‌లోడ్ చేయడానికి క్లిక్ చేయండి",
      "wiz-upload-help": "ఆధార్, పాన్ లేదా ఓటర్ ఐడీ మద్దతు ఇస్తుంది",
      "wiz-btn-next": "కొనసాగండి",
      "wiz-verify-title": "మీ వివరాలను ధృవీకరించండి",
      "wiz-verify-desc": "డేటాను సమీక్షించండి మరియు సమాచారాన్ని పూరించండి.",
      "wiz-fullname": "పూర్తి పేరు",
      "wiz-dob": "పుట్టిన తేదీ",
      "wiz-gender": "లింగం",
      "wiz-category": "సామాజిక వర్గం",
      "wiz-income": "వార్షిక ఆదాయం",
      "wiz-btn-back": "వెనుకకు",
      "wiz-btn-evaluate": "పథకాలను అంచనా వేయండి",
      "wiz-success": "అర్హత విశ్లేషణ పూర్తయింది",
      "wiz-match-score": "మ్యాచ్ స్కోర్",
      "wiz-reason": "కారణం",
      "btn-start-wizard": "AI విజిర్డ్‌ను ప్రారంభించండి",
    },
    mr: {
      "t-hero-title": "माहितीसह नागरिकांचे सक्षमीकरण",
      "t-hero-desc":
        "सरकारी जबाबदाऱ्यांसाठी तपशीलवार टप्प्याटप्प्याने प्रक्रिया आणि अधिकृत फायदे, सबसिडी आणि शिष्यवृत्तीची यादी.",
      "t-hero-badge": "अद्यतनित एप्रिल 2026",
      "t-sec1-title": "सरकारी सेवा मार्गदर्शक",
      "t-select-service": "एक सेवा निवडा:",
      "t-search-services": "सेवा शोधा...",
      "t-key-docs": "महत्त्वाची कागदपत्रे",
      "t-step-label": "पायरी",
      "t-procedure-title": "टप्प्याटप्प्याने प्रक्रिया",
      "t-sec2-title": "योजना आणि फायदे एक्सप्लोरर",
      "btn-apply": "अधिकृत पोर्टल",
      "t-search": "योजना शोधा...",
      "t-time": "अंदाजे वेळ",
      "t-cost": "शुल्क/खर्च",
      "t-empty": "कोणतेही परिणाम आढळले नाहीत.",
      "toast-lang": "भाषा मराठीत बदलली",
      "toast-copy": "लिंक कॉपी केली!",
      "t-chat-welcome":
        "नमस्कार! मी तुमचा सहाय्यक सेतू एआय सहाय्यक आहे. तुम्ही मला पॅन कार्ड, आधार किंवा योजनांबद्दल विचारू शकता.",
      "t-chat-input-placeholder": "कोणत्याही सरकारी सेवेबद्दल विचारा...",
      "t-chat-disclaimer":
        "*एआय अस्वीकरण: कृपया अधिकृत पोर्टलवर माहिती सत्यापित करा.",
      "tc-title": "सेवा अटी आणि कुकी धोरण",
      "tc-desc": "AI वैशिष्ट्यांमध्ये प्रवेश करण्यासाठी आवश्यक आहे",
      "tc-accept": "मी स्वीकारतो",
      "tc-text1":
        "1. डेटा गोपनीयता: अपलोड केलेले दस्तऐवज ब्राउझर OCR द्वारे सुरक्षितपणे प्रक्रियेत आणले जातात. कोणताही वैयक्तिक डेटा जतन केलेला नाही.",
      "tc-text2": "2. कुकीज: आम्ही सत्र कुकीज वापरतो.",
      "tc-text3": "3. AI प्रक्रिया: AI द्वारे प्रश्न प्रक्रिया केले जाऊ शकतात.",
      "tc-text4":
        "4. बाह्य दुवे: आम्ही अधिकृत सरकारी पोर्टल्सचे दुवे प्रदान करतो.",
      "wiz-title": "स्मार्ट पात्रता विझार्ड",
      "wiz-desc": "तुमचे प्रोफाइल स्वयं-भरण्यासाठी AI स्कॅनिंग.",
      "wiz-step1": "दस्तऐवज स्कॅन",
      "wiz-step2": "प्रोफाइल तपासा",
      "wiz-step3": "योजना पहा",
      "wiz-upload": "ओळख पडताळणी",
      "wiz-upload-desc":
        "तुमचे प्रोफाइल सुरक्षितपणे भरण्यासाठी दस्तऐवज अपलोड करा.",
      "wiz-click-upload": "दस्तऐवज अपलोड करण्यासाठी क्लिक करा",
      "wiz-upload-help": "आधार, पॅन किंवा मतदार ओळखपत्रास समर्थन देते",
      "wiz-btn-next": "पुढे जा",
      "wiz-verify-title": "तुमचे तपशील सत्यापित करा",
      "wiz-verify-desc": "काढलेल्या डेटाचे पुनरावलोकन करा आणि माहिती भरा.",
      "wiz-fullname": "पूर्ण नाव",
      "wiz-dob": "जन्म तारीख",
      "wiz-gender": "लिंग",
      "wiz-category": "सामाजिक श्रेणी",
      "wiz-income": "वार्षिक उत्पन्न",
      "wiz-btn-back": "मागे",
      "wiz-btn-evaluate": "योजनांचे मूल्यांकन करा",
      "wiz-success": "पात्रता विश्लेषण पूर्ण",
      "wiz-match-score": "साम्य गुण",
      "wiz-reason": "कारण",
      "btn-start-wizard": "AI विझार्ड सुरू करा",
    },
    ta: {
      "t-hero-title": "தகவலுடன் குடிமக்களுக்கு அதிகாரமளித்தல்",
      "t-hero-desc":
        "அரசு பொறுப்புகளுக்கான விரிவான படிப்படியான நடைமுறைகள் மற்றும் அதிகாரப்பூர்வ பலன்கள், மானியங்கள் மற்றும் உதவித்தொகைகளின் பட்டியல்.",
      "t-hero-badge": "புதுப்பிக்கப்பட்டது ஏப்ரல் 2026",
      "t-sec1-title": "அரசு சேவைகள் வழிகாட்டி",
      "t-select-service": "ஒரு சேவையைத் தேர்ந்தெடுக்கவும்:",
      "t-search-services": "சேவைகளைத் தேடவும்...",
      "t-key-docs": "முக்கிய ஆவணங்கள்",
      "t-step-label": "படி",
      "t-procedure-title": "படிப்படியான நடைமுறை",
      "t-sec2-title": "திட்டங்கள் & நன்மைகள் எக்ஸ்ப்ளோரர்",
      "btn-apply": "அதிகாரப்பூர்வ தளம்",
      "t-search": "திட்டங்களைத் தேடுங்கள்...",
      "t-time": "நேரம்",
      "t-cost": "கட்டணம்",
      "t-empty": "முடிவுகள் எதுவும் காணப்படவில்லை.",
      "toast-lang": "மொழி தமிழுக்கு மாற்றப்பட்டது",
      "toast-copy": "இணைப்பு நகலெடுக்கப்பட்டது!",
      "t-chat-welcome":
        "வணக்கம்! நான் உங்கள் சஹாயக் சேது AI உதவியாளர். பான் கார்டு, ஆதார் அல்லது திட்டங்கள் குறித்து நீங்கள் என்னிடம் கேட்கலாம்.",
      "t-chat-input-placeholder": "எந்த அரசு சேவை பற்றியும் கேளுங்கள்...",
      "t-chat-disclaimer":
        "*AI மறுப்பு: அதிகாரப்பூர்வ இணையதளத்தில் சரிபார்க்கவும்.",
      "tc-title": "சேவை விதிமுறைகள் & குக்கீ கொள்கை",
      "tc-desc": "AI அம்சங்களை அணுக தேவை",
      "tc-accept": "நான் ஏற்கிறேன்",
      "tc-text1":
        "1. தரவு தனியுரிமை: பதிவேற்றப்பட்ட ஆவணங்கள் உலாவி OCR மூலம் பாதுகாப்பாக செயலாக்கப்படும். தனிப்பட்ட தரவு சேமிக்கப்படவில்லை.",
      "tc-text2":
        "2. குக்கீகள்: விருப்பங்களை பராமரிக்க குக்கீகளை பயன்படுத்துகிறோம்.",
      "tc-text3": "3. AI செயலாக்கம்: AI மூலம் கேள்விகள் செயலாக்கப்படும்.",
      "tc-text4":
        "4. வெளி இணைப்புகள்: அதிகாரப்பூர்வ தளங்களுக்கான இணைப்புகளை வழங்குகிறோம்.",
      "wiz-title": "ஸ்மார்ட் தகுதி வழிகாட்டி",
      "wiz-desc": "உங்கள் சுயவிவரத்தை தானாக நிரப்ப AI ஸ்கேனிங்.",
      "wiz-step1": "ஆவணம் ஸ்கேன்",
      "wiz-step2": "சுயவிவரம் சரிபார்க்கவும்",
      "wiz-step3": "திட்டங்களை காண்க",
      "wiz-upload": "அடையாள சரிபார்ப்பு",
      "wiz-upload-desc": "உங்கள் சுயவிவரத்தை நிரப்ப ஆவணத்தை பதிவேற்றவும்.",
      "wiz-click-upload": "ஆவணத்தை பதிவேற்ற கிளிக் செய்யவும்",
      "wiz-upload-help": "ஆதார், பான் அல்லது வாக்காளர் ஐடியை ஆதரிக்கிறது",
      "wiz-btn-next": "தொடரவும்",
      "wiz-verify-title": "உங்கள் விவரங்களை சரிபார்க்கவும்",
      "wiz-verify-desc": "தரவை மதிப்பாய்வு செய்து தகவலை நிரப்பவும்.",
      "wiz-fullname": "முழு பெயர்",
      "wiz-dob": "பிறந்த தேதி",
      "wiz-gender": "பாலினம்",
      "wiz-category": "சமூக வகை",
      "wiz-income": "ஆண்டு வருமானம்",
      "wiz-btn-back": "பின்னோக்கி",
      "wiz-btn-evaluate": "திட்டங்களை மதிப்பிடுக",
      "wiz-success": "தகுதி பகுப்பாய்வு முடிந்தது",
      "wiz-match-score": "மதிப்பெண்",
      "wiz-reason": "காரணம்",
      "btn-start-wizard": "AI வழிகாட்டியைத் தொடங்கவும்",
    },
  } as Record<string, Record<string, string>>,
};

// ==========================================
// 3.5 CUSTOM RULE-BASED AI ENGINE (In-House RAG)
// ==========================================
const generateAIResponse = (
  query: string,
  lang: Language,
  t: (k: string) => string,
): string => {
  const cleanQ = query.toLowerCase().trim();

  if (cleanQ.match(/\b(hi|hello|hey|help|start|namaste|hi there)\b/)) {
    return t("t-chat-welcome");
  }

  // Handle specific contextual wizard queries
  if (
    cleanQ.includes("wizard") ||
    cleanQ.includes("smart") ||
    cleanQ.includes("eligibility")
  ) {
    return `To use the Smart Eligibility Wizard, please return to the main gateway and click "Start AI Wizard". It will securely scan your document and recommend schemes based on your profile!`;
  }

  for (const s of MOCK_DB.services) {
    const nameEn = s.name.en.toLowerCase();
    const id = s.id.toLowerCase();
    const tokens = nameEn.split(" ");
    let match = false;

    if (cleanQ.includes(nameEn) || cleanQ.includes(id)) {
      match = true;
    } else {
      for (const token of tokens) {
        if (token.length > 3 && cleanQ.includes(token)) {
          match = true;
          break;
        }
      }
    }

    if (match) {
      const sName = s.name[lang] || s.name.en;
      const sTime = s.meta.time[lang] || s.meta.time.en;
      const sCost = s.meta.cost[lang] || s.meta.cost.en;
      const steps = s.steps[lang] || s.steps.en;

      let res = `<strong>${sName}</strong><br/>`;
      res += `<em><small>${t("t-time")}: ${sTime} | ${t("t-cost")}: ${sCost}</small></em><br/><br/>`;
      res += `<strong>${t("t-procedure-title")}:</strong><br/><ul style="margin-left:20px; margin-top:10px; display:flex; flex-direction:column; gap:8px;">`;
      steps.forEach((step, idx) => {
        res += `<li><strong>${t("t-step-label")} ${idx + 1}:</strong> ${step}</li>`;
      });
      res += `</ul>`;
      if (s.url)
        res += `<br/><a href="${s.url}" target="_blank" class="official-link-btn" style="display:inline-block; margin-top:10px; padding:8px 16px; background:var(--brand-saffron); color:#fff; border-radius:30px; font-weight:600; text-decoration:none;">${t("btn-apply")} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
      res += `<br/><br/><small style="color:var(--brand-saffron)">${t("t-chat-disclaimer")}</small>`;
      return res;
    }
  }

  for (const c of MOCK_DB.categories) {
    const catEn = c.name.en.toLowerCase();
    if (cleanQ.includes(catEn) || cleanQ.includes(c.id.toLowerCase())) {
      let res = `Here are schemes for <strong>${c.name[lang] || c.name.en}</strong>:<br/><br/><ul style="margin-left:20px; display:flex; flex-direction:column; gap:10px;">`;
      c.schemes.forEach((sch) => {
        res += `<li><strong>${sch.title[lang] || sch.title.en}</strong>: ${sch.benefit} <br/><a href="${sch.url}" target="_blank" style="color:var(--brand-blue); text-decoration:underline;">${t("btn-apply")}</a></li>`;
      });
      res += `</ul><br/><small style="color:var(--brand-saffron)">${t("t-chat-disclaimer")}</small>`;
      return res;
    }
  }

  return "I’m sorry, that request is outside of our policy and domain expertise. Please try asking about Aadhaar, PAN, Voter ID, or farmer schemes.";
};

// ==========================================
// 4. API-FIRST ARCHITECTURE (With Resiliency)
// ==========================================
const apiCache = new Map<string, any>();

const fetchWithRetry = async <T,>(
  endpoint: string,
  options: { retries?: number; timeout?: number; method?: string } = {},
): Promise<T> => {
  const retries = options.retries ?? 2;
  const timeout = options.timeout ?? 5000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                "408 Request Timeout: The server took too long to respond.",
              ),
            ),
          timeout,
        );
        setTimeout(() => {
          clearTimeout(timer);
          if (endpoint.includes("/v1/services"))
            resolve(MOCK_DB.services as any);
          else if (endpoint.includes("/v1/categories"))
            resolve(MOCK_DB.categories as any);
          else reject(new Error("404 Not Found"));
        }, 300);
      });
    } catch (error: any) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("API Failure");
};

const apiService = {
  getServices: async (): Promise<GovernmentService[]> => {
    if (apiCache.has("v1_services")) return apiCache.get("v1_services");
    const data = await fetchWithRetry<GovernmentService[]>("/api/v1/services");
    apiCache.set("v1_services", data);
    return data;
  },
  getCategories: async (): Promise<Category[]> => {
    if (apiCache.has("v1_categories")) return apiCache.get("v1_categories");
    const data = await fetchWithRetry<Category[]>("/api/v1/categories");
    apiCache.set("v1_categories", data);
    return data;
  },
};

// ==========================================
// 5. GLOBAL CONTEXTS (Separation of Concerns)
// ==========================================
interface AppContextType {
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  showToast: (msg: string, icon?: string) => void;
  t: (key: string) => string;
  chatHistory: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  isChatOpen: boolean;
  setChatOpen: (b: boolean) => void;
  termsAccepted: boolean;
  setTermsAccepted: (b: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

// ==========================================
// 6. ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "3rem", textAlign: "center", color: "#EF4444" }}>
          <h2>Application Error</h2>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Skeleton = ({
  width = "100%",
  height = "20px",
  borderRadius = "4px",
  className = "",
  style = {},
}: any) => (
  <div
    className={`skeleton-loader ${className}`}
    style={{ width, height, borderRadius, ...style }}
    aria-hidden="true"
  />
);

// ==========================================
// 7. UI COMPONENTS
// ==========================================

const LegalFooter = () => (
  <footer className="mandatory-legal-footer">
    <div className="container">
      <p>
        <strong>Disclaimer:</strong> This website is for informational and
        personal project purposes only. This platform is currently in
        development and may contain inaccuracies. Please verify all information
        independently through official government channels. We are not liable
        for errors or omissions.
      </p>
    </div>
  </footer>
);

const Navbar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    lang,
    setLang,
    appMode,
    setAppMode,
    setChatOpen,
  } = useAppContext();
  return (
    <header className="navbar">
      <div className="nav-container">
        <a
          href="#"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            setAppMode("gateway");
            setChatOpen(false);
          }}
        >
          <img
            src="logo.png"
            alt="Sahayak Setu Logo"
            className="brand-logo-small"
            width="44"
            height="44"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src =
                "https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg";
            }}
          />
          Sahayak Setu
        </a>
        <div className="nav-actions">
          {appMode !== "home" && (
            <button className="nav-text-btn" onClick={() => setAppMode("home")}>
              Home <i className="fa-solid fa-house"></i>
            </button>
          )}
          {appMode !== "wizard" && (
            <button
              className="nav-text-btn"
              onClick={() => setAppMode("wizard")}
            >
              Wizard <i className="fa-solid fa-wand-magic-sparkles"></i>
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="icon-btn"
            aria-label="Toggle Theme"
          >
            <i
              className={`fa-solid ${theme === "light" ? "fa-moon" : "fa-sun"}`}
            ></i>
          </button>
          <div className="lang-switcher">
            <i className="fa-solid fa-globe"></i>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              aria-label="Select Language"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

// ==========================================
// 8. T&C AND GATEWAY MODULE
// ==========================================
const Gateway: React.FC = () => {
  const { setAppMode, termsAccepted, setTermsAccepted, t, theme } =
    useAppContext();

  if (!termsAccepted) {
    return (
      <div className={`tc-overlay ${theme}`}>
        <div className="tc-modal">
          <div className="tc-header">
            <i className="fa-solid fa-shield-halved"></i>
            <h2>{t("tc-title")}</h2>
            <p>{t("tc-desc")}</p>
          </div>
          <div className="tc-body">
            <p>
              <strong>
                <i className="fa-solid fa-user-lock"></i> {t("tc-text1")}
              </strong>
            </p>
            <p>{t("tc-text2")}</p>
            <p>{t("tc-text3")}</p>
            <p>{t("tc-text4")}</p>
          </div>
          <div className="tc-footer">
            <button
              className="tc-btn-accept"
              onClick={() => setTermsAccepted(true)}
            >
              <i className="fa-solid fa-file-signature"></i> {t("tc-accept")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gateway-overlay">
      <div className="gateway-content">
        <img
          src="logo.png"
          alt="Sahayak Setu"
          className="gateway-logo"
          onError={(e) => {
            e.currentTarget.src =
              "https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg";
          }}
        />
        <h1>Welcome to Sahayak Setu</h1>
        <p>How would you like to explore government services today?</p>

        <div className="gateway-buttons">
          <button
            className="gateway-btn primary"
            onClick={() => setAppMode("wizard")}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>{t("btn-start-wizard")}</span>
            <small>Auto-fill and find schemes instantly</small>
          </button>
          <button
            className="gateway-btn secondary"
            onClick={() => setAppMode("home")}
          >
            <i className="fa-solid fa-table-cells-large"></i>
            <span>Self-Service Homepage</span>
            <small>Browse all services manually</small>
          </button>
          <button
            className="gateway-btn secondary"
            onClick={() => setAppMode("chat")}
          >
            <i className="fa-solid fa-robot"></i>
            <span>AI Assistant Chat</span>
            <small>Ask queries directly</small>
          </button>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
};

// ==========================================
// 9. ML ELIGIBILITY WIZARD MODULE
// ==========================================
const WizardMode: React.FC = () => {
  const { t, lang } = useAppContext();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    dob: "",
    gender: "Male",
    category: "General",
    annualIncome: "",
    aadhaarLast4: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserProfile, string>>
  >({});

  const [scanState, setScanState] = useState<"idle" | "scanning" | "complete">(
    "idle",
  );
  const [scanProgress, setScanProgress] = useState(0);

  const handleSimulatedScan = () => {
    setScanState("scanning");
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setScanState("complete");
          setProfile((prev) => ({
            ...prev,
            fullName: "Arjun Kumar",
            dob: "1982-08-15",
            aadhaarLast4: "4921",
          }));
          return 100;
        }
        return p + 5;
      });
    }, 100);
  };

  const validateAndProceed = () => {
    const newErrors: any = {};
    if (!profile.fullName || profile.fullName.length < 3)
      newErrors.fullName = "Valid name required";
    if (!profile.dob) newErrors.dob = "DOB is required";
    if (!profile.annualIncome) newErrors.annualIncome = "Income is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      setErrors({});
      setStep(3);
    }
  };

  const formatCurrency = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? Number(num).toLocaleString("en-IN") : "";
  };

  return (
    <main className="container wizard-container animate-fade-in">
      {/* Wizard Header / Progress */}
      <div className="wizard-progress-bar">
        <div className="wizard-progress-track">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(step - 1) * 50}%` }}
          ></div>
        </div>
        <div className="wizard-steps-container">
          {[
            { num: 1, label: t("wiz-step1") },
            { num: 2, label: t("wiz-step2") },
            { num: 3, label: t("wiz-step3") },
          ].map((s) => (
            <div key={s.num} className="wizard-step-indicator">
              <div
                className={`wizard-step-circle ${step >= s.num ? "active" : ""}`}
              >
                {step > s.num ? <i className="fa-solid fa-check"></i> : s.num}
              </div>
              <span
                className={`wizard-step-label ${step >= s.num ? "active-text" : ""}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: OCR SCAN */}
      {step === 1 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <h2>{t("wiz-upload")}</h2>
            <p>{t("wiz-upload-desc")}</p>
          </div>
          <div className="wizard-card-body centered">
            {scanState === "idle" && (
              <div className="ocr-upload-box" onClick={handleSimulatedScan}>
                <i className="fa-solid fa-cloud-arrow-up upload-icon"></i>
                <h3>{t("wiz-click-upload")}</h3>
                <p>{t("wiz-upload-help")}</p>
                <div className="ocr-secure-badge">
                  <i className="fa-solid fa-lock"></i> End-to-end encrypted
                </div>
              </div>
            )}
            {scanState === "scanning" && (
              <div className="ocr-scanner-active">
                <i className="fa-solid fa-expand scanner-icon fa-pulse"></i>
                <div className="scanner-progress-wrapper">
                  <div
                    className="scanner-progress-bar"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <p>Extracting data using AI Vision Engine...</p>
              </div>
            )}
            {scanState === "complete" && (
              <div className="ocr-success">
                <i className="fa-solid fa-circle-check success-icon"></i>
                <h3>Extraction Successful</h3>
                <button
                  className="wizard-btn-primary"
                  onClick={() => setStep(2)}
                >
                  {t("wiz-btn-next")}{" "}
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: VERIFY FORM */}
      {step === 2 && (
        <div className="wizard-card slide-in-right">
          <div className="wizard-card-header">
            <h2>{t("wiz-verify-title")}</h2>
            <p>{t("wiz-verify-desc")}</p>
          </div>
          <div className="wizard-card-body">
            <div className="wizard-form-grid">
              <div className="form-group">
                <label>{t("wiz-fullname")}</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) =>
                    setProfile({ ...profile, fullName: e.target.value })
                  }
                  className={`form-control ${errors.fullName ? "error" : ""}`}
                />
              </div>
              <div className="form-group">
                <label>{t("wiz-dob")}</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="date"
                    value={profile.dob}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setProfile({ ...profile, dob: e.target.value })
                    }
                    className={`form-control ${errors.dob ? "error" : ""}`}
                  />
                  <div className="age-display">
                    <strong>{calculateAge(profile.dob) || "-"}</strong>
                    <small>YRS</small>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>{t("wiz-gender")}</label>
                <select
                  value={profile.gender}
                  onChange={(e) =>
                    setProfile({ ...profile, gender: e.target.value })
                  }
                  className="form-control"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t("wiz-category")}</label>
                <select
                  value={profile.category}
                  onChange={(e) =>
                    setProfile({ ...profile, category: e.target.value })
                  }
                  className="form-control"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
            </div>

            <div className="form-group income-group">
              <label>
                <i className="fa-solid fa-circle-info"></i> {t("wiz-income")}{" "}
                (₹)
              </label>
              <input
                type="text"
                value={profile.annualIncome}
                placeholder="e.g. 2,50,000"
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    annualIncome: formatCurrency(e.target.value),
                  })
                }
                className={`form-control income-input ${errors.annualIncome ? "error" : ""}`}
              />
            </div>
          </div>
          <div className="wizard-card-footer">
            <button className="wizard-btn-secondary" onClick={() => setStep(1)}>
              {t("wiz-btn-back")}
            </button>
            <button className="wizard-btn-primary" onClick={validateAndProceed}>
              {t("wiz-btn-evaluate")}{" "}
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && (
        <div className="wizard-results-view slide-in-right">
          <div className="results-hero">
            <i className="fa-solid fa-trophy"></i>
            <h2>{t("wiz-success")}</h2>
            <p>
              We found optimal schemes based on your profile (Age:{" "}
              {calculateAge(profile.dob)}, Income: ₹{profile.annualIncome}).
            </p>
          </div>
          <div className="results-grid">
            {MOCK_DB.categories
              .flatMap((c) => c.schemes)
              .map((scheme, idx) => {
                if (!scheme.evaluate) return null;
                const match = scheme.evaluate(profile);
                if (match.score < 20) return null;

                return (
                  <div key={idx} className="result-match-card">
                    <div
                      className={`match-strip ${match.score > 80 ? "high" : "medium"}`}
                    ></div>
                    <div className="match-card-layout">
                      <div className="match-score-section">
                        <div className="score-circle">
                          <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              fill="none"
                              stroke="var(--border-light)"
                              strokeWidth="6"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              fill="none"
                              stroke={
                                match.score > 80
                                  ? "var(--brand-green)"
                                  : "var(--brand-saffron)"
                              }
                              strokeWidth="6"
                              strokeDasharray={2 * Math.PI * 36}
                              strokeDashoffset={
                                2 * Math.PI * 36 * (1 - match.score / 100)
                              }
                              transform="rotate(-90 40 40)"
                            />
                          </svg>
                          <span className="score-text">{match.score}%</span>
                        </div>
                        <span className="score-label">
                          {t("wiz-match-score")}
                        </span>
                      </div>
                      <div className="match-content-section">
                        <h3>{scheme.title[lang] || scheme.title.en}</h3>
                        <p className="scheme-desc">
                          {scheme.desc[lang] || scheme.desc.en}
                        </p>
                        <div className="scheme-benefit-box">
                          <i className="fa-solid fa-check-circle"></i>{" "}
                          <span>{scheme.benefit}</span>
                        </div>
                        <div className="match-footer">
                          <small>
                            <strong>{t("wiz-reason")}:</strong> {match.reason}
                          </small>
                          <a
                            href={scheme.url}
                            target="_blank"
                            rel="noreferrer"
                            className="wizard-btn-primary small"
                          >
                            Apply Now
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </main>
  );
};

// ==========================================
// 10. CHATBOX & VOICE INTEGRATION
// ==========================================
const ChatBox: React.FC<{ isFullScreen?: boolean }> = ({
  isFullScreen = false,
}) => {
  const { chatHistory, addMessage, lang, t, showToast } = useAppContext();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = () => {
    if (!input.trim()) return;
    const cleanInput = sanitizeInput(input);

    addMessage({ id: Date.now().toString(), role: "user", text: cleanInput });
    setInput("");

    // Simulate AI network delay
    setTimeout(() => {
      const responseHtml = generateAIResponse(cleanInput, lang, t);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: responseHtml,
        isHtml: true,
      });
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice AI - Speech to Text
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return showToast(
        "Voice recognition not supported in this browser",
        "fa-triangle-exclamation",
      );
    }
    const recognition = new SpeechRecognition();
    recognition.lang =
      lang === "hi"
        ? "hi-IN"
        : lang === "bn"
          ? "bn-IN"
          : lang === "ta"
            ? "ta-IN"
            : "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      showToast("Could not recognize voice", "fa-microphone-slash");
    };
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  // Voice AI - Text to Speech
  const speakText = (htmlText: string) => {
    // Strip HTML tags for clean reading
    const cleanText = htmlText.replace(/<[^>]*>?/gm, "");
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
    synth.speak(utterance);
  };

  return (
    <div
      className={`chat-box-container ${isFullScreen ? "fullscreen" : "drawer"}`}
    >
      <div className="chat-messages" ref={scrollRef}>
        {chatHistory.length === 0 && (
          <div className="chat-empty-state">
            <i className="fa-solid fa-robot"></i>
            <h3>{t("t-chat-welcome")}</h3>
          </div>
        )}
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`chat-bubble-wrapper ${msg.role}`}>
            {msg.role === "ai" && (
              <div className="chat-avatar">
                <i className="fa-solid fa-robot"></i>
              </div>
            )}
            <div className="chat-bubble">
              {msg.isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              ) : (
                msg.text
              )}
              {msg.role === "ai" && (
                <button
                  onClick={() => speakText(msg.text)}
                  className="tts-btn"
                  title="Read Aloud"
                >
                  <i className="fa-solid fa-volume-high"></i>
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="chat-avatar user">
                <i className="fa-solid fa-user"></i>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <button
          onClick={handleVoiceInput}
          className={`mic-btn ${isRecording ? "recording" : ""}`}
          title="Speak (Voice to Text)"
        >
          <i className="fa-solid fa-microphone"></i>
        </button>
        <textarea
          placeholder={t("t-chat-input-placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="send-btn"
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

const FloatingChat: React.FC = () => {
  const { isChatOpen, setChatOpen } = useAppContext();

  return (
    <>
      <button
        className={`fab-btn ${isChatOpen ? "active" : ""}`}
        onClick={() => setChatOpen(!isChatOpen)}
        aria-label="Toggle AI Assistant"
      >
        <i className={`fa-solid ${isChatOpen ? "fa-times" : "fa-robot"}`}></i>
      </button>

      {isChatOpen && (
        <div className="chat-drawer-overlay">
          <ChatBox isFullScreen={false} />
        </div>
      )}
    </>
  );
};

const Hero: React.FC = () => {
  const { t } = useAppContext();
  return (
    <section className="hero">
      <div className="hero-content">
        <img
          src="logo.png"
          alt="Sahayak Setu Emblem"
          className="hero-logo"
          width="140"
          height="140"
          onError={(e) => {
            e.currentTarget.src =
              "https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg";
          }}
          {...({ fetchpriority: "high" } as any)}
        />
        <div className="badge">
          <span className="badge-pulse"></span>
          <span>{t("t-hero-badge")}</span>
        </div>
        <h1>{t("t-hero-title")}</h1>
        <p>{t("t-hero-desc")}</p>
      </div>
    </section>
  );
};

const ServicesSection: React.FC = () => {
  const { t, lang } = useAppContext();
  const [services, setServices] = useState<GovernmentService[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const [serviceSearch, setServiceSearch] = useState("");
  const [deferredServiceSearch, setDeferredServiceSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    apiService.getServices().then((data) => {
      if (!isMounted) return;
      setServices(data);
      if (data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeInput(e.target.value);
    setServiceSearch(val);
    startTransition(() => {
      setDeferredServiceSearch(val);
    });
  };

  const filteredServices = useMemo(() => {
    if (!deferredServiceSearch.trim()) return services;
    const lowerSearch = deferredServiceSearch.toLowerCase();
    return services.filter(
      (s) =>
        (s.name[lang] || s.name.en).toLowerCase().includes(lowerSearch) ||
        s.name.en.toLowerCase().includes(lowerSearch),
    );
  }, [services, deferredServiceSearch, lang]);

  useEffect(() => {
    if (filteredServices.length > 0 && deferredServiceSearch.trim() !== "") {
      setSelectedId(filteredServices[0].id);
    }
  }, [filteredServices, deferredServiceSearch]);

  const activeService =
    services.find((s) => s.id === selectedId) || filteredServices[0];

  const howToSchema = useMemo(() => {
    if (!activeService) return null;
    return {
      "@type": "HowTo",
      name: activeService.name[lang] || activeService.name.en,
      description: `Step-by-step guide to ${activeService.name[lang] || activeService.name.en}`,
      step: (activeService.steps[lang] || activeService.steps.en || []).map(
        (step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: step,
        }),
      ),
    };
  }, [activeService, lang]);

  useDynamicSEO(
    activeService
      ? activeService.name[lang] || activeService.name.en
      : t("t-sec1-title"),
    t("t-hero-desc"),
    howToSchema,
  );

  if (loading) {
    return (
      <article className="section-card" aria-busy="true">
        <header className="section-header">
          <div className="section-header-icon">
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
          <h2>{t("t-sec1-title")}</h2>
        </header>
        <div className="services-grid">
          <div className="service-controls">
            <Skeleton height="85px" borderRadius="8px" />
          </div>
          <div className="timeline-container">
            <Skeleton
              height="24px"
              width="200px"
              style={{ marginBottom: "1.5rem" }}
            />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "16px", marginBottom: "1.5rem" }}
              >
                <Skeleton height="16px" width="16px" borderRadius="50%" />
                <Skeleton height="20px" width="80%" />
              </div>
            ))}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="section-card"
      aria-labelledby="t-sec1-title"
      id="services-guide"
    >
      <header className="section-header">
        <div className="section-header-icon">
          <i className="fa-solid fa-clipboard-check"></i>
        </div>
        <h2 id="t-sec1-title">{t("t-sec1-title")}</h2>
      </header>

      <div className="services-grid">
        <div className="service-controls">
          <div className="service-selector-group">
            <label className="control-label-sm" id="select-service-lbl">
              {t("t-select-service")}
            </label>

            <div
              className="search-wrapper"
              style={{ marginBottom: "8px", zIndex: 3 }}
            >
              <i
                className="fa-solid fa-search"
                style={{ fontSize: "0.85rem" }}
              ></i>
              <input
                type="text"
                className="search-input"
                style={{
                  minHeight: "38px",
                  padding: "8px 12px 8px 36px",
                  fontSize: "0.9rem",
                  borderRadius: "var(--radius-sm)",
                }}
                placeholder={t("t-search-services")}
                value={serviceSearch}
                onChange={handleSearchChange}
              />
              {isPending && (
                <i
                  className="fa-solid fa-spinner fa-spin"
                  style={{
                    position: "absolute",
                    right: "12px",
                    left: "auto",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.85rem",
                  }}
                ></i>
              )}
            </div>

            <div className="service-select-box">
              {filteredServices.length === 0 ? (
                <div
                  style={{
                    padding: "12px 14px",
                    fontSize: "0.95rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {t("t-empty")}
                </div>
              ) : (
                <select
                  className="styled-select-bare"
                  value={activeService?.id || ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                  aria-labelledby="select-service-lbl"
                >
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name[lang] || s.name.en}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeService && (
              <div className="service-meta-row">
                <div className="meta-cell">
                  <i
                    className="fa-regular fa-clock"
                    style={{ color: "var(--brand-saffron)" }}
                    aria-hidden="true"
                  ></i>
                  <span>
                    {activeService.meta.time[lang] ||
                      activeService.meta.time.en}
                  </span>
                </div>
                <div className="meta-cell">
                  <i
                    className="fa-solid fa-indian-rupee-sign"
                    style={{ color: "var(--brand-saffron)" }}
                    aria-hidden="true"
                  ></i>
                  <span>
                    {activeService.meta.cost[lang] ||
                      activeService.meta.cost.en}
                  </span>
                </div>
              </div>
            )}
          </div>

          {activeService && (
            <>
              <div className="service-docs-card">
                <label className="control-label-sm">{t("t-key-docs")}</label>
                <div className="doc-item">
                  <i
                    className="fa-regular fa-file-lines"
                    style={{ color: "var(--brand-saffron)" }}
                    aria-hidden="true"
                  ></i>
                  <span>
                    {activeService.meta.docs[lang] ||
                      activeService.meta.docs.en}
                  </span>
                </div>
              </div>

              {activeService.url && (
                <a
                  href={activeService.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="official-link"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "1rem",
                    background: "var(--brand-saffron)",
                    color: "#fff",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {t("btn-apply")}{" "}
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              )}
            </>
          )}
        </div>

        <div className="timeline-container">
          {activeService ? (
            <>
              <h3
                style={{
                  marginBottom: "1.5rem",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {t("t-procedure-title")}
              </h3>
              <ul className="custom-timeline" aria-live="polite">
                {(
                  activeService.steps[lang] ||
                  activeService.steps["en"] ||
                  []
                ).map((step, idx) => (
                  <li
                    key={idx}
                    className="custom-timeline-item"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <span className="step-label">
                      {t("t-step-label")} {idx + 1}:
                    </span>{" "}
                    {step}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="empty-state">
              <i className="fa-solid fa-search"></i>
              <p>{t("t-empty")}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

const SchemeCard = React.memo(
  ({
    scheme,
    index,
    onCopy,
  }: {
    scheme: Scheme;
    index: number;
    onCopy: (url: string) => void;
  }) => {
    const { t, lang } = useAppContext();
    return (
      <div
        className="scheme-card"
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        <div className="scheme-header">
          <h3>{scheme.title[lang] || scheme.title.en}</h3>
          <button
            className="share-btn"
            onClick={() => onCopy(scheme.url)}
            aria-label="Share Link"
            title="Copy Link"
          >
            <i className="fa-solid fa-link"></i>
          </button>
        </div>
        <p className="scheme-desc">{scheme.desc[lang] || scheme.desc.en}</p>
        <div className="scheme-footer">
          <span className="benefit-tag">
            <i className="fa-solid fa-bolt"></i> {scheme.benefit}
          </span>
          <a
            href={scheme.url}
            target="_blank"
            rel="noopener noreferrer"
            className="official-link-btn text-link"
          >
            {t("btn-apply")} <i className="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      </div>
    );
  },
);
SchemeCard.displayName = "SchemeCard";

const BenefitsSection: React.FC = () => {
  const { t, lang, showToast } = useAppContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string>("agriculture");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [deferredSearch, setDeferredSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    apiService.getCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    startTransition(() => {
      setDeferredSearch(debouncedSearch);
    });
  }, [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(sanitizeInput(e.target.value));
  };

  const handleCopy = useCallback(
    (url: string) => {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast(t("toast-copy"), "fa-link"));
    },
    [showToast, t],
  );

  const filteredSchemes = useMemo(() => {
    if (!categories.length) return [];
    if (deferredSearch.trim()) {
      const lowerSearch = deferredSearch.toLowerCase();
      return categories
        .flatMap((c) => c.schemes)
        .filter(
          (s) =>
            (s.title[lang] || s.title.en).toLowerCase().includes(lowerSearch) ||
            (s.desc[lang] || s.desc.en).toLowerCase().includes(lowerSearch),
        );
    }
    return categories.find((c) => c.id === activeCat)?.schemes || [];
  }, [categories, activeCat, deferredSearch, lang]);

  if (loading) {
    return (
      <article className="section-card" aria-busy="true">
        <header className="section-header">
          <div className="section-header-icon">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <h2>{t("t-sec2-title")}</h2>
        </header>
        <div className="benefits-layout">
          <aside>
            <Skeleton
              height="48px"
              borderRadius="24px"
              style={{ marginBottom: "1.5rem" }}
            />
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="48px" borderRadius="8px" />
              ))}
            </div>
          </aside>
          <div className="schemes-grid">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="200px" borderRadius="12px" />
            ))}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="section-card" id="benefits-explorer">
      <header className="section-header">
        <div className="section-header-icon">
          <i className="fa-solid fa-hand-holding-dollar"></i>
        </div>
        <h2>{t("t-sec2-title")}</h2>
      </header>
      <div className="benefits-layout">
        <aside>
          <div className="search-wrapper">
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              className="search-input"
              placeholder={t("t-search")}
              value={search}
              onChange={handleSearchChange}
            />
            {isPending && (
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{
                  position: "absolute",
                  right: "16px",
                  left: "auto",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              ></i>
            )}
          </div>
          <nav className="category-sidebar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`cat-btn ${activeCat === cat.id && !deferredSearch ? "active" : ""}`}
                onClick={() => {
                  setActiveCat(cat.id);
                  setSearch("");
                  setDeferredSearch("");
                }}
              >
                <i className={`fa-solid ${cat.icon}`}></i>{" "}
                <span>{cat.name[lang] || cat.name.en}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="schemes-grid">
          {filteredSchemes.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-folder-open"></i>
              <p>{t("t-empty")}</p>
            </div>
          ) : (
            filteredSchemes.map((scheme, idx) => (
              <SchemeCard
                key={`${scheme.url}-${idx}`}
                scheme={scheme}
                index={idx}
                onCopy={handleCopy}
              />
            ))
          )}
        </div>
      </div>
    </article>
  );
};

const AsyncServicesSection = React.lazy(
  () =>
    new Promise<{ default: React.FC }>((resolve) =>
      setTimeout(() => resolve({ default: ServicesSection }), 300),
    ),
);
const AsyncBenefitsSection = React.lazy(
  () =>
    new Promise<{ default: React.FC }>((resolve) =>
      setTimeout(() => resolve({ default: BenefitsSection }), 500),
    ),
);

// ==========================================
// 11. ROOT APPLICATION COMPONENT & STYLES
// ==========================================
export default function App() {
  const [appMode, setAppModeState] = useState<AppMode>("gateway");
  const [lang, setLangState] = useState<Language>(CONFIG.defaultLang);
  const [theme, setThemeState] = useState<Theme>(CONFIG.defaultTheme);
  const [toast, setToast] = useState<{
    msg: string;
    icon: string;
    id: number;
  } | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatOpen, setChatOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const addMessage = useCallback((msg: ChatMessage) => {
    setChatHistory((prev) => [...prev, msg]);
  }, []);

  const GlobalStyles = () => (
    <style>{`
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700;800&display=swap');
      
      :root {
        --bg-base: #F8FAFC; --bg-surface: #FFFFFF; --bg-surface-hover: #F1F5F9;
        --text-primary: #0F172A; --text-secondary: #475569; --text-muted: #94A3B8;
        --border-light: #E2E8F0; --border-strong: #CBD5E1;
        --brand-blue: #1E3A5F; --brand-saffron: #FF9933; --brand-saffron-light: rgba(255, 153, 51, 0.1);
        --brand-green: #138808; --brand-green-light: #DCFCE7;
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
        --shadow-glow: 0 0 0 3px rgba(255, 153, 51, 0.3);
        --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px; --radius-full: 9999px;
        --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      [data-theme="dark"] {
        --bg-base: #0A0A0A; --bg-surface: #141414; --bg-surface-hover: #1F1F1F;
        --text-primary: #F5F5F5; --text-secondary: #A3A3A3; --text-muted: #737373;
        --border-light: #262626; --border-strong: #404040;
        --brand-blue: #3B82F6; --brand-saffron-light: rgba(255, 153, 51, 0.15); --brand-green-light: rgba(19, 136, 8, 0.15);
        --shadow-sm: 0 1px 2px rgba(0,0,0,0.8); --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.6); --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.7);
        --shadow-glow: 0 0 0 3px rgba(255, 153, 51, 0.5);
      }
      @media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }
      
      html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow-x: hidden; text-align: left; }
      #root { display: flex; flex-direction: column; min-height: 100vh; }
      
      body { font-family: 'Inter', sans-serif; background-color: var(--bg-base); color: var(--text-secondary); line-height: 1.6; transition: background-color 0.3s ease, color 0.3s ease; }
      h1, h2, h3, h4 { font-family: 'Poppins', sans-serif; color: var(--text-primary); line-height: 1.2; text-wrap: balance; }
      button { border: none; background: none; font-family: inherit; cursor: pointer; }
      *:focus-visible { outline: 3px solid var(--brand-saffron); outline-offset: 2px; border-radius: 4px; }
      
      .main-wrapper { flex: 1; padding-top: 80px; display: flex; flex-direction: column; }
      .container { width: 100%; max-width: 1536px; margin: 0 auto; padding: 1.5rem 1rem; }
      @media (min-width: 768px) { .container { padding: 2rem 1.5rem; } }
      
      /* Gateway & T&C */
      .tc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
      .tc-modal { background: var(--bg-surface); border-radius: var(--radius-lg); width: 100%; max-width: 600px; overflow: hidden; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      .tc-header { background: var(--brand-blue); padding: 2rem; text-align: center; color: white; }
      .tc-header i { font-size: 3rem; color: var(--brand-saffron); margin-bottom: 1rem; }
      .tc-header h2 { color: white; margin-bottom: 0.5rem; }
      .tc-header p { color: rgba(255,255,255,0.8); font-size: 0.9rem; }
      .tc-body { padding: 2rem; max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; font-size: 0.95rem; color: var(--text-secondary); }
      .tc-footer { padding: 1.5rem 2rem; border-top: 1px solid var(--border-light); background: var(--bg-surface-hover); text-align: center; }
      .tc-btn-accept { width: 100%; background: var(--brand-saffron); color: white; padding: 1rem; border-radius: var(--radius-md); font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: var(--transition); }
      .tc-btn-accept:hover { background: #E68A2E; transform: translateY(-2px); box-shadow: var(--shadow-md); }

      .gateway-overlay { position: fixed; inset: 0; background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-base) 100%); z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; overflow-y: auto; }
      .gateway-content { text-align: center; max-width: 800px; width: 100%; padding: 2rem; background: var(--bg-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); margin-bottom: 2rem; }
      .gateway-logo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 1.5rem; box-shadow: var(--shadow-md); border: 4px solid var(--bg-base); }
      .gateway-content h1 { font-size: 2rem; margin-bottom: 1rem; }
      .gateway-content p { color: var(--text-secondary); margin-bottom: 2.5rem; font-size: 1.1rem; }
      .gateway-buttons { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
      .gateway-btn { padding: 1.5rem; border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: var(--transition); text-decoration: none; border: 2px solid transparent; }
      .gateway-btn i { font-size: 2rem; margin-bottom: 0.5rem; }
      .gateway-btn span { font-weight: 700; font-size: 1.1rem; font-family: 'Poppins', sans-serif; }
      .gateway-btn small { font-size: 0.85rem; opacity: 0.8; }
      .gateway-btn.primary { background: var(--brand-saffron); color: #fff; }
      .gateway-btn.primary:hover { background: #E68A2E; transform: translateY(-4px); box-shadow: var(--shadow-md); }
      .gateway-btn.secondary { background: var(--bg-base); color: var(--text-primary); border-color: var(--border-strong); }
      .gateway-btn.secondary:hover { background: var(--bg-surface-hover); border-color: var(--brand-blue); transform: translateY(-4px); box-shadow: var(--shadow-md); color: var(--brand-blue); }
      
      /* Chat Interface */
      .chat-box-container { display: flex; flex-direction: column; background: var(--bg-surface); border: 1px solid var(--border-light); }
      .chat-box-container.fullscreen { flex: 1; max-width: 1000px; margin: 0 auto; width: 100%; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); margin-top: 1rem; margin-bottom: 2rem; height: calc(100vh - 200px); }
      .chat-box-container.drawer { width: 100%; height: 100%; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); }
      
      .chat-messages { flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; }
      .chat-empty-state { text-align: center; margin: auto 0; color: var(--text-muted); }
      .chat-empty-state i { font-size: 3rem; margin-bottom: 1rem; color: var(--border-strong); }
      .chat-empty-state h3 { font-size: 1.2rem; font-weight: 500; }
      
      .chat-bubble-wrapper { display: flex; gap: 12px; max-width: 85%; }
      .chat-bubble-wrapper.ai { align-self: flex-start; }
      .chat-bubble-wrapper.user { align-self: flex-end; flex-direction: row-reverse; }
      .chat-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand-saffron-light); color: var(--brand-saffron); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .chat-avatar.user { background: var(--brand-blue); color: #fff; }
      .chat-bubble { padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.5; color: var(--text-primary); position: relative; }
      .chat-bubble-wrapper.ai .chat-bubble { background: var(--bg-base); border: 1px solid var(--border-light); border-top-left-radius: 4px; }
      .chat-bubble-wrapper.user .chat-bubble { background: var(--brand-blue); color: #fff; border-top-right-radius: 4px; }
      .chat-bubble a { color: inherit; text-decoration: underline; font-weight: 600; }
      .tts-btn { position: absolute; right: -30px; bottom: 0; color: var(--brand-blue); background: var(--brand-saffron-light); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: var(--transition); }
      .tts-btn:hover { background: var(--brand-saffron); color: white; }

      .chat-input-area { display: flex; gap: 10px; padding: 1rem; border-top: 1px solid var(--border-light); background: var(--bg-surface); border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg); align-items: center; }
      .mic-btn { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-base); border: 1px solid var(--border-strong); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; transition: var(--transition); flex-shrink: 0;}
      .mic-btn:hover { color: var(--brand-blue); border-color: var(--brand-blue); }
      .mic-btn.recording { background: #FEE2E2; color: #EF4444; border-color: #EF4444; animation: pulseRed 1.5s infinite; }
      @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

      .chat-input-area textarea { flex: 1; padding: 12px 16px; border-radius: 24px; border: 1px solid var(--border-strong); background: var(--bg-base); color: var(--text-primary); font-family: 'Inter', sans-serif; resize: none; outline: none; transition: var(--transition); }
      .chat-input-area textarea:focus { border-color: var(--brand-saffron); box-shadow: var(--shadow-glow); }
      .chat-input-area .send-btn { width: 48px; height: 48px; border-radius: 50%; background: var(--brand-saffron); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: var(--transition); }
      .chat-input-area .send-btn:hover:not(:disabled) { background: #E68A2E; transform: scale(1.05); }
      .chat-input-area .send-btn:disabled { background: var(--border-strong); cursor: not-allowed; }
      
      /* Floating Chat Drawer */
      .fab-btn { position: fixed; bottom: 80px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: var(--brand-saffron); color: #fff; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-xl); z-index: 1000; transition: var(--transition); }
      .fab-btn:hover { transform: scale(1.1); }
      .fab-btn.active { background: var(--text-primary); }
      
      .chat-drawer-overlay { position: fixed; bottom: 150px; right: 20px; width: 350px; height: 500px; max-height: calc(100vh - 180px); max-width: calc(100vw - 40px); z-index: 1000; animation: slideUp 0.3s ease forwards; }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

      /* Mandatory Footer */
      .mandatory-legal-footer { background: var(--bg-surface-hover); border-top: 1px solid var(--border-light); padding: 1.5rem 1rem; text-align: center; margin-top: auto; }
      .mandatory-legal-footer p { font-size: 0.85rem; color: var(--text-muted); max-width: 1000px; margin: 0 auto; line-height: 1.6; }
      .mandatory-legal-footer strong { color: var(--text-primary); }

      /* Navbar */
      .navbar { position: fixed; top: 0; left: 0; width: 100%; background: rgba(var(--bg-surface), 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-light); z-index: 1000; transition: var(--transition); }
      .nav-container { max-width: 1536px; margin: 0 auto; padding: 0.8rem 1rem; display: flex; justify-content: space-between; align-items: center; }
      @media (min-width: 768px) { .nav-container { padding: 0.8rem 1.5rem; } }
      .logo { display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: clamp(1rem, 4vw, 1.5rem); color: var(--text-primary); text-decoration: none;}
      .brand-logo-small { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; box-shadow: var(--shadow-sm); border: 2px solid var(--border-light); transition: transform 0.3s ease; background-color: #fff; }
      @media (min-width: 768px) { .logo { gap: 12px; } .brand-logo-small { width: 44px; height: 44px; } }
      .logo:hover .brand-logo-small { transform: rotate(5deg) scale(1.05); }
      .nav-actions { display: flex; align-items: center; gap: 8px; }
      @media (min-width: 768px) { .nav-actions { gap: 12px; } }
      .nav-text-btn { font-size: 0.9rem; font-weight: 600; color: var(--brand-blue); background: var(--brand-green-light); padding: 8px 16px; border-radius: 20px; display: none; align-items: center; gap: 6px; transition: var(--transition); }
      @media (min-width: 768px) { .nav-text-btn { display: flex; } }
      .nav-text-btn:hover { background: var(--brand-saffron-light); color: var(--brand-saffron); }
      .icon-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); background: var(--bg-surface); border: 1px solid var(--border-light); color: var(--text-secondary); transition: var(--transition); flex-shrink: 0; }
      .icon-btn:hover { background: var(--bg-surface-hover); color: var(--brand-saffron); }
      .lang-switcher { display: flex; align-items: center; gap: 6px; background: var(--bg-surface); padding: 8px 12px; border-radius: var(--radius-full); border: 1px solid var(--border-light); min-height: 44px; }
      @media (min-width: 768px) { .lang-switcher { gap: 8px; padding: 8px 16px 8px 12px; } }
      .lang-switcher select { background: transparent; border: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; color: var(--text-primary); cursor: pointer; outline: none; width: 60px; }
      @media (min-width: 768px) { .lang-switcher select { font-size: 0.9rem; width: auto; } }
      
      .hero { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3rem 1rem 4rem; background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-base) 100%); border-radius: var(--radius-lg); margin-bottom: 2rem; border: 1px solid var(--border-light); box-shadow: var(--shadow-md); overflow: hidden; width: 100%; }
      @media (min-width: 768px) { .hero { padding: 4rem 1.5rem 5rem; margin-bottom: 3rem; } }
      .hero-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 100%; }
      .hero-logo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid var(--bg-surface); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--border-light); margin-bottom: 1.5rem; background-color: #fff; animation: floatLogo 4s ease-in-out infinite; will-change: transform, box-shadow; }
      @media (min-width: 768px) { .hero-logo { width: 140px; height: 140px; border-width: 5px; } }
      @keyframes floatLogo { 0%, 100% { transform: translateY(0px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--border-light); } 50% { transform: translateY(-10px); box-shadow: 0 20px 30px rgba(255, 153, 51, 0.2), 0 0 0 1px var(--border-light); } }
      .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: var(--bg-surface); border: 1px solid var(--border-light); color: var(--text-secondary); margin-bottom: 1.5rem; box-shadow: var(--shadow-sm); }
      @media (min-width: 768px) { .badge { font-size: 0.8rem; } }
      .badge-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--brand-green); animation: pulse 2s infinite; }
      .hero h1 { font-size: clamp(1.8rem, 6vw, 4rem); margin-bottom: 1rem; }
      .hero p { font-size: clamp(0.95rem, 2vw, 1.25rem); color: var(--text-secondary); max-width: 800px; }
      
      .section-card { background: var(--bg-surface); border-radius: var(--radius-lg); padding: 1.5rem 1rem; box-shadow: var(--shadow-xl); margin-bottom: 2rem; border: 1px solid var(--border-light); width: 100%; }
      @media (min-width: 768px) { .section-card { padding: clamp(2rem, 4vw, 3rem); margin-bottom: 3rem; } }
      .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light); }
      @media (min-width: 768px) { .section-header { gap: 16px; margin-bottom: 2rem; padding-bottom: 1.5rem; } }
      .section-header-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--brand-saffron-light); color: var(--brand-saffron); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
      @media (min-width: 768px) { .section-header-icon { width: 48px; height: 48px; font-size: 1.5rem; } }
      
      .services-grid { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
      @media (min-width: 900px) { .services-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2.5rem; align-items: start; } }
      .service-controls { display: flex; flex-direction: column; gap: 1rem; width: 100%; }
      .control-label-sm { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
      .service-selector-group { display: flex; flex-direction: column; }
      .service-select-box { border: 2px solid var(--brand-saffron); border-radius: var(--radius-sm); background: var(--bg-surface); padding: 2px 4px; box-shadow: var(--shadow-sm); z-index: 2; position: relative; width: 100%; }
      .styled-select-bare { width: 100%; padding: 12px 14px; min-height: 44px; border: none; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 500; color: var(--text-primary); background: transparent; cursor: pointer; outline: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px; }
      .service-meta-row { display: grid; grid-template-columns: 1fr 1fr; background: var(--bg-base); border: 1px solid var(--border-light); border-top: none; border-radius: 0 0 var(--radius-sm) var(--radius-sm); margin-top: -4px; padding-top: 4px; }
      .meta-cell { padding: 12px 16px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
      .meta-cell:first-child { border-right: 1px solid var(--border-light); }
      .service-docs-card { background: var(--bg-base); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 16px; margin-top: 0.5rem; }
      .doc-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-top: 4px; }
      
      .timeline-container { background: var(--bg-base); border-radius: var(--radius-md); padding: 1.5rem 1rem; border: 1px solid var(--border-light); width: 100%; }
      @media (min-width: 768px) { .timeline-container { padding: 2rem; } }
      .custom-timeline { position: relative; margin: 0; padding: 0; list-style: none; padding-left: 20px; }
      .custom-timeline::before { content: ''; position: absolute; left: 7px; top: 12px; bottom: 16px; width: 1.5px; background: var(--border-light); z-index: 1; }
      .custom-timeline-item { position: relative; padding-left: 16px; margin-bottom: 1.75rem; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5; animation: slideInRight 0.4s ease forwards; opacity: 0; }
      .custom-timeline-item:last-child { margin-bottom: 0; }
      .custom-timeline-item::before { content: ''; position: absolute; left: -16px; top: 4px; width: 16px; height: 16px; background: var(--bg-base); border: 2.5px solid var(--brand-saffron); border-radius: 50%; z-index: 2; box-shadow: 0 0 0 4px var(--bg-base); }
      .step-label { font-weight: 700; color: var(--text-primary); margin-right: 4px; }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      
      .benefits-layout { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
      @media (min-width: 1024px) { .benefits-layout { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; } }
      .search-wrapper { position: relative; margin-bottom: 1rem; width: 100%; }
      @media (min-width: 1024px) { .search-wrapper { margin-bottom: 1.5rem; } }
      .search-wrapper i { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
      .search-input { width: 100%; padding: 14px 16px 14px 44px; min-height: 48px; border: 1px solid var(--border-light); border-radius: var(--radius-full); background: var(--bg-base); color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 0.95rem; transition: var(--transition); }
      .search-input:focus { outline: none; border-color: var(--brand-saffron); box-shadow: var(--shadow-glow); background: var(--bg-surface); }
      .category-sidebar { display: flex; flex-direction: row; gap: 8px; overflow-x: auto; padding-bottom: 12px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; width: 100%; }
      .category-sidebar::-webkit-scrollbar { display: none; }
      .category-sidebar > * { scroll-snap-align: start; flex-shrink: 0; }
      @media (min-width: 1024px) { .category-sidebar { flex-direction: column; overflow-x: visible; padding-bottom: 0; scroll-snap-type: none; } .category-sidebar > * { flex-shrink: 1; } }
      .cat-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; min-height: 48px; border-radius: var(--radius-md); background: transparent; border: 1px solid transparent; color: var(--text-secondary); font-weight: 500; font-size: 0.95rem; text-align: left; transition: var(--transition); white-space: nowrap; }
      .cat-btn:hover { background: var(--bg-base); color: var(--text-primary); }
      .cat-btn.active { background: var(--brand-saffron-light); color: var(--brand-saffron); border-color: rgba(255,153,51,0.2); font-weight: 600; }
      .cat-btn i { width: 20px; text-align: center; }
      
      .schemes-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; align-items: start; width: 100%; }
      @media (min-width: 640px) { .schemes-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); } }
      @media (min-width: 768px) { .schemes-grid { gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); } }
      .scheme-card { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; height: 100%; transition: var(--transition); position: relative; overflow: hidden; opacity: 0; animation: fadeInUp 0.5s ease forwards; width: 100%; }
      @media (min-width: 768px) { .scheme-card { padding: 1.5rem; } }
      .scheme-card::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, var(--brand-saffron), var(--brand-green)); transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease; }
      .scheme-card:hover { box-shadow: var(--shadow-xl); transform: translateY(-4px); border-color: var(--border-strong); }
      .scheme-card:hover::after { transform: scaleX(1); }
      .scheme-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 10px;}
      .scheme-header h3 { font-size: 1.1rem; color: var(--text-primary); }
      @media (min-width: 768px) { .scheme-header h3 { font-size: 1.15rem; } }
      .share-btn { width: 44px; height: 44px; border-radius: var(--radius-full); background: var(--bg-base); color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: var(--transition); border: 1px solid var(--border-light); flex-shrink: 0; }
      .share-btn:hover { background: var(--bg-surface-hover); color: var(--brand-saffron); border-color: var(--border-strong); }
      .scheme-desc { font-size: 0.9rem; color: var(--text-secondary); flex-grow: 1; margin-bottom: 1.5rem; }
      .scheme-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1.2rem; border-top: 1px solid var(--border-light); gap: 8px; flex-wrap: wrap; }
      .benefit-tag { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: var(--brand-green); background: var(--brand-green-light); padding: 6px 10px; border-radius: var(--radius-sm); }
      .official-link, .text-link { font-size: 0.85rem; font-weight: 600; color: var(--brand-blue); display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: var(--radius-full); transition: var(--transition); text-decoration: none; min-height: 44px; }
      .text-link:hover { background: var(--bg-base); text-decoration: underline; }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1; }
      .skeleton-loader { background: linear-gradient(90deg, var(--border-light) 25%, var(--border-strong) 50%, var(--border-light) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite linear; }
      @keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .toast { background: var(--text-primary); color: var(--bg-surface); padding: 12px 24px; border-radius: var(--radius-full); font-size: 0.9rem; font-weight: 500; box-shadow: var(--shadow-xl); display: flex; align-items: center; gap: 10px; position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); animation: toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; z-index: 9999; }
      @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 20px) scale(0.9); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
      .loading-fallback { text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-light); margin-bottom: 3rem; box-shadow: var(--shadow-sm); }

      /* ML WIZARD STYLES */
      .wizard-container { max-width: 900px; margin: 2rem auto; }
      .animate-fade-in { animation: fadeInUp 0.4s ease forwards; }
      .slide-in-right { animation: slideInRight 0.4s ease forwards; }
      
      .wizard-progress-bar { position: relative; margin-bottom: 2rem; padding: 0 1rem; }
      .wizard-progress-track { position: absolute; top: 16px; left: 10%; right: 10%; height: 4px; background: var(--border-light); border-radius: 2px; z-index: 1; }
      .wizard-progress-fill { height: 100%; background: var(--brand-blue); border-radius: 2px; transition: width 0.5s ease; }
      .wizard-steps-container { display: flex; justify-content: space-between; position: relative; z-index: 2; }
      .wizard-step-indicator { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 33%; }
      .wizard-step-circle { width: 36px; height: 36px; border-radius: 50%; background: var(--bg-surface); border: 3px solid var(--border-strong); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-weight: bold; transition: var(--transition); }
      .wizard-step-circle.active { background: var(--brand-blue); border-color: var(--brand-blue); color: white; box-shadow: var(--shadow-md); }
      .wizard-step-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); text-align: center; }
      .wizard-step-label.active-text { color: var(--brand-blue); }

      .wizard-card { background: var(--bg-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); overflow: hidden; }
      .wizard-card-header { padding: 2rem; border-bottom: 1px solid var(--border-light); background: var(--bg-surface-hover); text-align: center; }
      .wizard-card-header h2 { font-size: 1.5rem; color: var(--brand-blue); margin-bottom: 0.5rem; }
      .wizard-card-header p { color: var(--text-secondary); font-size: 0.95rem; }
      .wizard-card-body { padding: 2.5rem 2rem; }
      .wizard-card-body.centered { display: flex; justify-content: center; align-items: center; min-height: 300px; }
      
      .ocr-upload-box { width: 100%; max-width: 450px; border: 2px dashed var(--brand-blue); border-radius: var(--radius-lg); padding: 3rem 2rem; text-align: center; cursor: pointer; transition: var(--transition); background: var(--brand-saffron-light); }
      .ocr-upload-box:hover { border-color: var(--brand-saffron); background: rgba(255, 153, 51, 0.15); transform: translateY(-2px); }
      .upload-icon { font-size: 3rem; color: var(--brand-blue); margin-bottom: 1rem; }
      .ocr-upload-box h3 { font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.5rem; }
      .ocr-secure-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: bold; color: var(--brand-green); margin-top: 1.5rem; background: var(--brand-green-light); padding: 4px 10px; border-radius: 20px; }

      .ocr-scanner-active { text-align: center; width: 100%; max-width: 400px; }
      .scanner-icon { font-size: 4rem; color: var(--brand-saffron); margin-bottom: 2rem; }
      .scanner-progress-wrapper { width: 100%; height: 8px; background: var(--border-light); border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
      .scanner-progress-bar { height: 100%; background: var(--brand-blue); transition: width 0.1s linear; }

      .ocr-success { text-align: center; width: 100%; max-width: 400px; }
      .success-icon { font-size: 4rem; color: var(--brand-green); margin-bottom: 1rem; }
      .wizard-btn-primary { width: 100%; padding: 1rem; background: var(--brand-blue); color: white; font-weight: bold; font-size: 1.1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 10px; transition: var(--transition); box-shadow: var(--shadow-md); margin-top: 1.5rem; }
      .wizard-btn-primary:hover { background: #142a47; transform: translateY(-2px); }
      .wizard-btn-primary.small { width: auto; padding: 0.6rem 1.5rem; font-size: 0.95rem; margin-top: 0; }
      .wizard-btn-secondary { padding: 1rem 1.5rem; background: transparent; color: var(--text-secondary); font-weight: bold; transition: var(--transition); }
      .wizard-btn-secondary:hover { color: var(--brand-blue); }

      .wizard-form-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
      @media (min-width: 768px) { .wizard-form-grid { grid-template-columns: 1fr 1fr; } }
      .form-group { display: flex; flex-direction: column; gap: 6px; }
      .form-group label { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
      .form-control { padding: 12px 16px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-size: 1rem; font-family: inherit; color: var(--text-primary); background: var(--bg-base); transition: var(--transition); width: 100%; }
      .form-control:focus { border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(30,58,95,0.2); outline: none; }
      .form-control.error { border-color: #EF4444; background: #FEF2F2; }
      .age-display { width: 60px; border-radius: var(--radius-sm); background: var(--bg-surface-hover); border: 1px solid var(--border-light); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--brand-blue); }
      .age-display strong { font-size: 1.25rem; line-height: 1; }
      .age-display small { font-size: 0.6rem; font-weight: bold; opacity: 0.8; }
      .income-group { margin-top: 1rem; background: var(--brand-saffron-light); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid rgba(255,153,51,0.3); }
      .income-group label { color: var(--brand-blue); }
      .income-input { font-size: 1.25rem; font-weight: bold; border-color: var(--brand-saffron); }
      
      .wizard-card-footer { padding: 1.5rem 2rem; border-top: 1px solid var(--border-light); background: var(--bg-surface-hover); display: flex; justify-content: space-between; align-items: center; }

      .wizard-results-view { display: flex; flex-direction: column; gap: 2rem; }
      .results-hero { background: var(--brand-blue); color: white; padding: 3rem 2rem; border-radius: var(--radius-lg); text-align: center; position: relative; overflow: hidden; box-shadow: var(--shadow-xl); }
      .results-hero i { font-size: 4rem; color: var(--brand-saffron); margin-bottom: 1rem; }
      .results-hero h2 { color: white; margin-bottom: 0.5rem; font-size: 2rem; }
      .results-hero p { color: rgba(255,255,255,0.8); max-width: 600px; margin: 0 auto; font-size: 1.1rem; }
      
      .results-grid { display: flex; flex-direction: column; gap: 1.5rem; }
      .result-match-card { background: var(--bg-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); border: 1px solid var(--border-light); overflow: hidden; position: relative; }
      .match-strip { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
      .match-strip.high { background: var(--brand-green); }
      .match-strip.medium { background: var(--brand-saffron); }
      .match-card-layout { display: flex; flex-direction: column; padding: 1.5rem; padding-left: 2rem; }
      @media (min-width: 768px) { .match-card-layout { flex-direction: row; align-items: center; gap: 2rem; } }
      .match-score-section { display: flex; flex-direction: column; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light); }
      @media (min-width: 768px) { .match-score-section { padding-bottom: 0; border-bottom: none; border-right: 1px solid var(--border-light); padding-right: 2rem; } }
      .score-circle { position: relative; width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; }
      .score-text { position: absolute; font-size: 1.25rem; font-weight: 900; color: var(--text-primary); }
      .score-label { font-size: 0.75rem; font-weight: bold; color: var(--text-muted); text-transform: uppercase; margin-top: 0.5rem; }
      .match-content-section { flex: 1; padding-top: 1rem; }
      @media (min-width: 768px) { .match-content-section { padding-top: 0; } }
      .match-content-section h3 { font-size: 1.25rem; color: var(--brand-blue); margin-bottom: 0.5rem; }
      .scheme-benefit-box { background: var(--brand-green-light); color: var(--brand-green); padding: 8px 12px; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 8px; font-weight: bold; font-size: 0.9rem; margin-bottom: 1rem; }
      .match-footer { display: flex; flex-direction: column; gap: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-light); }
      @media (min-width: 600px) { .match-footer { flex-direction: row; justify-content: space-between; align-items: center; } }
    `}</style>
  );

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const showToast = (msg: string, icon: string = "fa-check-circle") => {
    setToast({ msg, icon, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const t = (key: string): string =>
    MOCK_DB.i18n[lang]?.[key] || MOCK_DB.i18n["en"][key] || key;

  return (
    <AppContext.Provider
      value={{
        appMode,
        setAppMode: setAppModeState,
        lang,
        setLang: setLangState,
        theme,
        toggleTheme,
        showToast,
        t,
        chatHistory,
        addMessage,
        isChatOpen,
        setChatOpen,
        termsAccepted,
        setTermsAccepted,
      }}
    >
      <ErrorBoundary>
        <GlobalStyles />

        {appMode === "gateway" && <Gateway />}

        {appMode === "chat" && (
          <div className="main-wrapper">
            <Navbar />
            <main
              className="container"
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <ChatBox isFullScreen={true} />
            </main>
            <LegalFooter />
          </div>
        )}

        {appMode === "home" && (
          <div className="main-wrapper">
            <Navbar />
            <main className="container">
              <Hero />
              <Suspense
                fallback={
                  <div className="loading-fallback">
                    <i className="fa-solid fa-spinner fa-spin"></i> Loading
                    Interactive Guide...
                  </div>
                }
              >
                <AsyncServicesSection />
              </Suspense>
              <Suspense
                fallback={
                  <div className="loading-fallback">
                    <i className="fa-solid fa-spinner fa-spin"></i> Loading
                    Benefits Database...
                  </div>
                }
              >
                <AsyncBenefitsSection />
              </Suspense>
            </main>
            <FloatingChat />
            <LegalFooter />
          </div>
        )}

        {appMode === "wizard" && (
          <div className="main-wrapper">
            <Navbar />
            <WizardMode />
            <FloatingChat />
            <LegalFooter />
          </div>
        )}

        {toast && (
          <div className="toast" key={toast.id}>
            <i
              className={`fa-solid ${toast.icon}`}
              style={{ color: "var(--brand-saffron)" }}
            ></i>{" "}
            {toast.msg}
          </div>
        )}
      </ErrorBoundary>
    </AppContext.Provider>
  );
}
