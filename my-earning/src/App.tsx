import React, { useState, useEffect } from 'react';
import { 
  Home, 
  LayoutList, 
  Users, 
  Wallet as WalletIcon, 
  User as UserIcon, 
  Globe, 
  Copy, 
  Share2, 
  ChevronRight, 
  Headphones, 
  Send,
  TrendingUp,
  Clock,
  ExternalLink,
  CheckCircle2,
  LogIn,
  LogOut,
  Trash2,
  Bell,
  Play,
  Eye,
  EyeOff,
  Settings2,
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Firebase
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  onAuthStateChanged, 
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  getDocFromServer,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 
export const auth = getAuth(app);

const ADMIN_EMAILS = ['admin@smartquiz.com'];

const SUPPORT_CHANNEL = 'https://t.me/earning_app_support';
const APP_URL = window.location.origin;

// Types
type Tab = 'home' | 'tasks' | 'refer' | 'wallet' | 'profile';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const App = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [language, setLanguage] = useState<'en' | 'bn'>('bn');
  
  // App state linked to Firestore
  const [userProfile, setUserProfile] = useState<{
    balance: number,
    withdrawn: number,
    adsWatched: number,
    referrals: number,
    name: string,
    uid: string,
    referralCode: string,
    lastTaskReset: string,
    dailyStats?: Record<string, number>,
    isBanned?: boolean,
    role?: string
  } | null>(null);

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<number | string | null>(null);
  const [taskTimer, setTaskTimer] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [timeLeft, setTimeLeft] = useState('24:00:00');
  const [withdrawNum, setWithdrawNum] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState({ users: 0, withdrawals: 0, tasks: 0 });
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [newWithdrawalNotify, setNewWithdrawalNotify] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'task' | 'withdrawal'} | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', reward: '0.10', url: '', duration: '15', isActive: true, placement: 'task_list' });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [globalNotify, setGlobalNotify] = useState<string>('');
  const [newGlobalNotify, setNewGlobalNotify] = useState('');
  const [supportLinks, setSupportLinks] = useState({
    facebook: '',
    telegram: '',
    email: '',
    downloadUrl: ''
  });
  const [monetizationTasks, setMonetizationTasks] = useState<any[]>([]);
  const [viewingBountyCode, setViewingBountyCode] = useState<any>(null);
  const [partnerNetworks] = useState([
    { id: 'adsense', name: 'Google AdSense', description: 'Most Trusted Ad Network', reward: 0.50, color: 'from-emerald-600 to-green-400' },
    { id: 'adsterra', name: 'Adsterra', description: 'Social Bar, Popunder, Native Ads', reward: 0.25, color: 'from-blue-600 to-indigo-500' },
    { id: 'monetag', name: 'Monetag', description: 'Smart Link & MultiTag Ads', reward: 0.20, color: 'from-orange-500 to-amber-400' },
    { id: 'propeller', name: 'PropellerAds', description: 'Push & Interstitial Ads', reward: 0.28, color: 'from-cyan-600 to-blue-500' },
    { id: 'media-net', name: 'Media.net', description: 'Contextual Ad Network', reward: 0.35, color: 'from-purple-600 to-pink-500' },
    { id: 'revenue-hits', name: 'RevenueHits', description: 'CPA Performance Network', reward: 0.30, color: 'from-indigo-600 to-violet-500' },
    { id: 'hilltop', name: 'HilltopAds', description: 'Pop & Direct Link Rewards', reward: 0.15, color: 'from-slate-700 to-slate-900' },
    { id: 'popads', name: 'PopAds', description: 'Pop Traffic Monetization', reward: 0.12, color: 'from-amber-600 to-yellow-500' },
    { id: 'clickadu', name: 'Clickadu', description: 'Web & Android Monetizer', reward: 0.18, color: 'from-rose-500 to-pink-400' },
    { id: 'bidvertiser', name: 'BidVertiser', description: 'Small Publisher Support', reward: 0.10, color: 'from-teal-600 to-emerald-500' },
  ]);
  const [isAddingMonetizationTask, setIsAddingMonetizationTask] = useState(false);
  const [newMonetizationTask, setNewMonetizationTask] = useState({
    title: '',
    description: '',
    reward: '0.15',
    type: 'link', // link or code
    content: ''
  });
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userEditForm, setUserEditForm] = useState({
    name: '',
    balance: 0,
    warning: '',
    isBanned: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const t = {
    en: {
      welcome: "Hello,",
      subtitle: "Let's earn something today!",
      balance: "Total Balance",
      withdrawn: "Withdrawn",
      ads: "Ads Watched",
      referrals: "Referrals",
      reset: "Reset in:",
      graph: "Earning Graph (7 Days)",
      tasks: "Tasks",
      taskSubtitle: "All tasks will refresh every 24 hours.",
      visit: "Visit Website 15s",
      reward: "Reward:",
      refer: "Refer",
      referSubtitle: "Invite friends and earn bonus income.",
      referTotal: "Total Earning",
      referLink: "Your Referral Link",
      copy: "Copy",
      share: "Share",
      wallet: "Wallet",
      paymentMethod: "Select Payment Method",
      history: "Withdrawal History",
      processing: "Processing...",
      withdrawNow: "Withdraw in",
      noHistory: "No history found.",
      profile: "Profile",
      language: "Change Language",
      support: "Support & Community",
      supportContact: "Support Contact",
      joinChannel: "Join Channel",
      home: "Home",
      taskTab: "Task",
      referTab: "Refer",
      walletTab: "Wallet",
      profileTab: "Profile"
    },
    bn: {
      welcome: "হ্যালো,",
      subtitle: "চলুন আজকে কিছু ইনকাম করি!",
      balance: "মোট ব্যালেন্স",
      withdrawn: "উত্তোলন",
      ads: "বিজ্ঞাপন দেখা",
      referrals: "রেফারেল",
      reset: "রিসেট হতে বাকি:",
      graph: "ইনকাম গ্রাফ (৭ দিন)",
      tasks: "টাস্ক",
      taskSubtitle: "সব টাস্ক ২৪ ঘণ্টা পর পর নতুন করে আসবে।",
      visit: "ওয়েবসাইট ভিজিট ১৫ সেকেন্ড",
      reward: "পুরস্কার:",
      refer: "রেফার",
      referSubtitle: "বন্ধুদের ইনভাইট করুন এবং বোনাস ইনকাম করুন।",
      referTotal: "মোট ইনকাম",
      referLink: "আপনার রেফারেল লিঙ্ক",
      copy: "কপি",
      share: "শেয়ার",
      wallet: "ওয়ালেট",
      paymentMethod: "পেমেন্ট মেথড সিলেক্ট করুন",
      history: "উত্তোলনের হিস্টোরি",
      processing: "প্রসেসিং হচ্ছে...",
      withdrawNow: "উত্তোলন করুন",
      noHistory: "কোন হিস্টোরি পাওয়া যায়নি।",
      profile: "প্রোফাইল",
      language: "ভাষা পরিবর্তন",
      support: "সাপোর্ট এবং কমিউনিটি",
      supportContact: "সাপোর্ট কন্টাক্ট",
      joinChannel: "চ্যানেলে জয়েন করুন",
      home: "হোম",
      taskTab: "টাস্ক",
      referTab: "রেফার",
      walletTab: "ওয়ালেট",
      profileTab: "প্রোফাইল"
    }
  };

  const currentT = t[language];

  // Helper for reset timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (userProfile?.lastTaskReset) {
        const lastReset = new Date(userProfile.lastTaskReset).getTime();
        const nextReset = lastReset + (24 * 60 * 60 * 1000);
        const now = new Date().getTime();
        const diff = nextReset - now;

        if (diff > 0) {
          const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
          const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
          setTimeLeft(`${h}:${m}:${s}`);
        } else {
          setTimeLeft('00:00:00');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile]);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);

  // Page title and effects
  useEffect(() => {
    const titles: Record<string, string> = {
      home: language === 'bn' ? 'হোম - CASHUP' : 'Home - CASHUP',
      tasks: language === 'bn' ? 'টাস্ক - CASHUP' : 'Tasks - CASHUP',
      refer: language === 'bn' ? 'রেফার - CASHUP' : 'Refer - CASHUP',
      wallet: language === 'bn' ? 'ওয়ালেট - CASHUP' : 'Wallet - CASHUP',
      profile: language === 'bn' ? 'প্রোফাইল - CASHUP' : 'Profile - CASHUP'
    };
    document.title = titles[activeTab] || 'CASHUP';
  }, [activeTab, language]);

  // Admin stats subscription
  useEffect(() => {
    if (isAdmin && user) {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(d => d.data()));
      });
      const unsubAllWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
        setAllWithdrawals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => {
        unsubUsers();
        unsubAllWithdrawals();
      };
    }
  }, [isAdmin, user]);

  // Admin access check
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const ADMIN_EMAILS = ['admin@smartquiz.com'];
      if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user, userProfile?.role]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setUser(null);
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          console.error("Anonymous auth error", error);
          if (error.code === 'auth/admin-restricted-operation') {
            alert('Firebase Console-এ Anonymous Auth এনাবল করা নেই। দয়া করে Authentication > Sign-in method থেকে এটি চালু করুন।');
          }
          setLoading(false);
        }
        return;
      }

      setUser(authUser);
      
      const userDocRef = doc(db, 'users', authUser.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const newProfile = {
            uid: authUser.uid,
            name: 'Earning User',
            balance: 0,
            withdrawn: 0,
            adsWatched: 0,
            referrals: 0,
            referralCode: Math.random().toString(36).substring(7).toUpperCase(),
            lastTaskReset: new Date().toISOString()
          };
          await setDoc(userDocRef, newProfile);
        }
      } catch (error: any) {
        console.error("User profile initialization error:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore Subscriptions
  useEffect(() => {
    if (!user) return;

    // Profile listener
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as any);
      }
      setLoading(false);
    }, (error) => {
      console.error("Profile snapshot error:", error);
      setLoading(false);
      if (user) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    });

    // Withdrawals listener
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('userId', '==', user.uid)
    );
    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      console.error("Withdrawals snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    // Tasks listener
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(list);
      setMonetizationTasks(list.filter((t: any) => t.placement === 'bounty'));
    }, (error) => {
      console.error("Tasks snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    // Global settings listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGlobalNotify(data.notification || '');
        setNewGlobalNotify(data.notification || '');
        setSupportLinks({
          facebook: data.facebook || '',
          telegram: data.telegram || '',
          email: data.email || '',
          downloadUrl: data.downloadUrl || ''
        });
      }
    }, (error) => {
      console.warn("Global Settings error:", error);
    });

    return () => {
      unsubProfile();
      unsubWithdrawals();
      unsubTasks();
      unsubSettings();
    };
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTask !== null && taskTimer > 0) {
      interval = setInterval(() => {
        setTaskTimer((prev) => prev - 1);
      }, 1000);
    } else if (activeTask !== null && taskTimer === 0) {
      handleCompleteTask();
    }
    return () => clearInterval(interval);
  }, [activeTask, taskTimer]);

  const handleCompleteTask = async () => {
    if (!user || activeTask === null) return;
    
    const task = tasks.find(t => t.id === activeTask);
    if (!task) return;
    const reward = Number(task.reward) || 0.100;

    const userDocRef = doc(db, 'users', user.uid);
    const today = getLocalDateString();
    const newDailyStats = { ...(userProfile?.dailyStats || {}) };
    newDailyStats[today] = (newDailyStats[today] || 0) + reward;

    const lastResetTime = userProfile?.lastTaskReset ? new Date(userProfile.lastTaskReset).getTime() : 0;
    const isNewDay = (new Date().getTime() - lastResetTime) > (24 * 60 * 60 * 1000);

    try {
      const updateData: any = {
        balance: (Number(userProfile?.balance) || 0) + reward,
        dailyStats: newDailyStats
      };

      if (isNewDay) {
        updateData.adsWatched = 1;
        updateData.lastTaskReset = new Date().toISOString();
      } else {
        updateData.adsWatched = (Number(userProfile?.adsWatched) || 0) + 1;
      }

      await updateDoc(userDocRef, updateData);
      setActiveTask(null);
      showToast(`${language === 'bn' ? 'টাস্ক সম্পন্ন হয়েছে!' : 'Task Complete!'} ৳${(Number(reward) || 0).toFixed(3)} ${language === 'bn' ? 'ব্যালেন্সে যোগ করা হয়েছে।' : 'added to balance.'}`);
    } catch (error) {
      console.error("Task update error:", error);
      showToast(language === 'bn' ? 'টাস্ক সেভ করতে সমস্যা হয়েছে।' : 'Error saving task.', 'error');
    }
  };

  const handleWithdrawalSubmit = async (accountNum: string, amount: number) => {
    console.log("Submitting withdrawal:", { accountNum, amount, method: selectedMethod });
    const amt = parseFloat(amount.toString());
    if (isNaN(amt) || amt <= 0) {
      showToast(language === 'bn' ? 'সঠিক পরিমাণ দিন।' : 'Please enter a valid amount.', 'error');
      return;
    }

    if (!user || !selectedMethod || (userProfile?.balance || 0) < amt) {
      showToast(language === 'bn' ? 'পর্যাপ্ত ব্যালেন্স নেই।' : 'Insufficient balance.', 'error');
      return;
    }
    
    if (!accountNum) {
      showToast(language === 'bn' ? 'দয়া করে বিকাশ নাম্বার দিন।' : 'Please enter bKash number.', 'error');
      return;
    }
    
    setWithdrawing(true);
    try {
      const withdrawalData = {
        userId: user.uid,
        userName: userProfile?.name || 'User',
        amount: Number(amt),
        method: selectedMethod,
        accountDetails: accountNum,
        status: 'pending',
        trxId: 'TX' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        createdAt: Timestamp.now()
      };
      
      const withdrawalRef = doc(db, 'withdrawals', 'WID' + Math.random().toString(36).substring(2, 9).toUpperCase());
      await setDoc(withdrawalRef, withdrawalData);
      
      const userDocRef = userProfile?.uid ? doc(db, 'users', userProfile.uid) : doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        balance: (Number(userProfile?.balance) || 0) - amt,
        withdrawn: (Number(userProfile?.withdrawn) || 0) + amt
      });
      
      showToast(language === 'bn' 
        ? `উত্তোলন অনুরোধ সফল হয়েছে!\n৳${amt} পাঠানো হয়েছে: ${accountNum}` 
        : `Withdrawal request successful!\n৳${amt} sent to ${accountNum}`);
      setWithdrawAmt('');
      setWithdrawNum('');
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      showToast(language === 'bn' ? `উত্তোলন ব্যর্থ হয়েছে: ${error.message}` : `Withdrawal failed: ${error.message}`, 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleTaskClick = (task: any) => {
    // Check reset logic
    const lastResetTime = userProfile?.lastTaskReset ? new Date(userProfile.lastTaskReset).getTime() : 0;
    const now = new Date().getTime();
    const isNextResetDue = (now - lastResetTime) > (24 * 60 * 60 * 1000);

    // Check limit
    if (userProfile?.lastTaskReset && !isNextResetDue) {
      if (userProfile.adsWatched >= 100) {
        showToast(language === 'bn' ? 'আজকের লিমিট শেষ! দয়া করে কাল আবার চেষ্টা করুন।' : 'Limit reached for today! Please try again tomorrow.', 'info');
        return;
      }
    }

    setActiveTask(task.id);
    // Force at least 15 seconds as requested
    const duration = Math.max(Number(task.duration) || 15, 15);
    setTaskTimer(duration);
    
    // Choose the target URL correctly
    const targetUrl = task.url || (task.type === 'link' ? task.content : null);
    
    if (targetUrl) {
      // Use a temporary anchor to bypass some popup blockers and provide better UX in iframe
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (task.type === 'code' && task.content.includes('show_')) {
      // If it's an ad script but has no direct URL, trigger the script
      try {
        const adFunc = task.content.match(/show_\d+/);
        if (adFunc && typeof (window as any)[adFunc[0]] === 'function') {
          (window as any)[adFunc[0]]();
        } else {
          // Eval fallback for simple scripts
          const script = document.createElement('script');
          script.text = task.content.replace(/<script>|<\/script>/g, '');
          document.body.appendChild(script);
          document.body.removeChild(script);
        }
      } catch (e) {
        console.error("Ad Script Error:", e);
      }
    }
    
    showToast(language === 'bn' ? `টাস্ক শুরু হয়েছে! ${duration} সেকেন্ড অপেক্ষা করুন।` : `Task started! Please wait ${duration}s.`, 'info');
  };

  const handleBountyReward = (reward: number) => {
    const r = Number(reward) || 0.15;
    const newBalance = (Number(userProfile?.balance) || 0) + r;
    const newAdsWatched = (Number(userProfile?.adsWatched) || 0) + 1;
    
    // Update daily stats too
    const today = getLocalDateString();
    const newDailyStats = { ...(userProfile?.dailyStats || {}) };
    newDailyStats[today] = (newDailyStats[today] || 0) + r;

    const lastResetTime = userProfile?.lastTaskReset ? new Date(userProfile.lastTaskReset).getTime() : 0;
    const isNewDay = (new Date().getTime() - lastResetTime) > (24 * 60 * 60 * 1000);

    const updateData: any = {
       balance: newBalance,
       dailyStats: newDailyStats
    };

    if (isNewDay) {
      updateData.adsWatched = 1;
      updateData.lastTaskReset = new Date().toISOString();
    } else {
      updateData.adsWatched = (Number(userProfile?.adsWatched) || 0) + 1;
    }

    updateDoc(doc(db, 'users', user?.uid || ''), updateData);
    showToast(language === 'bn' ? `বোনাস সংগ্রহ হয়েছে: ৳${r.toFixed(3)}` : `Bounty Collected: ৳${r.toFixed(3)}`);
  };

  const [isAdminLoginLoading, setIsAdminLoginLoading] = useState(false);
  const isUserAdmin = isAdmin;

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPass) {
      alert('ইমেইল এবং পাসওয়ার্ড দিন।');
      return;
    }

    if (adminEmail !== 'admin@smartquiz.com') {
      alert('ভুল এডমিন ইমেইল!');
      return;
    }

    setIsAdminLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      setAdminMode(true);
      setAdminEmail('');
      setAdminPass('');
      setShowAdminLogin(false);
      setActiveTab('profile'); // Switch to profile where admin access is
    } catch (error: any) {
      console.error("Admin Login Error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        alert('অ্যাডমিন ডিটেইলস ভুল! দয়া করে নিশ্চিত করুন:\n১. Firebase Console-এ Authentication > Sign-in method-এ Email/Password চালু আছে।\n২. admin@smartquiz.com নামে ইউজার তৈরি করা আছে।\n৩. পাসওয়ার্ড সঠিক দিচ্ছেন।');
      } else if (error.code === 'auth/too-many-requests') {
        alert('অতিরিক্ত চেষ্টার জন্য এই অ্যাকাউন্টটি সাময়িকভাবে ব্লক করা হয়েছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
      } else {
        alert('লগইন ব্যর্থ: ' + error.message);
      }
    } finally {
      setIsAdminLoginLoading(false);
    }
  };

  const loadAdminData = async () => {
    if (!isAdmin) return;
    try {
      const [usersSnap, withdrawsSnap, tasksSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'withdrawals')),
        getDocs(collection(db, 'tasks'))
      ]);
      
      setAllUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setAllWithdrawals(withdrawsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setAdminStats({
        users: usersSnap.size,
        withdrawals: withdrawsSnap.size,
        tasks: tasksSnap.size
      });
    } catch (error: any) {
      console.error("Load Admin Data Error:", error);
    }
  };

  useEffect(() => {
    if (adminMode) {
      loadAdminData();
      const unsubAllWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllWithdrawals(list.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
        
        // Check for new pending withdrawals for notification
        const hasPending = snapshot.docs.some(d => d.data().status === 'pending');
        setNewWithdrawalNotify(hasPending);
      }, (error) => {
        console.warn("All Withdrawals snapshot error (Rules might need update):", error);
        // handleFirestoreError(error, OperationType.LIST, 'withdrawals');
      });
      return () => unsubAllWithdrawals();
    }
  }, [adminMode, isAdmin]);

  const updateWithdrawalStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status });
      alert('Status Updated: ' + status);
      loadAdminData();
    } catch (error: any) {
      console.error("Update Status Error:", error);
      alert('স্ট্যাটাস আপডেট করতে ব্যর্থ: ' + (error.message || 'Permission Denied'));
      handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserEditForm({
      name: user.name || '',
      balance: Number(user.balance) || 0,
      warning: user.warning || '',
      isBanned: !!user.isBanned
    });
    setIsEditingUser(true);
  };

  const saveUserChanges = async () => {
    if (!editingUser) return;
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        name: userEditForm.name,
        balance: Number(userEditForm.balance),
        warning: userEditForm.warning,
        isBanned: userEditForm.isBanned
      });
      showToast('User profile updated successfully', 'success');
      setIsEditingUser(false);
      loadAdminData();
    } catch (error: any) {
      console.error("Save User Error:", error);
      showToast('Error updating user: ' + error.message, 'error');
    }
  };

  const deleteWithdrawal = async (id: string) => {
    setDeleteConfirm({ id, type: 'withdrawal' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    
    try {
      showToast(language === 'bn' ? 'প্রসেসিং...' : 'Processing...');
      
      if (type === 'task') {
        const docRef = doc(db, 'tasks', id);
        console.log(`Deleting task: ${id}`);
        await deleteDoc(docRef);
        setTasks(prev => prev.filter(t => t.id !== id));
      } else {
        const docRef = doc(db, 'withdrawals', id);
        console.log(`Deleting withdrawal: ${id}`);
        await deleteDoc(docRef);
        setAllWithdrawals(prev => prev.filter(w => w.id !== id));
      }
      
      showToast(language === 'bn' ? 'সফলভাবে ডিলিট হয়েছে' : 'Deleted Successfully');
      if (isAdmin) loadAdminData();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error("Delete Action Error:", error);
      const isPermissionDenied = error.code === 'permission-denied' || error.message?.includes('permission');
      const errorMsg = isPermissionDenied 
        ? (language === 'bn' ? 'পারমিশন নেই! আপনি কি এডমিন?' : 'Permission Denied! Are you admin?')
        : (language === 'bn' ? 'ডিলিট করতে ব্যর্থ: ' : 'Delete failed: ') + error.message;
      
      showToast(errorMsg, 'error');
      
      if (isPermissionDenied) {
        console.warn("Possible rule issue. User:", auth.currentUser?.email, "UID:", auth.currentUser?.uid);
      }
      
      setDeleteConfirm(null);
    }
  };

  const addTask = async () => {
    if (!newTaskForm.title || !newTaskForm.url) {
      alert('সবগুলো ঘর পূরণ করুন।');
      return;
    }
    
    try {
      console.log("Saving task to Firestore...");
      await addDoc(collection(db, 'tasks'), {
        title: newTaskForm.title,
        reward: parseFloat(newTaskForm.reward) || 0.1,
        url: newTaskForm.url,
        duration: parseInt(newTaskForm.duration) || 15,
        placement: newTaskForm.placement || 'task_list',
        isActive: true,
        createdAt: Timestamp.now()
      });
      console.log("Task saved successfully");
      showToast('Task Distributed Successfully!');
      setIsAddingTask(false);
      setNewTaskForm({ title: '', reward: '0.10', url: '', duration: '15', isActive: true, placement: 'task_list' });
      loadAdminData();
    } catch (error: any) {
      console.error("Add Task Error:", error);
      alert('Task যোগ করতে ব্যর্থ: ' + (error.message || 'Permission Denied'));
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const toggleTaskStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { isActive: !currentStatus });
      showToast(`Task ${!currentStatus ? 'Activated' : 'Deactivated'}`);
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t));
    } catch (error: any) {
      showToast('Status update failed: ' + error.message, 'error');
    }
  };

  const deleteTask = async (id: string) => {
    setDeleteConfirm({ id, type: 'task' });
  };

  const updateUserBalance = async (uid: string, newBalance: number) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), { balance: Number(newBalance) });
      showToast('User balance successfully updated!');
      loadAdminData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const toggleUserBan = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isBanned: !currentStatus });
      showToast(`User ${!currentStatus ? 'Banned' : 'Unbanned'} Successfully`);
      loadAdminData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const updateGlobalSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { 
        notification: newGlobalNotify,
        facebook: supportLinks.facebook,
        telegram: supportLinks.telegram,
        email: supportLinks.email,
        downloadUrl: supportLinks.downloadUrl
      }, { merge: true });
      showToast('Settings Updated Successfully');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const deleteNotification = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'global'), { notification: '' });
      setNewGlobalNotify('');
      showToast('Notification Deleted');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const addMonetizationTask = async () => {
    if (!newMonetizationTask.title || !newMonetizationTask.content) {
      alert('Fill all fields');
      return;
    }
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newMonetizationTask,
        placement: 'bounty',
        reward: parseFloat(newMonetizationTask.reward),
        createdAt: Timestamp.now()
      });
      showToast('Monetization Task Added');
      setIsAddingMonetizationTask(false);
      setNewMonetizationTask({ title: '', description: '', reward: '0.15', type: 'link', content: '' });
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const deleteMonetizationTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
      showToast('Task Deleted');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const seedDefaultMonetizationTasks = async () => {
    try {
      showToast(language === 'bn' ? 'টাস্ক সেটআপ হচ্ছে...' : 'Seeding tasks...', 'info');
      
      const defaults = [
        { title: 'স্পেশাল বোনাস টাস্ক ১', content: '<script src="https://pl29408564.profitablecpmratenetwork.com/09/c1/b6/09c1b6c4278c25001a2292cd84f410a5.js"></script>', type: 'code', placement: 'bounty', reward: 0.25, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'প্রিমিয়াম রিওয়ার্ড ২', content: '<script async="async" data-cfasync="false" src="https://pl29408578.profitablecpmratenetwork.com/2fddb4e8762d0664d5a6942572e113d5/invoke.js"></script><div id="container-2fddb4e8762d0664d5a6942572e113d5"></div>', type: 'code', placement: 'bounty', reward: 0.20, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ডাইরেক্ট ইনকাম লিঙ্ক', content: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', type: 'link', placement: 'task_list', reward: 0.15, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ব্যানার বোনাস ৪৬৮x৬০', content: `<script>atOptions = {'key' : '75dabfc4442b6d44917cb5b817785dea','format' : 'iframe','height' : 60,'width' : 468,'params' : {}};</script><script src="https://www.highperformanceformat.com/75dabfc4442b6d44917cb5b817785dea/invoke.js"></script>`, type: 'code', placement: 'bounty', reward: 0.12, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ব্যানার বোনাস ৩০০x২৫০', content: `<script>atOptions = {'key' : '807b06e96a15ed97a4e8abf39b08f4d9','format' : 'iframe','height' : 250,'width' : 300,'params' : {}};</script><script src="https://www.highperformanceformat.com/807b06e96a15ed97a4e8abf39b08f4d9/invoke.js"></script>`, type: 'code', placement: 'bounty', reward: 0.18, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ব্যানার বোনাস ১৬০x৬০০', content: `<script>atOptions = {'key' : '87ebe837257d4b5adcf6d28fb84e0151','format' : 'iframe','height' : 600,'width' : 160,'params' : {}};</script><script src="https://www.highperformanceformat.com/87ebe837257d4b5adcf6d28fb84e0151/invoke.js"></script>`, type: 'code', placement: 'bounty', reward: 0.20, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ব্যানার বোনাস ১৬০x৩০০', content: `<script>atOptions = {'key' : 'ffa388406410af14b996fa76cd739973','format' : 'iframe','height' : 300,'width' : 160,'params' : {}};</script><script src="https://www.highperformanceformat.com/ffa388406410af14b996fa76cd739973/invoke.js"></script>`, type: 'code', placement: 'bounty', reward: 0.15, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ব্যানার বোনাস ৩২০x৫০', content: `<script>atOptions = {'key' : '57982b761cb26ba69e2ad4118ff5cc38','format' : 'iframe','height' : 50,'width' : 320,'params' : {}};</script><script src="https://www.highperformanceformat.com/57982b761cb26ba69e2ad4118ff5cc38/invoke.js"></script>`, type: 'code', placement: 'bounty', reward: 0.10, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ব্যানার বোনাস ৭২৮x৯০', content: `<script>atOptions = {'key' : 'f99bd58dab0a2d63feed2aa0b37a8cf0','format' : 'iframe','height' : 90,'width' : 728,'params' : {}};</script><script src="https://www.highperformanceformat.com/f99bd58dab0a2d63feed2aa0b37a8cf0/invoke.js"></script>`, type: 'code', placement: 'bounty', reward: 0.15, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'এক্সট্রা অ্যাব টাস্ক ৪', content: '<script src="https://pl29408588.profitablecpmratenetwork.com/9f/c5/f1/9fc5f19a6d8daaa8916f556575fb7036.js"></script>', type: 'code', placement: 'bounty', reward: 0.30, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'রিওয়ার্ডেড ভিডিও অ্যাড', content: '<script>if(typeof show_10993640 === "function") { show_10993640().then(() => { console.log("Rewarded shown"); }); } else { console.log("Ad function not found"); }</script>', type: 'code', placement: 'bounty', reward: 0.50, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'রিওয়ার্ডেড পপআপ অ্যাড', content: "<script>if(typeof show_10993640 === 'function') { show_10993640('pop').then(() => { console.log('Popup shown'); }); }</script>", type: 'code', placement: 'bounty', reward: 0.40, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
        { title: 'ইন-অ্যাপ ইন্টারস্টিশিয়াল', content: "<script>if(typeof show_10993640 === 'function') { show_10993640({ type: 'inApp', inAppSettings: { frequency: 2, capping: 0.1, interval: 30, timeout: 5, everyPage: false } }); }</script>", type: 'code', placement: 'bounty', reward: 0.35, url: 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534', duration: 15 },
      ];

      for (const item of defaults) {
        await addDoc(collection(db, 'tasks'), {
          ...item,
          description: language === 'bn' ? 'বিজ্ঞাপন দেখে টাকা ইনকাম করুন' : 'Watch ad and earn rewards',
          isActive: true,
          createdAt: Timestamp.now()
        });
      }
      showToast(language === 'bn' ? 'সব টাস্ক লোড হয়েছে!' : 'All Tasks Seeded Successfully');
      if (isAdmin) loadAdminData();
    } catch (error: any) {
      console.error("Seed Error:", error);
      showToast(error.message, 'error');
    }
  };

  const TaskBanner = ({ placement }: { placement: 'home' | 'task_page' | 'wallet' | 'profile' }) => {
    let filtered = tasks.filter(t => t.isActive !== false);
    
    if (placement === 'home') {
      filtered = filtered.filter(t => t.placement === 'home_banner' || t.placement === 'all_banners');
    } else if (placement === 'task_page') {
      filtered = filtered.filter(t => t.placement === 'task_banner' || t.placement === 'all_banners');
    } else if (placement === 'wallet') {
      filtered = filtered.filter(t => t.placement === 'wallet_banner' || t.placement === 'all_banners');
    } else if (placement === 'profile') {
      filtered = filtered.filter(t => t.placement === 'profile_banner' || t.placement === 'all_banners');
    }

    if (filtered.length === 0) return null;
    
    const featuredTask = filtered[Math.floor(Math.random() * filtered.length)];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => handleTaskClick(featuredTask)}
        className="mt-6 mb-2 p-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl text-white relative overflow-hidden cursor-pointer group border border-indigo-400/20"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Sponsored Ad</p>
              <h4 className="font-bold text-sm truncate max-w-[150px]">{featuredTask.title}</h4>
            </div>
          </div>
          <div className="bg-white text-slate-900 text-xs font-black px-4 py-2 rounded-xl group-hover:bg-indigo-400 group-hover:text-white transition-colors">
            ৳{featuredTask.reward}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-16 translate-x-16 blur-3xl"></div>
      </motion.div>
    );
  };

  const getLocalDateString = (date: Date = new Date()) => {
    return date.toLocaleDateString('en-CA');
  };

  const getEarningGraphData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    const now = new Date();
    
    // Generate last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = getLocalDateString(d);
      data.push({
        day: language === 'bn' ? getDayNameBn(d.getDay()) : days[d.getDay()],
        amount: Number(userProfile?.dailyStats?.[dateStr]) || 0
      });
    }
    return data;
  };

  const getDayNameBn = (dayIndex: number) => {
    const bnDays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    return bnDays[dayIndex];
  };

  const earningsData = getEarningGraphData();
  const hasEarningsData = earningsData.some(d => d.amount > 0);

  if (showSplash) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-6 overflow-hidden">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl relative z-10">
            <TrendingUp className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full translate-y-4 scale-150"></div>
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-black tracking-tighter"
        >
          CASHUP
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-indigo-100 font-medium opacity-60"
        >
          EARN REAL MONEY DAILY
        </motion.p>
        
        <div className="absolute bottom-16 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (userProfile?.isBanned && !isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-6">
          <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <LogOut className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Account Suspended</h1>
          <p className="text-slate-500">আপনার অ্যাকাউন্টটি সাময়িকভাবে বন্ধ করা হয়েছে। আরও তথ্যের জন্য সাপোর্টে যোগাযোগ করুন।</p>
          <button 
            onClick={() => window.open(SUPPORT_CHANNEL, '_blank')}
            className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Headphones className="w-5 h-5" /> Contact Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Toast Notification - Global */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold border ${
              toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 
              toast.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : 
              'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal - Global */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {language === 'bn' ? 'ডিলিট করতে চান?' : 'Confirm Delete?'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {language === 'bn' 
                    ? `আপনি কি নিশ্চিতভাবে এই ${deleteConfirm.type === 'task' ? 'টাস্কটি' : 'উত্তোলনটি'} ডিলিট করতে চান? এটি আর ফিরে পাওয়া যাবে না।`
                    : `Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform"
                >
                  {language === 'bn' ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete Now'}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  {language === 'bn' ? 'না, থাক' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Edit Modal - Admin only */}
      <AnimatePresence>
        {isEditingUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Edit User Profile</h3>
                  <p className="text-slate-400 text-xs font-mono">{editingUser?.uid}</p>
                </div>
                <button onClick={() => setIsEditingUser(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Full Name</label>
                  <input 
                    value={userEditForm.name}
                    onChange={e => setUserEditForm({...userEditForm, name: e.target.value})}
                    placeholder="User's Name"
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Current Balance (৳)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={userEditForm.balance}
                        onChange={e => setUserEditForm({...userEditForm, balance: Number(e.target.value)})}
                        className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-2 ring-indigo-500/20 font-black text-indigo-600"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Quick Gift</label>
                      <div className="flex gap-2">
                        {[5, 10, 50].map(amt => (
                          <button 
                            key={amt}
                            onClick={() => setUserEditForm(prev => ({...prev, balance: prev.balance + amt}))}
                            className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-colors"
                          >
                            +৳{amt}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1 flex justify-between">
                    <span>Admin Warning Message</span>
                    <span className="text-rose-500 text-[8px] font-bold">Visible on user dashboard</span>
                  </label>
                  <textarea 
                    value={userEditForm.warning}
                    onChange={e => setUserEditForm({...userEditForm, warning: e.target.value})}
                    placeholder="e.g., Warning: Multiple account detected. Please contact support."
                    rows={3}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-2 ring-rose-500/20 text-sm font-medium"
                  />
                  {userEditForm.warning && (
                    <button 
                      onClick={() => setUserEditForm({...userEditForm, warning: ''})}
                      className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Warning
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${userEditForm.isBanned ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Account Status</p>
                        <p className="text-[10px] text-slate-400 font-medium">{userEditForm.isBanned ? 'User is currently restricted' : 'User profile is active'}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => setUserEditForm({...userEditForm, isBanned: !userEditForm.isBanned})}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${userEditForm.isBanned ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-rose-500 text-white shadow-rose-100'}`}
                   >
                     {userEditForm.isBanned ? 'Unban User' : 'Ban Account'}
                   </button>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  onClick={() => setIsEditingUser(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Discard
                </button>
                <button 
                  onClick={saveUserChanges}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {adminMode ? (
        /* ADMIN PANEL INTERFACE */
        <div className="min-h-screen bg-slate-50 pb-20 p-4 md:p-8">
          {!isUserAdmin ? (
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white text-center space-y-6 max-w-[400px] w-full"
              >
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                  <LogOut className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">অ্যাক্সেস ডিনাইড!</h2>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">
                    আপনি অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করেননি। দয়া করে সঠিক ক্রেডেনশিয়াল ব্যবহার করুন।
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setAdminMode(false);
                    setShowAdminLogin(false);
                    setAdminEmail('');
                    setAdminPass('');
                  }} 
                  className="w-full bg-[#1e293b] text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
                >
                  ফিরে যান
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <LayoutList className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                      Admin Portal
                      {allWithdrawals.some(w => w.status === 'pending') && (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                      )}
                    </h1>
                    <p className="text-slate-500">Manage users, tasks and payments</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAdminMode(false);
                    setShowAdminLogin(false);
                    setAdminEmail('');
                    setAdminPass('');
                  }} 
                  className="w-full md:w-auto bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                >
                  <LogOut className="w-5 h-5" /> Exit Admin
                </button>
              </div>

              {/* Broadcast Notification Control */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <span>Broadcast Notification</span>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      value={newGlobalNotify}
                      onChange={e => setNewGlobalNotify(e.target.value)}
                      placeholder="Message for all users home screen..."
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 ring-indigo-500/20 text-sm font-medium"
                    />
                    {globalNotify && (
                      <button 
                        onClick={deleteNotification}
                        className="absolute right-2 top-1.5 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete current notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={updateGlobalSettings}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Send Notice
                  </button>
                </div>
              </div>

              {/* Support & Download Links Settings */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Settings2 className="text-indigo-500" /> Support & App Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Facebook Page Link</label>
                    <input 
                      value={supportLinks.facebook}
                      onChange={e => setSupportLinks({...supportLinks, facebook: e.target.value})}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Telegram Channel Link</label>
                    <input 
                      value={supportLinks.telegram}
                      onChange={e => setSupportLinks({...supportLinks, telegram: e.target.value})}
                      placeholder="https://t.me/yourchannel"
                      className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Support Email</label>
                    <input 
                      value={supportLinks.email}
                      onChange={e => setSupportLinks({...supportLinks, email: e.target.value})}
                      placeholder="support@example.com"
                      className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">App Download URL</label>
                    <input 
                      value={supportLinks.downloadUrl}
                      onChange={e => setSupportLinks({...supportLinks, downloadUrl: e.target.value})}
                      placeholder="https://drive.google.com/..."
                      className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={updateGlobalSettings}
                  className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-all"
                >
                  Save Global Settings
                </button>
              </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-3xl shadow-lg text-white">
                <p className="text-indigo-100 text-sm font-medium">Total Users</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-4xl font-bold">{adminStats.users}</p>
                  <Users className="w-10 h-10 opacity-20" />
                </div>
             </div>
             <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-3xl shadow-lg text-white">
                <p className="text-rose-100 text-sm font-medium">Pending Withdrawals</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-4xl font-bold">{allWithdrawals.filter(w => w.status === 'pending').length}</p>
                  <WalletIcon className="w-10 h-10 opacity-20" />
                </div>
             </div>
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-lg text-white">
                <p className="text-emerald-100 text-sm font-medium">Active Tasks</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-4xl font-bold">{tasks.length}</p>
                    <button 
                      onClick={() => setIsAddingTask(true)}
                      className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full font-bold transition-colors"
                    >
                      + Add New
                    </button>
                  </div>
                  <LayoutList className="w-10 h-10 opacity-20" />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Management */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <LayoutList className="text-indigo-500" /> Tasks
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          const testRef = doc(collection(db, 'tasks'), 'test-permission');
                          await setDoc(testRef, { test: true, time: Timestamp.now() });
                          await deleteDoc(testRef);
                          alert('Firestore Permission: OK (Success)');
                        } catch (e: any) {
                          alert('Firestore Permission Error: ' + e.message);
                          console.error(e);
                        }
                      }}
                      className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                      Test Rules
                    </button>
                    <button 
                      onClick={() => setIsAddingTask(!isAddingTask)} 
                      className={`${isAddingTask ? 'bg-rose-500' : 'bg-indigo-600'} text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-colors flex items-center gap-2`}
                    >
                      {isAddingTask ? 'Cancel' : <><Send className="w-4 h-4" /> Give Task</>}
                    </button>
                  </div>
               </div>

               {isAddingTask && (
                 <div className="mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Title</label>
                        <input 
                          value={newTaskForm.title}
                          onChange={e => setNewTaskForm({...newTaskForm, title: e.target.value})}
                          placeholder="Task Title"
                          className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none focus:ring-2 ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Reward</label>
                        <input 
                          type="number"
                          value={newTaskForm.reward}
                          onChange={e => setNewTaskForm({...newTaskForm, reward: e.target.value})}
                          placeholder="Reward"
                          className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none focus:ring-2 ring-indigo-500/20"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Duration (Sec)</label>
                        <input 
                          type="number"
                          value={newTaskForm.duration}
                          onChange={e => setNewTaskForm({...newTaskForm, duration: e.target.value})}
                          placeholder="15"
                          className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none focus:ring-2 ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Placement</label>
                        <select 
                          value={newTaskForm.placement}
                          onChange={e => setNewTaskForm({...newTaskForm, placement: e.target.value})}
                          className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none focus:ring-2 ring-indigo-500/20 text-sm font-bold bg-white"
                        >
                          <option value="task_list">Normal Task List</option>
                          <option value="home_banner">Home Page Banner</option>
                          <option value="task_banner">Task Page Banner</option>
                          <option value="wallet_banner">Wallet Page Banner</option>
                          <option value="profile_banner">Profile Page Banner</option>
                          <option value="all_banners">Show Everywhere (Ads)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">URL</label>
                      <input 
                        value={newTaskForm.url}
                        onChange={e => setNewTaskForm({...newTaskForm, url: e.target.value})}
                        placeholder="https://..."
                        className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none focus:ring-2 ring-indigo-500/20"
                      />
                    </div>
                    <button 
                      onClick={addTask}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Publish Task / Ad
                    </button>
                  </div>
               )}
               <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="p-4 border border-slate-50 bg-slate-50/50 rounded-2xl flex justify-between items-center group">
                       <div>
                          <p className="font-bold text-slate-800">{task.title}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">৳{(Number(task.reward) || 0).toFixed(3)}</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{task.duration}s</span>
                            <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">{task.placement || 'task_list'}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <button 
                           onClick={() => toggleTaskStatus(task.id, task.isActive)}
                           className={`p-2 rounded-xl transition-all ${task.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                           title={task.isActive ? "Deactivate" : "Activate"}
                         >
                           {task.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                         </button>
                         <button 
                           onClick={() => deleteTask(task.id)} 
                           className="text-rose-500 p-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all active:scale-90 shadow-sm border border-rose-100 flex items-center justify-center"
                           title="Delete Task"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Monetization Task Management */}
               <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                      <TrendingUp className="text-emerald-500" /> Monetization Tasks
                    </h2>
                    <div className="flex gap-2">
                       <button 
                         type="button"
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           seedDefaultMonetizationTasks();
                         }}
                         className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-white shadow-xl hover:bg-slate-900 transition-all active:scale-90"
                       >
                         Seed Defaults
                       </button>
                       <button 
                         onClick={() => setIsAddingMonetizationTask(!isAddingMonetizationTask)}
                         className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                       >
                         {isAddingMonetizationTask ? 'Cancel' : '+ Add Ad Task'}
                       </button>
                    </div>
                  </div>

                  {isAddingMonetizationTask && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase font-bold text-emerald-600 ml-1">Quick Select Network</label>
                         <select 
                           onChange={(e) => {
                             const net = partnerNetworks.find(p => p.id === e.target.value);
                             if (net) {
                               setNewMonetizationTask({
                                 ...newMonetizationTask,
                                 title: net.name,
                                 description: net.description,
                                 reward: net.reward.toString()
                               });
                             }
                           }}
                           className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none font-bold text-emerald-700"
                         >
                           <option value="">Custom / Manual Entry</option>
                           {partnerNetworks.map(net => (
                             <option key={net.id} value={net.id}>{net.name} (Preset)</option>
                           ))}
                         </select>
                       </div>
                       <input 
                         value={newMonetizationTask.title}
                         onChange={e => setNewMonetizationTask({...newMonetizationTask, title: e.target.value})}
                         placeholder="Provider Title (e.g. Adsterra Direct Link)"
                         className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none font-bold"
                       />
                       <input 
                         value={newMonetizationTask.description}
                         onChange={e => setNewMonetizationTask({...newMonetizationTask, description: e.target.value})}
                         placeholder="Short description for user"
                         className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none text-sm"
                       />
                       <div className="grid grid-cols-2 gap-3">
                         <input 
                           type="number"
                           value={newMonetizationTask.reward}
                           onChange={e => setNewMonetizationTask({...newMonetizationTask, reward: e.target.value})}
                           placeholder="Reward"
                           className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none"
                         />
                         <select 
                           value={newMonetizationTask.type}
                           onChange={e => setNewMonetizationTask({...newMonetizationTask, type: e.target.value})}
                           className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none font-bold"
                         >
                           <option value="link">Direct Link</option>
                           <option value="code">HTML/JS Code</option>
                         </select>
                       </div>
                       <textarea 
                         value={newMonetizationTask.content}
                         onChange={e => setNewMonetizationTask({...newMonetizationTask, content: e.target.value})}
                         placeholder="Target URL or Script Code..."
                         className="w-full p-3 rounded-xl border border-white bg-white/80 outline-none text-sm h-24"
                       />
                       <button 
                         onClick={addMonetizationTask}
                         className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold"
                       >
                         Save Monetization Task
                       </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {monetizationTasks.map(mt => (
                      <div key={mt.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{mt.title}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{mt.type} • ৳{mt.reward}</p>
                        </div>
                        <button onClick={() => deleteMonetizationTask(mt.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
            {/* Column 2: Payout Requests */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-fit">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black flex items-center gap-2 text-slate-800">
                    <WalletIcon className="text-indigo-600" /> Payout Requests
                  </h2>
                  <div className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 uppercase tracking-widest">
                     {allWithdrawals.filter(w => w.status === 'pending').length} Pending
                  </div>
               </div>
               
               <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                  {allWithdrawals.length > 0 ? allWithdrawals.map((w: any) => (
                    <motion.div 
                      key={w.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-[2rem] border transition-all ${w.status === 'pending' ? 'bg-indigo-50/20 border-indigo-100 shadow-xl shadow-indigo-100/10' : 'bg-slate-50/30 border-slate-50'}`}
                    >
                       <div className="flex justify-between items-start">
                          <div className="space-y-2">
                             <p className="font-black text-slate-800 text-lg tracking-tight">
                               {w.userName || 'Anonymous User'}
                             </p>
                             <div className="flex flex-wrap gap-2">
                               <span className="text-[10px] font-black px-3 py-1 bg-white rounded-lg border border-slate-100 text-slate-500 uppercase tracking-tighter">{w.method || 'Bkash'}</span>
                               <span className="text-[10px] font-black px-3 py-1 bg-white rounded-lg border border-slate-100 text-indigo-600 font-mono">{w.accountDetails}</span>
                             </div>
                             <p className="text-[9px] text-slate-400 font-mono">ID: {w.id?.substring(0, 8)}... | TRX: {w.trxId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-2xl font-black text-slate-900 tracking-tighter">৳{(Number(w.amount) || 0).toFixed(2)}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Request Amount</p>
                          </div>
                       </div>
                       
                       {w.status === 'pending' ? (
                         <div className="flex gap-3 mt-6">
                            <button 
                              onClick={() => updateWithdrawalStatus(w.id, 'success')} 
                              className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/10 active:scale-95 transition-all text-xs uppercase tracking-widest"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                if(confirm('Reject payout?')) updateWithdrawalStatus(w.id, 'failed');
                              }} 
                              className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl font-black active:scale-95 transition-all text-xs uppercase tracking-widest"
                            >
                              Reject
                            </button>
                             <button 
                               onClick={() => { if(confirm('Delete permanently?')) deleteWithdrawal(w.id); }} 
                               className="p-4 text-slate-300 hover:text-rose-500 transition-colors"
                             >
                               <Trash2 className="w-5 h-5" />
                             </button>
                         </div>
                       ) : (
                         <div className="mt-6 pt-6 border-t border-slate-100/50 flex justify-between items-center">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest ${
                               w.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                               <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                               {w.status}
                            </div>
                            <button onClick={() => { if(confirm('Delete history?')) deleteWithdrawal(w.id); }} className="text-slate-200 hover:text-rose-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       )}
                    </motion.div>
                  )) : (
                    <div className="py-20 text-center opacity-20">
                       <WalletIcon className="w-12 h-12 mx-auto mb-4" />
                       <p className="font-black text-xs uppercase tracking-[0.2em]">All payouts cleared</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
          
          {/* User List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
               <Users className="text-indigo-500" /> Users List
             </h2>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                     <tr>
                        <th className="pb-4">User Details</th>
                        <th className="pb-4">Wallet</th>
                        <th className="pb-4 text-center">Referrals</th>
                        <th className="pb-4 text-center">Activity</th>
                        <th className="pb-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {allUsers.slice(0, 50).map((u: any, i) => (
                       <tr key={i} className="text-slate-700 hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 transition-transform group-hover:scale-110">
                                {u.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="max-w-[120px]">
                                <p className="font-bold text-sm truncate">{u.name || 'Anonymous'}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate" title={u.uid}>{u.uid}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-indigo-600">৳{(Number(u.balance) || 0).toFixed(3)}</span>
                              <span className="text-[10px] text-slate-400">Withdraw: ৳{(Number(u.withdrawn) || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                              {u.referralsCount || 0}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                             <div className="flex flex-col items-center gap-1">
                               <span className="text-[10px] font-bold text-slate-500">{u.adsWatched || 0} Ads</span>
                               {u.isBanned && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase font-black">Banned</span>}
                             </div>
                          </td>
                          <td className="py-4 text-right">
                             <button 
                               onClick={() => handleEditUser(u)}
                               className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                               title="Edit User Profile"
                             >
                               <Settings2 className="w-4 h-4" />
                             </button>
                           </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>
          </div>
            </div>
          )}
        </div>
      ) : (
        /* USER PANEL INTERFACE */
        <>
          <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 flex items-center justify-between mx-auto max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-100">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">CASHUP</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronRight className="w-6 h-6 rotate-90 text-slate-400" />
              </button>
              <div className="w-1 h-1 bg-slate-300 rounded-full shadow-[0_4px_0_0_rgb(203,213,225),0_8px_0_0_rgb(203,213,225)]"></div>
            </div>
          </header>

          <main className="max-w-md mx-auto p-4">
            {/* Global Notification */}
            <AnimatePresence>
              {globalNotify && activeTab === 'home' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-indigo-600 mb-4 rounded-2xl p-4 text-white relative overflow-hidden group"
                >
                  <div className="flex items-start gap-3 relative z-10">
                    <Bell className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-sm font-medium leading-relaxed">{globalNotify}</p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Admin Notification Button (Hidden Entry) */}
            {isAdmin && newWithdrawalNotify && !adminMode && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="fixed top-20 right-4 z-50 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold cursor-pointer"
                onClick={() => {
                  setAdminMode(true);
                  setActiveTab('profile');
                  showToast('Admin Mode Enabled', 'info');
                }}
              >
                <Bell className="w-4 h-4 animate-bounce" /> New Alert
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Admin Warning message */}
                  {userProfile?.warning && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-rose-50 border-2 border-rose-200 p-5 rounded-3xl text-rose-800 space-y-2 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 font-black text-rose-600">
                        <AlertTriangle className="w-5 h-5" /> 
                        <span>IMPORTANT NOTICE / সতর্কবার্তা</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed relative z-10">{userProfile.warning}</p>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full -translate-y-10 translate-x-10"></div>
                    </motion.div>
                  )}
                  {/* Welcome Section */}
                  <div className="flex justify-between items-center px-2">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentT.welcome} {userProfile?.name?.split(' ')[0] || 'User'}</h2>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{currentT.subtitle}</p>
                    </div>
                    <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm transition-transform active:scale-95 cursor-pointer">
                      <UserIcon className="w-7 h-7" />
                    </div>
                  </div>


                  {/* Balance Card */}
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-100 group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                    
                    <div className="space-y-1 relative z-10 text-center">
                       <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em]">{currentT.balance}</p>
                       <h3 className="text-6xl font-black tracking-tighter tabular-nums flex items-center justify-center gap-2">
                         <span className="text-3xl font-bold opacity-80">৳</span>
                         {(Number(userProfile?.balance) || 0).toFixed(2)}
                       </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-10 relative z-10">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1 backdrop-blur-sm">
                        <p className="text-sm font-black tracking-tight self-center">৳{(Number(userProfile?.withdrawn) || 0).toFixed(2)}</p>
                        <p className="text-[8px] text-white/40 uppercase font-black">{currentT.withdrawn}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1 backdrop-blur-sm">
                        <p className="text-sm font-black tracking-tight">{userProfile?.adsWatched || 0}</p>
                        <p className="text-[8px] text-white/40 uppercase font-black">{currentT.ads}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1 backdrop-blur-sm">
                        <p className="text-sm font-black tracking-tight">{userProfile?.referrals || 0}</p>
                        <p className="text-[8px] text-white/40 uppercase font-black">{currentT.referrals}</p>
                      </div>
                    </div>
                  </div>

              <TaskBanner placement="home" />

              {/* Reset Timer & View Task */}
              <div className="flex flex-col gap-3">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-center gap-3 text-indigo-700 font-semibold shadow-sm">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  <Clock className="w-5 h-5" />
                  <span>{currentT.reset} {timeLeft}</span>
                </div>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className="w-full bg-white border-2 border-indigo-100 text-indigo-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm active:scale-[0.98] transition-transform"
                >
                  <LayoutList className="w-5 h-5" />
                  {language === 'bn' ? 'টাস্ক দেখুন' : 'View Tasks'}
                </button>
              </div>

              {/* Earnings Graph */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">{currentT.graph}</h3>
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="bg-white/40 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.03)] h-64 w-full flex items-center justify-center">
                  {hasEarningsData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={earningsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: [8, 8, 0, 0] }}
                          contentStyle={{ 
                            borderRadius: '24px', 
                            border: '1px solid rgba(255,255,255,0.7)', 
                            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
                            background: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(10px)',
                            padding: '12px 20px'
                          }}
                          itemStyle={{ color: '#4f46e5', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                          labelStyle={{ color: '#94a3b8', fontWeight: 800, marginBottom: '4px', fontSize: '9px' }}
                          formatter={(value: number) => [`৳${value.toFixed(3)}`, language === 'bn' ? 'আয়' : 'EAKING']}
                        />
                        <Bar 
                          dataKey="amount" 
                          radius={[8, 8, 4, 4]} 
                          barSize={32}
                        >
                          {earningsData.map((_entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === earningsData.length - 1 ? '#4f46e5' : '#c7d2fe'}
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center gap-3 opacity-30 py-10">
                      <TrendingUp className="w-12 h-12 text-slate-300" />
                      <p className="font-bold text-sm text-slate-400">
                        {language === 'bn' ? 'কোনো আয়ের তথ্য নেই' : 'No earnings data yet'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between px-2">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">আর্নিং হাব</h2>
                  <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Sequential Rewards System</p>
                </div>
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center border-2 border-white shadow-xl shadow-indigo-100">
                  <LayoutList className="w-8 h-8" />
                </div>
              </div>
              
              <TaskBanner placement="task_page" />
              
              {/* Sequential Task List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                      <h3 className="font-black text-slate-800 text-lg tracking-tight">ভিআইপি টাস্ক</h3>
                   </div>
                   <div className="bg-slate-100 px-4 py-1.5 rounded-full">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Step-by-Step</p>
                   </div>
                </div>
                
                <div className="relative">
                  <div className="absolute left-7 top-0 bottom-0 w-1 bg-slate-50 rounded-full"></div>
                  
                  <div className="space-y-5 relative z-10">
                    {tasks.filter(t => t.isActive !== false && (t.placement === 'task_list' || !t.placement))
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((task, i) => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => handleTaskClick(task)}
                        className={`bg-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_4px_20px_rgb(0,0,0,0.03)] border transition-all cursor-pointer group active:scale-[0.98] ${activeTask === task.id ? 'ring-4 ring-indigo-500/10 border-indigo-500 bg-indigo-50/10' : 'border-slate-100 hover:border-indigo-200'}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 ${activeTask === task.id ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'} rounded-2xl flex items-center justify-center transition-all duration-500`}>
                            <span className="text-xl font-black">{i + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">
                              {language === 'bn' ? task.title || 'ওয়েবসাইট ভিজিট' : task.title || 'Visit Website'}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-black text-xs">৳{(Number(task.reward) || 0).toFixed(3)}</span>
                              <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">{task.duration || 15}s Wait</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <div className={`${activeTask === task.id ? 'bg-indigo-600 animate-pulse' : 'bg-slate-900'} p-3 rounded-2xl text-white shadow-lg`}>
                              <Play className="w-5 h-5 fill-current" />
                           </div>
                           {activeTask === task.id && (
                             <div className="flex flex-col items-end gap-2">
                               <p className="text-[10px] text-indigo-600 font-black animate-bounce">{taskTimer}s Left</p>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const targetUrl = task.url || (task.type === 'link' ? task.content : null);
                                   if (targetUrl) {
                                     const link = document.createElement('a');
                                     link.href = targetUrl;
                                     link.target = '_blank';
                                     link.rel = 'noopener noreferrer';
                                     document.body.appendChild(link);
                                     link.click();
                                     document.body.removeChild(link);
                                   }
                                 }}
                                 className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg hover:bg-indigo-200 transition-colors"
                               >
                                 {language === 'bn' ? 'লিঙ্ক ওপেন' : 'Open Link'}
                               </button>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {tasks.length === 0 && (
                  <div className="bg-white border-2 border-slate-50 border-dashed rounded-[3rem] p-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 group">
                      <LayoutList className="w-10 h-10 group-hover:rotate-12 transition-transform" />
                    </div>
                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Queue is Empty</p>
                  </div>
                )}
              </div>

              {/* Monetization / Ad Tasks from Admin */}
              {monetizationTasks.length > 0 ? (
                <div className="pt-4 space-y-6">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-8 bg-pink-600 rounded-full"></div>
                    <h3 className="font-black text-slate-800 text-lg tracking-tight">বোনাস বাউন্টি</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-5">
                    {monetizationTasks.map((mt, i) => (
                      <motion.div 
                        key={mt.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + (i * 0.1) }}
                        onClick={(e) => {
                          e.preventDefault();
                          
                          // Check reset/limit first
                          const lastResetTime = userProfile?.lastResetTime ? (typeof userProfile.lastResetTime === 'string' ? new Date(userProfile.lastResetTime).getTime() : userProfile.lastResetTime) : (userProfile?.lastTaskReset ? new Date(userProfile.lastTaskReset).getTime() : 0);
                          const now = new Date().getTime();
                          const isNextResetDue = (now - lastResetTime) > (24 * 60 * 60 * 1000);

                          if (userProfile?.lastTaskReset && !isNextResetDue && (Number(userProfile.adsWatched) || 0) >= 100) {
                            showToast(language === 'bn' ? 'আজকের লিমিট শেষ! দয়া করে কাল আবার চেষ্টা করুন।' : 'Limit reached for today! Please try again tomorrow.', 'info');
                            return;
                          }

                          setActiveTask(mt.id);
                          setTaskTimer(15);
                          setViewingBountyCode(mt);
                          
                          if (mt.type === 'link' && mt.content) {
                            const link = document.createElement('a');
                            link.href = mt.content;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                        className="bg-white rounded-[2.5rem] p-7 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:border-pink-200 transition-all group relative overflow-hidden cursor-pointer"
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-400 rounded-3xl shadow-xl flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                               <TrendingUp className="w-8 h-8" />
                            </div>
                            <div>
                               <h4 className="text-xl font-black text-slate-900 tracking-tighter">{mt.title}</h4>
                               <p className="text-[10px] text-slate-400 font-bold uppercase leading-none tracking-widest mt-1">{mt.description || 'Watch Ads & Earn Bonus'}</p>
                            </div>
                          </div>
                          <div className="bg-pink-50 border border-pink-100 px-4 py-3 rounded-2xl text-center">
                             <p className="text-[8px] text-pink-400 font-black uppercase mb-1">Reward</p>
                             <p className="text-xl font-black text-pink-600 tracking-tighter">৳{(Number(mt.reward) || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-10 text-center space-y-4 opacity-40">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto grayscale">
                     <TrendingUp className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">No active bonus bounties</p>
                </div>
              )}

              <div className="pb-16 text-center">
                 <div className="inline-flex items-center gap-2 bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse"></div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">End of task list</p>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'refer' && (
            <motion.div
              key="refer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentT.refer}</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Grow your team</p>
                </div>
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              
              <div className="bg-emerald-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-emerald-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors"></div>
                <h3 className="text-xl font-bold mb-8 relative z-10">{currentT.referSubtitle}</h3>
                
                <div className="flex gap-12 relative z-10">
                  <div className="space-y-1">
                    <p className="text-5xl font-black tracking-tighter">{userProfile?.referrals || 0}</p>
                    <p className="text-emerald-100 text-[10px] uppercase font-black tracking-[0.2em] opacity-60">{currentT.referrals}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-5xl font-black tracking-tighter">৳{(Number((userProfile?.referrals || 0) * 0.5)).toFixed(2)}</p>
                    <p className="text-emerald-100 text-[10px] uppercase font-black tracking-[0.2em] opacity-60">{currentT.referTotal}</p>
                  </div>
                </div>
              </div>

              <TaskBanner placement="profile" />

              <div className="bg-white rounded-[2.5rem] p-8 space-y-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">{currentT.referLink}</p>
                    <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-50 border-dashed text-slate-600 break-all text-xs font-mono flex items-center justify-between group hover:border-emerald-200 transition-colors">
                      <span className="truncate mr-4 opacity-70 italic">{`${APP_URL}/?ref=${userProfile?.referralCode || '...'}`}</span>
                      <button 
                        onClick={() => {
                          if (userProfile?.referralCode) {
                            const url = `${APP_URL}/?ref=${userProfile.referralCode}`;
                            navigator.clipboard.writeText(url);
                            showToast(language === 'bn' ? 'লিঙ্ক কপি করা হয়েছে!' : 'Link copied!');
                          }
                        }}
                        className="p-3 bg-white shadow-sm rounded-xl text-emerald-600 hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                        if (userProfile?.referralCode) {
                          const url = `${APP_URL}/?ref=${userProfile.referralCode}`;
                          navigator.clipboard.writeText(url);
                          showToast(language === 'bn' ? 'কপি সফল!' : 'Copy Success!');
                        }
                    }}
                    className="flex flex-col items-center justify-center gap-2 bg-emerald-600 text-white p-6 rounded-3xl font-black shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all">
                    <Copy className="w-6 h-6" />
                    <span className="text-xs uppercase tracking-widest">{currentT.copy}</span>
                  </button>
                  <button 
                    onClick={() => {
                        const url = `${APP_URL}/?ref=${userProfile?.referralCode}`;
                        const text = `${language === 'bn' ? 'আমার সাথে ইনকাম শুরু করুন! ' : 'Start earning with me! '}`;
                        if (navigator.share) {
                          navigator.share({ title: 'CashUp', text, url }).catch(e => console.log(e));
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
                        }
                    }}
                    className="flex flex-col items-center justify-center gap-2 bg-slate-900 text-white p-6 rounded-3xl font-black shadow-xl shadow-slate-100 active:scale-[0.98] transition-all">
                    <Share2 className="w-6 h-6" />
                    <span className="text-xs uppercase tracking-widest">{currentT.share}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-900">{currentT.wallet}</h2>
              
              <TaskBanner placement="wallet" />

              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-8">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{currentT.paymentMethod}</p>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'bkash', name: 'Bkash', color: 'bg-pink-500', logo: 'B' },
                      { id: 'nagad', name: 'Nagad', color: 'bg-orange-500', logo: 'N' },
                      { id: 'rocket', name: 'Rocket', color: 'bg-purple-600', logo: 'R' },
                    ].map((method) => {
                      if (!selectedMethod) setSelectedMethod('Bkash');
                      
                      return (
                        <button 
                          key={method.id} 
                          onClick={() => setSelectedMethod(method.name)}
                          className={`flex items-center justify-between px-6 py-5 border-2 rounded-2xl transition-all active:scale-[0.98] group relative overflow-hidden ${selectedMethod === method.name ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                        >
                          <div className="flex items-center gap-4 relative z-10">
                            <div className={`w-12 h-12 ${method.color} text-white font-black text-xl flex items-center justify-center rounded-xl shadow-lg shadow-indigo-100 group-hover:rotate-12 transition-transform`}>
                              {method.logo}
                            </div>
                            <span className={`text-lg font-black tracking-tight ${selectedMethod === method.name ? 'text-indigo-600' : 'text-slate-700'}`}>{method.name}</span>
                          </div>
                          {selectedMethod === method.name && (
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center relative z-10">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                          <div className={`absolute right-0 top-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl transition-opacity ${selectedMethod === method.name ? 'opacity-100' : 'opacity-0'}`}></div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedMethod && (
                  <div className="space-y-6 pt-6 border-t border-slate-50">
                    <div className="space-y-3">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">{language === 'bn' ? 'বিকাশ নাম্বার দিন' : `${selectedMethod} Number`}</p>
                       <input 
                         type="tel" 
                         value={withdrawNum}
                         onChange={(e) => setWithdrawNum(e.target.value)}
                         className="w-full p-6 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none font-black text-xl tracking-tighter transition-all placeholder:text-slate-300"
                         placeholder="017XXXXXXXX"
                       />
                    </div>
                    <div className="space-y-3">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">{language === 'bn' ? 'উত্তোলন পরিমাণ (৳)' : 'Pledge Amount (৳)'}</p>
                       <div className="relative">
                          <input 
                            type="number" 
                            value={withdrawAmt}
                            onChange={(e) => setWithdrawAmt(e.target.value)}
                            className="w-full p-6 pr-20 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none font-black text-3xl tracking-tighter transition-all placeholder:text-slate-300"
                            placeholder="0.00"
                          />
                          <button 
                            onClick={() => setWithdrawAmt((Number(userProfile?.balance) || 0).toFixed(0))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                          >
                            MAX
                          </button>
                       </div>
                       <p className="text-[10px] text-slate-400 text-center font-bold px-1 mt-1">
                          {language === 'bn' ? 'সর্বনিম্ন ১০ টাকা উত্তোলন লিমিট' : 'Minimum Withdrawal Limit: ৳10.00'}
                       </p>
                    </div>
                    <button
                      onClick={() => {
                        const amt = parseFloat(withdrawAmt);
                        if (isNaN(amt) || amt < 10) {
                          alert(language === 'bn' ? 'সর্বনিম্ন ১০ টাকা হতে হবে।' : 'Minimum ৳10 required.');
                          return;
                        }
                        handleWithdrawalSubmit(withdrawNum, amt); 
                      }}
                      disabled={withdrawing}
                      className="w-full bg-slate-900 text-white p-6 rounded-[1.5rem] font-black text-xl tracking-tight shadow-2xl shadow-indigo-100 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
                    >
                      {withdrawing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          {currentT.processing}
                        </>
                      ) : (
                        <>
                          <WalletIcon className="w-6 h-6" />
                          {currentT.withdrawNow}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800">{currentT.history}</h3>
                {withdrawals.length > 0 ? withdrawals.map((w, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6 mb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-indigo-50 flex items-center justify-center rounded-2xl">
                           <WalletIcon className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{w.method}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">TRX: {w.trxId}</p>
                          <p className="text-xs text-slate-500 mt-2 font-medium">{w.accountDetails}</p>
                        </div>
                      </div>
                        <div className="text-right space-y-2">
                           <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest ${
                             w.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                             w.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                             'bg-amber-50 text-amber-600 border border-amber-100'
                           }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'success' ? 'bg-emerald-500' : w.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`}></span>
                              {language === 'bn' ? 
                                (w.status === 'success' ? 'সফল' : w.status === 'pending' ? 'অপেক্ষমান' : 'ব্যর্থ') : 
                                w.status}
                           </div>
                           <p className="text-2xl font-black text-slate-900 tracking-tighter">৳{(Number(w.amount) || 0).toFixed(2)}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                             {w.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                           </p>
                        </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-400 py-8">{currentT.noHistory}</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentT.profile}</h2>
                <button 
                   onClick={() => auth.signOut()}
                   className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center space-y-6 group">
                <div 
                  onClick={() => {
                    setSecretClickCount(prev => {
                      const next = prev + 1;
                      if (next >= 10) {
                        if (isAdmin) {
                          setAdminMode(true);
                          setActiveTab('profile');
                        } else {
                          setShowAdminLogin(true);
                        }
                        return 0;
                      }
                      return next;
                    });
                  }}
                  className="w-32 h-32 bg-slate-50 border border-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-300 shadow-inner relative overflow-hidden cursor-pointer group-hover:scale-105 transition-transform"
                >
                  <UserIcon className="w-16 h-16 group-hover:text-indigo-500 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 to-indigo-500/5"></div>
                </div>
                <div className="space-y-2">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tight">{userProfile?.name?.split(' ')[0] || 'User'}</h3>
                   <div className="flex items-center justify-center gap-2">
                     <p className="text-slate-400 font-bold text-xs bg-slate-50 px-3 py-1 rounded-full border border-slate-100">ID: {userProfile?.uid?.substring(0, 12)}...</p>
                     <button 
                       onClick={() => {
                         if (userProfile?.uid) {
                           navigator.clipboard.writeText(userProfile.uid);
                           showToast('UID copied');
                         }
                       }}
                       className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
                     >
                       <Copy className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              </div>

              <TaskBanner placement="profile" />

              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
                <div className="flex items-center gap-2 mb-2 ml-1">
                   <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                   <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">{currentT.language}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`p-6 rounded-2xl border-2 transition-all active:scale-[0.98] ${language === 'en' ? 'bg-indigo-600 text-white border-indigo-600 font-black shadow-lg shadow-indigo-100' : 'border-slate-50 text-slate-600 bg-slate-50/50 hover:border-slate-200'}`}
                  >
                    ENGLISH
                  </button>
                  <button 
                    onClick={() => setLanguage('bn')}
                    className={`p-6 rounded-2xl border-2 transition-all active:scale-[0.98] ${language === 'bn' ? 'bg-indigo-600 text-white border-indigo-600 font-black shadow-lg shadow-indigo-100' : 'border-slate-50 text-slate-600 bg-slate-50/50 hover:border-slate-200'}`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2 ml-1">
                   <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                   <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">{currentT.support}</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {supportLinks.facebook && (
                    <button 
                      onClick={() => window.open(supportLinks.facebook, '_blank')}
                      className="w-full flex items-center justify-between p-6 rounded-2xl bg-blue-50/50 border border-blue-100 text-blue-700 font-bold hover:bg-blue-100 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Globe className="w-5 h-5" />
                        </div>
                        <span className="tracking-tight">Facebook Page</span>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-30" />
                    </button>
                  )}

                  {supportLinks.telegram && (
                    <button 
                      onClick={() => window.open(supportLinks.telegram, '_blank')}
                      className="w-full flex items-center justify-between p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Send className="w-5 h-5" />
                        </div>
                        <span className="tracking-tight">Telegram Channel</span>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-30" />
                    </button>
                  )}

                  {supportLinks.downloadUrl && (
                    <button 
                      onClick={() => window.open(supportLinks.downloadUrl, '_blank')}
                      className="w-full flex items-center justify-center gap-3 p-6 rounded-3xl bg-slate-900 text-white font-black hover:bg-slate-800 shadow-xl active:scale-[0.98] transition-all mt-4"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      DOWNLOAD MOBILE APP
                    </button>
                  )}
                </div>

                {!supportLinks.facebook && !supportLinks.telegram && !supportLinks.email && (
                  <div className="text-center p-8 text-slate-300 text-xs font-bold uppercase tracking-widest italic bg-slate-50 rounded-2xl border border-dashed border-slate-100">
                    Syncing Support Channels...
                  </div>
                )}
              </div>


            </motion.div>
          )}
                  {showAdminLogin && (
                    <div className="mt-8 p-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-4">
                       <p className="text-xs text-slate-400 text-center uppercase tracking-widest font-bold">System Log</p>
                       <div className="space-y-3">
                          <div className="bg-amber-50 p-2 rounded-xl text-[10px] text-amber-700">Click profile 10x to bypass if authorized.</div>
                          
                          {isAdmin && (
                            <button 
                              onClick={() => {
                                setAdminMode(true);
                                setActiveTab('profile');
                                setShowAdminLogin(false);
                              }}
                              className="w-full p-4 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                            >
                              <ShieldCheck className="w-4 h-4" /> Continue as {user?.email?.split('@')[0]}
                            </button>
                          )}

                          <input 
                            type="email" 
                            placeholder="Email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white border border-slate-100 outline-none text-sm"
                          />
                          <input 
                            type="password" 
                            placeholder="Key"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white border border-slate-100 outline-none text-sm"
                          />
                          <button 
                            onClick={handleAdminLogin}
                            disabled={isAdminLoginLoading}
                            className="w-full p-3 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                          >
                             {isAdminLoginLoading ? 'Verifying...' : 'Authenticate'}
                          </button>
                          <button 
                            onClick={() => {
                              setShowAdminLogin(false);
                              setAdminEmail('');
                              setAdminPass('');
                            }}
                            className="w-full text-xs text-slate-400 font-medium py-1"
                          >
                            Cancel
                          </button>
                       </div>
                    </div>
                  )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex items-center justify-between z-20 max-w-md mx-auto rounded-t-[2.5rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
        >
          <Home className={activeTab === 'home' ? 'animate-bounce-short' : ''} size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className={`text-[10px] font-bold ${activeTab === 'home' ? 'opacity-100' : 'opacity-70'}`}>{currentT.home}</span>
        </button>

        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'tasks' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
        >
          <LayoutList className={activeTab === 'tasks' ? 'animate-bounce-short' : ''} size={24} strokeWidth={activeTab === 'tasks' ? 2.5 : 2} />
          <span className={`text-[10px] font-bold ${activeTab === 'tasks' ? 'opacity-100' : 'opacity-70'}`}>{currentT.taskTab}</span>
        </button>

        <button 
          onClick={() => setActiveTab('refer')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'refer' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
        >
          <Users className={activeTab === 'refer' ? 'animate-bounce-short' : ''} size={24} strokeWidth={activeTab === 'refer' ? 2.5 : 2} />
          <span className={`text-[10px] font-bold ${activeTab === 'refer' ? 'opacity-100' : 'opacity-70'}`}>{currentT.referTab}</span>
        </button>

        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'wallet' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
        >
          <WalletIcon className={activeTab === 'wallet' ? 'animate-bounce-short' : ''} size={24} strokeWidth={activeTab === 'wallet' ? 2.5 : 2} />
          <span className={`text-[10px] font-bold ${activeTab === 'wallet' ? 'opacity-100' : 'opacity-70'}`}>{currentT.walletTab}</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'profile' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
        >
          <UserIcon className={activeTab === 'profile' ? 'animate-bounce-short' : ''} size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          <span className={`text-[10px] font-bold ${activeTab === 'profile' ? 'opacity-100' : 'opacity-70'}`}>{currentT.profileTab}</span>
        </button>
      </nav>

      {/* Global Modals Container */}
      <div className="relative z-[200]">
        {/* Bounty Code Viewer Modal */}
        <AnimatePresence>
          {viewingBountyCode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[210] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] p-8 w-full max-w-lg shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-12 -mt-12"></div>
                
                <div className="flex justify-between items-start relative z-10 mb-8">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{viewingBountyCode.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <p className="text-emerald-600 text-[10px] uppercase font-black tracking-widest"> {language === 'bn' ? 'বোনাস রিওয়ার্ড:' : 'Bonus Reward:'} ৳{Number(viewingBountyCode.reward).toFixed(2)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingBountyCode(null)} 
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative min-h-[160px] bg-slate-50 rounded-[1.8rem] p-6 flex items-center justify-center border border-slate-100 overflow-hidden">
                    <div 
                      ref={(el) => {
                        if (el && viewingBountyCode?.content) {
                          el.innerHTML = '';
                          try {
                            const container = document.createElement('div');
                            container.innerHTML = viewingBountyCode.content;
                            
                            const scripts = container.querySelectorAll('script');
                            scripts.forEach(oldScript => {
                              const newScript = document.createElement('script');
                              Array.from(oldScript.attributes).forEach(attr => {
                                newScript.setAttribute(attr.name, attr.value);
                              });
                              
                              if (oldScript.innerHTML) {
                                newScript.innerHTML = oldScript.innerHTML;
                              }
                              
                              oldScript.parentNode?.removeChild(oldScript);
                              el.appendChild(newScript);
                            });
                            
                            el.insertAdjacentHTML('beforeend', container.innerHTML);
                          } catch (err) {
                             console.error("Ad Code Error:", err);
                             el.innerHTML = `<div class="text-[10px] text-slate-400 font-mono break-all">${viewingBountyCode.content}</div>`;
                          }
                        }
                      }}
                      className="w-full h-full flex items-center justify-center"
                    />
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed px-4">
                    উপরে আপনার অ্যাড চলছে। ১৫ সেকেন্ড অপেক্ষা করুন এবং তারপর রিওয়ার্ড সংগ্রহ করুন।
                  </p>
                  
                  {activeTask === viewingBountyCode?.id && (
                    <div className="flex justify-center mb-2">
                       <div className="bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                          <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase">
                            Please wait: <span className="text-sm">{taskTimer}s</span>
                          </p>
                       </div>
                    </div>
                  )}

                  <button 
                    disabled={activeTask === viewingBountyCode?.id && taskTimer > 0}
                    onClick={() => {
                      // Use the provided URL, or the content if it's a link, or a fallback monetization link
                      const fallbackUrl = 'https://www.profitablecpmratenetwork.com/m3ipyyv12?key=b46cfa3d34096d8aa556c805756eb534';
                      const targetUrl = viewingBountyCode.url || (viewingBountyCode.type === 'link' ? viewingBountyCode.content : fallbackUrl);
                      
                      if (targetUrl) {
                        try {
                          const link = document.createElement('a');
                          link.href = targetUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } catch (err) {
                          console.error("Popup Error:", err);
                          window.open(targetUrl, '_blank');
                        }
                      }
                      
                      handleBountyReward(Number(viewingBountyCode.reward));
                      setViewingBountyCode(null);
                      setActiveTask(null);
                    }}
                    className={`w-full py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-3 ${
                      (activeTask === viewingBountyCode?.id && taskTimer > 0)
                        ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                        : 'bg-indigo-600 text-white shadow-indigo-200'
                    }`}
                  >
                    <WalletIcon className="w-5 h-5" /> 
                    {activeTask === viewingBountyCode?.id && taskTimer > 0 ? `${language === 'bn' ? 'অপেক্ষা করুন' : 'Wait'} (${taskTimer}s)` : (language === 'bn' ? 'ক্লেইম রিওয়ার্ড' : 'Claim Reward')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )}
  </div>
);
};

export default App;
