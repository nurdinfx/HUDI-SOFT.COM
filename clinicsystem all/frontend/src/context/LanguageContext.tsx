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
  consultations: { en: 'Consultations', so: 'Baaritaanka & Kormeerka', ar: 'الاستشارات والكشوفات' },
  prescriptions: { en: 'Prescriptions', so: 'Qoraalka Daawooyinka', ar: 'الوصفات الطبية' },
  pharmacy: { en: 'Pharmacy', so: 'Farmashiyaha', ar: 'الصيدلية' },
  invoices: { en: 'Invoicing & Payments', so: 'Xisaabaadka & Daymaha', ar: 'الفواتير والمدفوعات' },
  attendance: { en: 'Attendance', so: 'Imaanshaha Shaqaalaha', ar: 'سجل الحضور' },
  employees: { en: 'Employees', so: 'Shaqaalaha', ar: 'الموظفون' },
  reports: { en: 'Analytics & Reports', so: 'Warbixinnada & Xisaabaadka', ar: 'التقارير والإحصائيات' },
  notifications: { en: 'Notifications', so: 'Ogeysiisyada', ar: 'الإشعارات' },
  settings: { en: 'Clinic Settings', so: 'Habaynta Rugta', ar: 'إعدادات العيادة' },
  searchPatients: { en: 'Search patients… (press Enter)', so: 'Raadi bukaan… (riix Enter)', ar: 'البحث عن مريض… (اضغط Enter)' },
  signOut: { en: 'Sign Out', so: 'Kabax', ar: 'تسجيل الخروج' },
  darkMode: { en: 'Dark Mode', so: 'Habka Mugdiga', ar: 'الوضع الداكن' },
  lightMode: { en: 'Light Mode', so: 'Habka Cadceeda', ar: 'الوضع الفاتح' },
  save: { en: 'Save', so: 'Kaydi', ar: 'حفظ' },
  cancel: { en: 'Cancel', so: 'Jooji', ar: 'إلغاء' },
  print: { en: 'Print', so: 'Daabac', ar: 'طباعة' },
  adultDentition: { en: 'Adult Dentition (32 Teeth)', so: 'Ilkaha Dadka Waaweyn (32 Ilig)', ar: 'الأسنان الدائمة (32 سن)' },
  pediatricDentition: { en: 'Pediatric Dentition (20 Teeth)', so: 'Ilkaha Carruurta (20 Ilig)', ar: 'الأسنان اللبنية (20 سن)' },

  // Pharmacy & POS
  pharmacyTitle: { en: 'Pharmacy & Drug Store', so: 'Farmashiyaha & Daawooyinka', ar: 'الصيدلية ومخزن الأدوية' },
  pharmacySubtitle: { en: 'Dispensary POS · Inventory · Sales & Accounts', so: 'Iibinta Daawooyinka (POS) · Kaydka · Xisaabaadka & Daymaha', ar: 'نقطة بيع الصيدلية · المخزون · المبيعات والحسابات' },
  posTerminal: { en: 'Point of Sale (POS)', so: 'Iibinta Tooska ah (POS)', ar: 'نقطة البيع (POS)' },
  inventory: { en: 'Inventory', so: 'Kaydka Daawooyinka', ar: 'مخزون الأدوية' },
  salesLogs: { en: 'Sales Logs', so: 'Diiwaanka Iibka', ar: 'سجلات المبيعات' },
  lowStock: { en: 'Low Stock', so: 'Daawooyinka Dhamaanaya', ar: 'نواقص المخزون' },
  todaySales: { en: "Today's Sales", so: 'Iibka Maanta', ar: 'مبيعات اليوم' },
  monthlySales: { en: 'Monthly Sales', so: 'Iibka Bishaan', ar: 'مبيعات الشهر' },
  totalTransactions: { en: 'Transactions', so: 'Tirada Iibka', ar: 'عدد المعاملات' },
  stockValue: { en: 'Stock Value', so: 'Qiimaha Kaydka', ar: 'قيمة المخزون' },
  customer: { en: 'Customer', so: 'Macmiilka', ar: 'العميل' },
  walkin: { en: 'Walk-in Customer', so: 'Macmiil Socod ah', ar: 'عميل عابر' },
  registeredPatient: { en: 'Registered Patient', so: 'Bukaan Diiwaangashan', ar: 'مريض مسجل' },
  paymentMethod: { en: 'Payment Method', so: 'Habka Lacag-bixinta', ar: 'طريقة الدفع' },
  completeSale: { en: 'Complete Sale', so: 'Xaqiiji Iibka', ar: 'إتمام البيع' },
  creditLoan: { en: 'Credit / Dayn (Amaah)', so: 'Amaah / Dayn', ar: 'آجل / دين' },
  total: { en: 'Total', so: 'Wadarta Guud', ar: 'الإجمالي' },
  subtotal: { en: 'Subtotal', so: 'Wadarta Adeegyada', ar: 'المجموع الفرعي' },
  discount: { en: 'Discount', so: 'Dhimis', ar: 'الخصم' },
  cart: { en: 'Cart', so: 'Dambiisha', ar: 'السلة' },
  addMedication: { en: 'Add Medication', so: 'Ku dar Dawo', ar: 'إضافة دواء' },
  printReceipt: { en: 'Print Receipt', so: 'Daabac Rasiidhka', ar: 'طباعة الإيصال' },
  newCustomer: { en: '+ Add Customer', so: '+ Diiwaangeli Macmiil', ar: '+ تسجيل عميل جديد' },
  searchMedications: { en: 'Search medications...', so: 'Raadi dawo (magaca, nooca)...', ar: 'البحث عن دواء...' },
  cartEmpty: { en: 'Cart is empty. Click a medicine to add.', so: 'Dambiishu waa maran tahay. Guji dawo si aad ugu darto.', ar: 'السلة فارغة. اضغط على دواء للإضافة.' },
  debtNotice: { en: 'Loan requires choosing or registering a customer to track debt in accounts.', so: 'Dayntu waxay u baahan tahay in la doorto ama la diiwaangeliyo bukaan si daynta xisaabtiisa loogu qoro.', ar: 'البيع الآجل يتطلب تحديد أو تسجيل مريض لإدراج الدين في حسابه.' },
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

