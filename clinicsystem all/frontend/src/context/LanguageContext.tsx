'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'so' | 'ar'

interface Translations {
  [key: string]: {
    en: string
    so: string
    ar: string
  }
}

export const DICTIONARY: Translations = {
  // Navigation & Branding
  brandTitle: { en: 'HUDI DENTAL CARE', so: 'HUDI DARYEELKA ILKAHA', ar: 'هودي لرعاية الأسنان' },
  practiceSaas: { en: 'Enterprise Practice SaaS', so: 'Nidaamka Maamulka Rugta Ilkaha', ar: 'منظومة إدارة عيادات الأسنان المتقدمة' },
  dashboard: { en: 'Executive Dashboard', so: 'Barta Guud', ar: 'لوحة التحكم التنفيذية' },
  odontogram: { en: 'Digital Odontogram', so: 'Shaxda Ilkaha (Odontogram)', ar: 'مخطط الأسنان الرقمي' },
  treatmentPlans: { en: 'Treatment Plans', so: 'Qorshooyinka Daawaynta', ar: 'خطط العلاج السريري' },
  dentalLab: { en: 'Dental Lab Orders', so: 'Dalabaadka Shaybaarka Ilkaha', ar: 'أوامر معمل الأسنان' },
  imaging: { en: 'Dental Radiographs & Imaging', so: 'Sawirrada & Raajada Ilkaha', ar: 'مركز الأشعة والتصوير' },
  branches: { en: 'Branch Network', so: 'Laamaha Rugta', ar: 'شبكة الفروع' },
  aiAssistant: { en: 'AI Dental Assistant', so: 'Kaaliyaha Caqliga Macmalka ah', ar: 'مساعد الذكاء الاصطناعي' },
  patients: { en: 'Patients', so: 'Bukaannada', ar: 'المرضى' },
  appointments: { en: 'Appointments', so: 'Ballamaha', ar: 'المواعيد' },
  invoices: { en: 'Invoicing & Payments', so: 'Qaansheegyada & Lacagaha', ar: 'الفواتير والمدفوعات' },
  reports: { en: 'Analytics & Reports', so: 'Warbixinnada & Xisaabaadka', ar: 'التقارير والإحصائيات' },
  settings: { en: 'Clinic Settings', so: 'Habaynta Rugta', ar: 'إعدادات العيادة' },
  searchPatients: { en: 'Search patients… (press Enter)', so: 'Raadi bukaan… (riix Enter)', ar: 'البحث عن مريض… (اضغط Enter)' },
  signOut: { en: 'Sign Out', so: 'Kabax', ar: 'تسجيل الخروج' },
  save: { en: 'Save', so: 'Kaydi', ar: 'حفظ' },
  cancel: { en: 'Cancel', so: 'Jooji', ar: 'إلغاء' },
  print: { en: 'Print', so: 'Daabac', ar: 'طباعة' },
  adultDentition: { en: 'Adult Dentition (32 Teeth)', so: 'Ilkaha Dadka Waaweyn (32 Ilig)', ar: 'الأسنان الدائمة (32 سن)' },
  pediatricDentition: { en: 'Pediatric Dentition (20 Teeth)', so: 'Ilkaha Carruurta (20 Ilig)', ar: 'الأسنان اللبنية (20 سن)' },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof DICTIONARY | string, fallback?: string) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  dir: 'ltr',
})

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('hudi_lang') as Language
    if (saved && ['en', 'so', 'ar'].includes(saved)) {
      setLanguageState(saved)
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = saved
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('hudi_lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  const t = (key: string, fallback?: string): string => {
    const entry = DICTIONARY[key]
    if (entry && entry[language]) {
      return entry[language]
    }
    return fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
