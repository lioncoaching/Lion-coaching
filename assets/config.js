/* ============================================================
   LION COACHING — إعدادات الموقع
   عدّل هنا فقط: رقم الواتساب، بيانات التحويل، والباقات
   ============================================================ */
window.LION_CONFIG = {
  // رقم الواتساب بالصيغة الدولية بدون + أو مسافات
  whatsapp: "201287383150",

  // وسائل الدفع اللي هتظهر للعميل في شاشة الاشتراك
  // ⚠️ راجع الأرقام دي قبل النشر
  payments: [
    {
      id: "instapay",
      name: "InstaPay",
      label: "رقم / عنوان إنستاباي",
      value: "01287383150",
      hint: "حوّل من أبلكيشن InstaPay على الرقم ده"
    },
    {
      id: "wallet",
      name: "محفظة إلكترونية",
      label: "رقم المحفظة",
      value: "01287383150",
      hint: "فودافون كاش / أورانج كاش / اتصالات كاش / وي باي"
    }
  ],

  instagram: "LIONISM__",

  // صور التحول — حط الصور في assets/results/ (الوش لازم يكون متغطي في الصورة نفسها)
  // لو القائمة فاضية، قسم النتايج بيستخبى تلقائياً
  // مثال:
  // { before: "assets/results/c1-before.webp", after: "assets/results/c1-after.webp",
  //   title: "خسارة 12 كيلو دهون", duration: "4 شهور", tags: ["تنشيف", "مبتدئ"] }
  // أو صورة واحدة مجمّعة: { image: "assets/results/c2.webp", title: "...", duration: "..." }
  transformations: [
    { before: "assets/results/c1-before.webp", after: "assets/results/c1-after.webp",
      title: "حرق دهون + بناء عضل", tags: ["إعادة تشكيل", "سكس باك"] },
    { before: "assets/results/c2-before.webp", after: "assets/results/c2-after.webp",
      title: "تنشيف وتقسيم كامل", tags: ["تنشيف", "تجهيز بطولة"] },
    { before: "assets/results/c3-before.webp", after: "assets/results/c3-after.webp",
      title: "خسارة دهون وظهور العضل", tags: ["تنشيف", "مبتدئ"] },
    { before: "assets/results/c4-before.webp", after: "assets/results/c4-after.webp",
      title: "خسارة دهون وشد الجسم", tags: ["تنشيف", "فوق الـ 40"] },
    { before: "assets/results/c5-before.webp", after: "assets/results/c5-after.webp",
      title: "بناء عضل وتقسيم", tags: ["تضخيم نظيف", "مبتدئ"] }
  ],

  plans: [
    {
      id: "1m",
      name: "شهر واحد",
      en: "STARTER",
      price: 500,
      period: "شهرياً",
      months: 1,
      note: "مناسبة تجرّب النظام وتبدأ صح"
    },
    {
      id: "3m",
      name: "٣ شهور",
      en: "TRANSFORM",
      price: 1200,
      period: "3 شهور",
      months: 3,
      was: 1500,
      badge: "الأكثر طلباً",
      featured: true,
      note: "الفترة الكافية لنتيجة واضحة في الشكل والقوة"
    },
    {
      id: "6m",
      name: "٦ شهور",
      en: "LION MODE",
      price: 2000,
      period: "6 شهور",
      months: 6,
      was: 3000,
      badge: "أفضل قيمة",
      note: "تحوّل كامل + تجهيز للبطولات لو ده هدفك"
    }
  ]
};
