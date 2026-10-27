import React from 'react';
import { AccentTheme, ACCENT_THEMES } from '../types';
import { 
  Info, 
  HelpCircle, 
  Wallet, 
  TrendingUp, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Code2,
  Send
} from 'lucide-react';

interface AboutScreenProps {
  accentTheme?: AccentTheme;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ accentTheme = 'blue' }) => {
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  return (
    <div className="space-y-6 pb-8 animate-fade-in" id="about-screen">
      {/* Header section */}
      <div className="text-center space-y-2 py-2">
        <div className={`inline-flex p-3.5 bg-gradient-to-tr ${currentAccent.headerIconGradient} text-white rounded-2xl mb-1.5 shadow-md shadow-sky-500/10 transition-all duration-300`}>
          <Info size={28} />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Dastur haqida
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
          NORVA ilovasi — shaxsiy daromadlar va xarajatlarni hisoblash, nazorat qilish va moliyaviy barqarorlikka erishish uchun eng mukammal yordamchingizdir.
        </p>
      </div>

      {/* Main explanation card */}
      <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 dark:from-white/5 dark:to-white/5 border border-primary/10 dark:border-white/5 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet size={18} className="text-primary dark:text-primary-fixed-dim" />
          Nima uchun NORVA kerak?
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
          Kundalik hayotimizda qayerga qancha pul sarflayotganimizni bilmaslik ortiqcha xarajatlarga olib keladi. Ushbu ilova sizga <span className="text-primary font-bold dark:text-primary-fixed-dim">pullaringizni aniq hisoblash</span>, foydasiz xarajatlarni qisqartirish hamda oylik budjetingizni to'g'ri rejalashtirish imkonini beradi.
        </p>
        <div className="grid grid-cols-2 gap-3.5 pt-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <ArrowUpRight size={14} />
              Kirim
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-snug">
              Maosh, sovg'alar va boshqa daromadlarni hisoblab borish.
            </p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
              <ArrowDownRight size={14} />
              Xarajat (Chiqim)
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-snug">
              Oziq-ovqat, ijara, yo'l haqi va kutilmagan chiqimlarni nazorat qilish.
            </p>
          </div>
        </div>
      </div>

      {/* Key capabilities accordion style */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
          Dasturning asosiy imkoniyatlari
        </h4>

        {/* Item 1: Rangli Mavzular Rejimi */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
              <span>Mavzular va Rang Rejimlari (4 xil Accent)</span>
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Dasturni o'zingizga ma'qul rangda sozlang: Moviy Ko'k, Yoqimli Pushti, Yashil Zumrad va Qirollik Siyohrang. Profil menyusida bir bosish bilan barcha tugmalar, kartalar va menyu dizayni o'zgaradi.
            </p>
          </div>
        </div>

        {/* Item 2: AI Chek Skaneri */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
              <span>AI Chek va Skrinshot Skaneri</span>
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Telefonda tushirilgan qog'oz kassa cheklari, Soliq QR-cheklari yoki Click, Payme, Uzum va Yandex Go skrinshotlarini rasmga oling. Sun'iy intellekt avtomatik tarzda do'kon nomi, umumiy summa va xarid mahsulotlarini aniqlaydi.
            </p>
          </div>
        </div>

        {/* Item 2: Pul Kiritish va Balans */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white">
              Boshlang'ich Pul Kiritish va Avto Ayirish
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Karta yoki hamyoningizdagi umumiy pulni kiritib qo'ying (masalan, 100.000 UZS). Chek skanerlanganda yoki xarajat kiritilganda ushbu summadan avtomatik ayirilib (masalan, 90.000 UZS qolib) aniq hisoblanadi.
            </p>
          </div>
        </div>

        {/* Item 3 */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white">
              Tahlillar va Grafiklar (Insights)
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Oylik budjetni tahlil qilib, qaysi kategoriyalarga eng ko'p mablag' ketayotganini chiroyli diagrammalar orqali aniq ko'rib turasiz.
            </p>
          </div>
        </div>

        {/* Item 2 */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-primary/10 text-primary dark:text-primary-fixed-dim rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Search size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white">
              Aqlli Qidiruv va Filtrlash
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Kategoriyalar nomi, sana yoki turiga qarab barcha amallarni lahzada topishingiz uchun mo'ljallangan mukammal filtr tizimi.
            </p>
          </div>
        </div>

        {/* Item 3 */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white">
              100% Xavfsizlik va Maxfiylik
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Hech qanday ma'lumot internet serverlariga uzatilmaydi. Barcha hisob-kitoblar faqat va faqat o'zingizning brauzeringizda (LocalStorage) saqlanadi.
            </p>
          </div>
        </div>

        {/* Item 4 */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex gap-4 shadow-sm">
          <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-gray-800 dark:text-white">
              Eksport va Import
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Ma'lumotlarni yo'qotib qo'ymaslik uchun ularni bitta fayl qilib yuklab olishingiz va boshqa qurilmaga osongina o'tkazishingiz mumkin.
            </p>
          </div>
        </div>
      </div>

      {/* Helpful Quick Tips */}
      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-3.5">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen size={16} className="text-primary dark:text-primary-fixed-dim" />
          Tezkor maslahatlar
        </h4>
        <ul className="space-y-2.5">
          <li className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
            <ChevronRight size={14} className="text-primary shrink-0 mt-0.5" />
            <span>Budjetingizni belgilang — profil bo'limiga kirib oylik rejalashtirilgan chiqimlaringiz hajmini kiritib qo'ying.</span>
          </li>
          <li className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
            <ChevronRight size={14} className="text-primary shrink-0 mt-0.5" />
            <span>Kategoriyalarni qidiring — yangi xarid qo'shganda qidirish funksiyasidan foydalanib tegishli stiker va rangni oson toping.</span>
          </li>
          <li className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
            <ChevronRight size={14} className="text-primary shrink-0 mt-0.5" />
            <span>Rasmingizni yangilang — shaxsiy brendingiz va kayfiyatingizga mos fotosurat yoki chiroyli tayyor rangli dizaynni tanlang.</span>
          </li>
        </ul>
      </div>

      {/* Dasturchi / Yaratuvchi ma'lumoti */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-primary/5 to-sky-500/5 dark:from-indigo-950/20 dark:via-primary-container/10 dark:to-sky-950/20 border border-indigo-500/15 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4 text-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -right-6 -bottom-6 text-indigo-500/10 dark:text-indigo-400/5 transform -rotate-12 pointer-events-none">
          <Code2 size={120} />
        </div>
        <div className="absolute -left-4 -top-4 text-sky-500/10 dark:text-sky-400/5 transform rotate-45 pointer-events-none">
          <Sparkles size={60} />
        </div>
        
        <div className="flex flex-col items-center space-y-3 relative z-10">
          {/* Avatar-like Badge */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center font-black text-lg shadow-md ring-4 ring-indigo-500/10 dark:ring-white/5">
              BM
            </div>
            <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-white p-1 rounded-full shadow-sm">
              <Sparkles size={10} className="fill-current" />
            </span>
          </div>

          <div className="space-y-1 max-w-sm">
            <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/10">
              LOYIHA MUALLIFI
            </span>
            <h4 className="text-base font-extrabold text-gray-800 dark:text-white pt-1">
              Begimov Muhammadyusuf
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
              Ushbu mukammal tizim va uning barcha imkoniyatlari u tomonidan yaratilgan.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-white/5 pt-3.5 flex flex-col items-center justify-center space-y-2 relative z-10">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Send size={10} className="text-sky-500" /> Bog'lanish uchun
          </span>
          <a
            href="https://t.me/Yusu1F_m1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 shadow-md shadow-sky-500/15"
          >
            <Send size={13} className="-rotate-45" />
            <span>@Yusu1F_m1</span>
          </a>
        </div>
      </div>

      {/* Quote / Footer decoration */}
      <div className="text-center pt-2">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Moliyaviy Barqarorlik Sari Qadam!
        </span>
      </div>
    </div>
  );
};
