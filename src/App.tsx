/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import { 
  getTransactions, 
  saveTransactions, 
  getProfile, 
  saveProfile, 
  getBaseBalance, 
  saveBaseBalance, 
  getTheme, 
  saveTheme,
  setStorageErrorCallback,
  fetchUserDataFromFirestore,
  migrateLocalDataToFirestore
} from './lib/storage';
import { Transaction, UserProfile, ACCENT_THEMES } from './types';
import { Header } from './components/Header';
import { BalanceCard } from './components/BalanceCard';
import { IncomeExpenseSummary } from './components/IncomeExpenseSummary';
import { ExpenseBreakdown } from './components/ExpenseBreakdown';
import { RecentTransactions } from './components/RecentTransactions';
import { TransactionModal } from './components/TransactionModal';
import { HistoryScreen } from './components/HistoryScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AboutScreen } from './components/AboutScreen';
import { LiquidGlassNavbar } from './components/LiquidGlassNavbar';
import { AdminPanel } from './components/AdminPanel';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AuthScreen } from './components/AuthScreen';
import { SplashScreen } from './components/SplashScreen';
import { triggerInstantNotification } from './lib/notifications';
import { Plus, Home, ReceiptText, BarChart3, User, Grid2X2, Info, CalendarDays, Calendar, Layers, X, Radio } from 'lucide-react';

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Auth State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Global States
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme());
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [baseBalance, setBaseBalance] = useState<number>(getBaseBalance());
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());

  // Network Offline / Online indicator state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnlineToast, setShowBackOnlineToast] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnlineToast(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnlineToast(true);
      const timer = setTimeout(() => setShowBackOnlineToast(false), 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Listen to Firebase Auth state changes & sync Firestore
  useEffect(() => {
    setStorageErrorCallback((msg) => {
      setWebToastMessage(msg);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        // Automatic migration of pre-existing local data to Firestore if user doc is missing
        await migrateLocalDataToFirestore(user.uid, user.email || '');

        // Fetch user data from Firestore & update state/localStorage
        const cloudData = await fetchUserDataFromFirestore(user.uid);
        if (cloudData.transactions !== null) {
          setTransactions(cloudData.transactions);
        }
        if (cloudData.profile !== null) {
          setProfile(cloudData.profile);
        } else if (user.email) {
          const currentProf = getProfile();
          const updated = { ...currentProf, email: user.email, name: user.displayName || currentProf.name };
          setProfile(updated);
          saveProfile(updated, user.uid);
        }
        if (cloudData.baseBalance !== null) {
          setBaseBalance(cloudData.baseBalance);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsGuestMode(false);
      setWebToastMessage("Tizimdan muvaffaqiyatli chiqdingiz.");
    } catch (err) {
      console.warn("Logout notice:", err);
      setIsGuestMode(false);
    }
  };
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'insights' | 'profile' | 'about'>('home');
  
  // Admin & Announcement states
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ title: string; msg: string } | null>(null);

  const getDeviceType = (): 'Android' | 'iOS' | 'Web' => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) {
      return 'Android';
    }
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'iOS';
    }
    return 'Web';
  };

  const loadAnnouncement = async () => {
    try {
      const response = await fetch('/api/announcement');
      if (response.ok) {
        const data = await response.json();
        const dismissed = localStorage.getItem('admin_announcement_dismissed_title') === data.title;
        if (data.active && data.title && data.msg && !dismissed) {
          setAnnouncement({ title: data.title, msg: data.msg });
        } else {
          setAnnouncement(null);
        }
      }
    } catch (err) {
      // Silently catch network drops on initial load
    }
  };

  useEffect(() => {
    loadAnnouncement();
    
    const handleUpdate = () => {
      loadAnnouncement();
    };

    window.addEventListener('admin_announcement_updated', handleUpdate);
    return () => {
      window.removeEventListener('admin_announcement_updated', handleUpdate);
    };
  }, []);

  // Real-time track download on mount or profile update
  useEffect(() => {
    const trackUserDownload = async () => {
      const deviceType = getDeviceType();
      let deviceId = localStorage.getItem('moliya_device_id');
      if (!deviceId) {
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('moliya_device_id', deviceId);
      }

      try {
        await fetch('/api/track-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            name: profile.name || 'Mehmon',
            email: profile.email || '',
            device: deviceType,
          })
        });
      } catch (err) {
        // Silently handle tracking error on offline state
      }
    };

    trackUserDownload();
  }, [profile.name, profile.email]);
  
  // Modal & Admin Auth states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [webToastMessage, setWebToastMessage] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);

  // Trigger Admin Panel (requests password verification if not authenticated)
  const handleOpenAdminPanel = () => {
    if (adminKey) {
      setIsAdminOpen(true);
    } else {
      setIsAdminAuthModalOpen(true);
    }
  };

  // Apply and persist dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Global Period Filter State for Homepage
  const [dashboardPeriod, setDashboardPeriod] = useState<'bugun' | 'hafta' | 'barchasi'>('bugun');

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMondayOfDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const r = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };

  const getUzbekMonthName = (monthIdx: number) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
      'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];
    return months[monthIdx];
  };

  const getWeekRangeLabel = (mondayStr: string): string => {
    const monday = new Date(mondayStr);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const mD = monday.getDate();
    const mM = getUzbekMonthName(monday.getMonth());
    const mY = monday.getFullYear();
    
    const sD = sunday.getDate();
    const sM = getUzbekMonthName(sunday.getMonth());
    const sY = sunday.getFullYear();
    
    if (mY !== sY) {
      return `${mD} ${mM} - ${sD} ${sM}`;
    }
    if (mM !== sM) {
      return `${mD}-${mM} - ${sD}-${sM}`;
    }
    return `${mD}-${sD} ${mM}`;
  };

  // Recalculated dynamic metrics based on loaded transactions (All-time overall balance)
  const allTimeIncome = transactions
    .filter((t) => t.type === 'kirim')
    .reduce((sum, t) => sum + t.amount, 0);

  const allTimeExpense = transactions
    .filter((t) => t.type === 'chiqim')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = baseBalance + allTimeIncome - allTimeExpense;

  // Filter transactions for dashboard cards based on the selected period
  const todayStr = getLocalDateString();
  const currentWeekMonday = getMondayOfDate(todayStr);

  const filteredTxsForPeriod = transactions.filter((t) => {
    if (dashboardPeriod === 'bugun') {
      return t.date === todayStr;
    }
    if (dashboardPeriod === 'hafta') {
      return getMondayOfDate(t.date) === currentWeekMonday;
    }
    return true; // barchasi
  });

  const totalIncome = filteredTxsForPeriod
    .filter((t) => t.type === 'kirim')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTxsForPeriod
    .filter((t) => t.type === 'chiqim')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentPeriodBalance = dashboardPeriod === 'barchasi' 
    ? currentBalance 
    : (baseBalance + totalIncome - totalExpense);

  // Let's compute a dynamic comparison metric
  const percentageChange = filteredTxsForPeriod.length === 0 ? 0 : 12.5;

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showWebToast = (msg: string) => {
    setWebToastMessage(msg);
  };

  // Daily SMS interval trigger (24-hour summary at user specified time)
  useEffect(() => {
    const checkDailySMS = () => {
      if (!profile.notificationsEnabled || !profile.notificationTime) return;
      
      const now = new Date();
      const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDateStr = now.toISOString().split('T')[0];
      const lastSentKey = `daily_sms_sent_${todayDateStr}`;

      if (currentHM === profile.notificationTime && !localStorage.getItem(lastSentKey)) {
        localStorage.setItem(lastSentKey, 'true');
        triggerInstantNotification(
          transactions,
          currentBalance,
          profile.currency || 'UZS',
          showWebToast,
          profile.phoneNumber
        );
      }
    };

    const interval = setInterval(checkDailySMS, 20000);
    checkDailySMS();
    return () => clearInterval(interval);
  }, [profile.notificationsEnabled, profile.notificationTime, profile.phoneNumber, transactions, currentBalance, profile.currency]);

  // Profile updaters
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    saveProfile(updatedProfile);
  };

  const handleUpdateBaseBalance = (newBaseBalance: number) => {
    setBaseBalance(newBaseBalance);
    saveBaseBalance(newBaseBalance);
  };

  // Transaction state modifiers
  const handleSaveTransaction = (txData: Omit<Transaction, 'id'> & { id?: string }) => {
    let updatedList: Transaction[] = [];
    
    if (txData.id) {
      // Edit mode
      updatedList = transactions.map((t) => 
        t.id === txData.id ? { ...t, ...txData } as Transaction : t
      );
    } else {
      // Create mode
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      };
      // Insert at the beginning of the list
      updatedList = [newTx, ...transactions];
    }

    setTransactions(updatedList);
    saveTransactions(updatedList);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const updatedList = transactions.filter((t) => t.id !== id);
    setTransactions(updatedList);
    saveTransactions(updatedList);
    setEditingTransaction(null);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  // Seed / Reset / Diagnostics helper
  const handleResetData = () => {
    localStorage.clear();
    setTransactions(getTransactions());
    setProfile(getProfile());
    setBaseBalance(getBaseBalance());
  };

  const handleAddSampleTransactions = () => {
    const todayStr = getLocalDateString();
    const samples: Transaction[] = [
      {
        id: 'sample-' + Date.now() + '-1',
        title: 'Oylik Maosh',
        amount: 8500000,
        type: 'kirim',
        category: 'Maosh',
        date: todayStr,
        time: '10:00',
        description: 'Kompaniya tomonidan oylik ish haqi',
      },
      {
        id: 'sample-' + Date.now() + '-2',
        title: 'Korzinka xarid',
        amount: 345000,
        type: 'chiqim',
        category: 'Oziq-ovqat',
        date: todayStr,
        time: '12:30',
        items: [
          { id: 'item-s2-1', name: 'Goʻsht va sabzavotlar', price: 215000 },
          { id: 'item-s2-2', name: 'Sut va non', price: 130000 }
        ],
        description: 'Haftalik oziq-ovqat zaxirasi'
      },
      {
        id: 'sample-' + Date.now() + '-3',
        title: 'Yandex Taksi',
        amount: 45000,
        type: 'chiqim',
        category: 'Transport',
        date: todayStr,
        time: '15:15',
        description: 'Ofisdan uyga qaytish'
      },
      {
        id: 'sample-' + Date.now() + '-4',
        title: 'Kitob doʻkoni',
        amount: 180000,
        type: 'chiqim',
        category: 'Taʻlim',
        date: todayStr,
        time: '16:40',
        items: [
          { id: 'item-s4-1', name: 'Gemini AI kitobi', price: 95000 },
          { id: 'item-s4-2', name: 'Moliya darsligi', price: 85000 }
        ]
      },
      {
        id: 'sample-' + Date.now() + '-5',
        title: 'Freelance Loyiha',
        amount: 1200000,
        type: 'kirim',
        category: 'Boshqa',
        date: todayStr,
        time: '18:20',
        description: 'Veb-sayt dizayni uchun'
      }
    ];

    const newList = [...samples, ...transactions];
    setTransactions(newList);
    saveTransactions(newList);
    showWebToast("5 ta test amali muvaffaqiyatli qoʻshildi!");
  };

  const handleImportData = (transactionsJson: string, profileJson?: string): boolean => {
    try {
      const parsedTxs = JSON.parse(transactionsJson);
      if (Array.isArray(parsedTxs)) {
        setTransactions(parsedTxs);
        saveTransactions(parsedTxs);
        
        if (profileJson) {
          const parsedProfile = JSON.parse(profileJson);
          setProfile(parsedProfile);
          saveProfile(parsedProfile);
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Render proper screen based on active tab
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        const getPeriodLabel = () => {
          if (dashboardPeriod === 'bugun') {
            const today = new Date();
            const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
            return `Kunlik: ${today.getDate()}-${getUzbekMonthName(today.getMonth())}, ${days[today.getDay()]}`;
          }
          if (dashboardPeriod === 'hafta') {
            return `Haftalik: ${getWeekRangeLabel(currentWeekMonday)}`;
          }
          return 'Barcha amallar hisoboti';
        };

        return (
          <div className="space-y-6 pt-2 pb-24 px-1 animate-in fade-in-50 duration-300">
            {/* System Announcement Banner */}
            {announcement && (
              <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/5 dark:from-emerald-500/10 dark:via-teal-500/5 dark:to-transparent border-l-4 border-emerald-500 dark:border-emerald-400 p-4 rounded-r-2xl shadow-sm relative overflow-hidden group animate-in slide-in-from-top-4 duration-300">
                <div className="absolute right-2 top-2">
                  <button 
                    onClick={() => {
                      if (announcement) {
                        localStorage.setItem('admin_announcement_dismissed_title', announcement.title);
                      }
                      setAnnouncement(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Radio size={16} className="animate-pulse" />
                  </div>
                  <div className="pr-6 space-y-1">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      {announcement.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                      {announcement.msg}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Card */}
            <BalanceCard 
              balance={currentBalance} 
              currency={profile.currency} 
              percentageChange={percentageChange}
              periodLabel="Jami Mavjud Balans"
              baseBalance={baseBalance}
              accentTheme={profile.accentTheme}
              onUpdateBaseBalance={(newVal) => {
                setBaseBalance(newVal);
                saveBaseBalance(newVal, authUser?.uid);
                setWebToastMessage("Boshlang'ich pul miqdori yangilandi!");
              }}
            />
            
            {/* Period Selector Tabs */}
            <div className="space-y-2">
              <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200/40 dark:border-white/5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setDashboardPeriod('bugun')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    dashboardPeriod === 'bugun'
                      ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm font-extrabold scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays size={14} className={dashboardPeriod === 'bugun' ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
                  <span>Kun</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardPeriod('hafta')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    dashboardPeriod === 'hafta'
                      ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm font-extrabold scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <Calendar size={14} className={dashboardPeriod === 'hafta' ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
                  <span>Hafta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardPeriod('barchasi')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    dashboardPeriod === 'barchasi'
                      ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm font-extrabold scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <Layers size={14} className={dashboardPeriod === 'barchasi' ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
                  <span>Barchasi</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-1.5 px-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-lg truncate whitespace-nowrap">
                  {getPeriodLabel()}
                </span>
                {dashboardPeriod !== 'barchasi' && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md animate-pulse shrink-0 whitespace-nowrap">
                    Auto-Reset Active
                  </span>
                )}
              </div>
            </div>
            
            {/* Income vs Expense Summaries */}
            <IncomeExpenseSummary 
              income={totalIncome} 
              expense={totalExpense} 
              currency={profile.currency} 
            />
            

            {/* Expenses breakdown */}
            <ExpenseBreakdown 
              transactions={filteredTxsForPeriod} 
              onViewAll={() => setActiveTab('insights')} 
              currency={profile.currency}
            />
            
            {/* Recent Transaction rows */}
            <RecentTransactions 
              transactions={transactions} 
              onTransactionClick={handleOpenEditModal}
              onAddClick={handleOpenAddModal}
              currency={profile.currency}
            />
          </div>
        );
      case 'history':
        return (
          <HistoryScreen 
            transactions={transactions} 
            onTransactionClick={handleOpenEditModal}
            currency={profile.currency}
          />
        );
      case 'insights':
        return (
          <InsightsScreen 
            transactions={transactions} 
            currency={profile.currency} 
          />
        );
      case 'profile':
        return (
          <ProfileScreen 
            profile={profile}
            baseBalance={baseBalance}
            onUpdateProfile={handleUpdateProfile}
            onUpdateBaseBalance={handleUpdateBaseBalance}
            onResetData={handleResetData}
            onImportData={handleImportData}
            transactionsJson={JSON.stringify(transactions)}
            transactions={transactions}
            currentBalance={currentBalance}
            onShowWebToast={(msg) => setWebToastMessage(msg)}
            onLogout={handleLogout}
          />
        );
      case 'about':
        return (
          <AboutScreen accentTheme={profile.accentTheme} />
        );
    }
  };

  return (
    <div className="bg-[#faf8ff] dark:bg-[#131b2e] text-[#131b2e] dark:text-[#faf8ff] min-h-screen pb-24 transition-colors duration-200">
      
      {/* Animated App Entrance Splash Screen */}
      <SplashScreen 
        isVisible={showSplash} 
        userName={profile.name} 
        onFinish={() => setShowSplash(false)} 
      />

      {/* Auth Screen for unauthenticated users */}
      {!showSplash && !isAuthLoading && !authUser && !isGuestMode && (
        <AuthScreen 
          onSuccess={() => {}} 
          onContinueAsGuest={() => setIsGuestMode(true)}
        />
      )}

      {/* Main App interface when authenticated or continuing in guest mode */}
      {!showSplash && (!isAuthLoading && (authUser || isGuestMode)) && (
        <>
          {/* Offline / Online Network Status Banners */}
          {isOffline && (
            <div className="fixed top-2 left-3 right-3 z-[99999] max-w-md mx-auto bg-amber-500/95 dark:bg-amber-600/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top-4 duration-300 border border-amber-300/30">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span>📡 Internet uzildi. Ma'lumotlar qurilmangizda xavfsiz saqlanmoqda.</span>
              </div>
            </div>
          )}

          {showBackOnlineToast && !isOffline && (
            <div className="fixed top-2 left-3 right-3 z-[99999] max-w-md mx-auto bg-emerald-600/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top-4 duration-300 border border-emerald-300/30">
              <div className="flex items-center gap-2.5">
                <span>✅ Internet qaytdi. Ma'lumotlar bulut bilan sinxronlandi!</span>
              </div>
            </div>
          )}

          {/* Dynamic SMS Notification Banner Simulation */}
      {webToastMessage && (
        <div className="fixed top-4 left-4 right-4 z-[9999] max-w-sm mx-auto bg-gray-900/95 dark:bg-[#1e293b]/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/10 text-white animate-in slide-in-from-top-12 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#38bdf8] to-[#0284c7] flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/25">
              <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#38bdf8]">NORVA</span>
                <span className="text-[10px] text-gray-400 font-medium font-tabular">Hozir</span>
              </div>
              <p className="text-xs text-gray-100 font-medium mt-1 leading-relaxed">
                {webToastMessage}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3.5 pt-2.5 border-t border-white/5">
            <button
              onClick={() => setWebToastMessage(null)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-[10px] font-bold rounded-lg text-white cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme} 
        avatarUrl={profile.avatarUrl} 
        userName={profile.name}
        userEmail={profile.email}
        accentTheme={profile.accentTheme}
        onAdminClick={handleOpenAdminPanel}
        onLogoClick={() => setShowSplash(true)}
      />

      {/* Main Container */}
      <main className="pt-20 pb-28 px-4 max-w-2xl mx-auto">
        {renderActiveScreen()}
      </main>

      {/* Floating Action Button (FAB) */}
      {activeTab === 'home' && (
        <button 
          onClick={handleOpenAddModal}
          className={`fixed bottom-20 right-4 w-13 h-13 bg-gradient-to-tr ${
            (ACCENT_THEMES[profile.accentTheme || 'blue'] || ACCENT_THEMES.blue).fabGradient
          } text-white rounded-full ${
            (ACCENT_THEMES[profile.accentTheme || 'blue'] || ACCENT_THEMES.blue).fabShadow
          } border border-white/30 flex items-center justify-center z-40 active:scale-90 transition-all duration-200 cursor-pointer`}
          aria-label="Add transaction"
          id="add-transaction-fab"
        >
          <Plus size={26} />
        </button>
      )}

      {/* Liquid Glass Bottom Navigation Bar */}
      <LiquidGlassNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        accentTheme={profile.accentTheme}
      />

      {/* Popover / Overlay Modal for adding/editing transaction */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        editingTransaction={editingTransaction}
        currency={profile.currency}
      />

      {/* Admin Password Authentication Modal Overlay */}
      {isAdminAuthModalOpen && (
        <AdminAuthModal 
          onClose={() => setIsAdminAuthModalOpen(false)}
          onSuccess={(verifiedKey) => {
            setAdminKey(verifiedKey);
            setIsAdminAuthModalOpen(false);
            setIsAdminOpen(true);
          }}
        />
      )}

      {/* Admin Panel Modal Overlay */}
      {isAdminOpen && (
        <AdminPanel 
          adminKey={adminKey}
          onClose={() => setIsAdminOpen(false)}
          onAddSampleTransactions={handleAddSampleTransactions}
          onShowWebToast={showWebToast}
        />
      )}
        </>
      )}

    </div>
  );
}
