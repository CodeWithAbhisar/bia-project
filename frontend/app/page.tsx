"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  Wallet,
  Package,
  Sparkles,
  Plug,
  Bot,
  UploadCloud,
  UserCog,
  Search,
  Bell,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Activity,
  X,
  Send,
  RefreshCw,
  Check,
  FileSpreadsheet,
  ArrowRight,
  Menu,
  Clock,
  DollarSign,
  ShoppingBag,
  Users,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  FileText,
  Trash2,
  LogOut,
  Mail,
  User,
  Layers,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_BASE = "https://bia-project-backend.onrender.com";

// ============================================================================
// INITIAL DATA & TELEMETRY DEFINITIONS
// ============================================================================

const TIMEFRAME_DATA: Record<string, { multiplier: number; growth: string; chart: Array<{ label: string; revenue: number; expenses: number }> }> = {
  "7D": {
    multiplier: 0.24,
    growth: "+12.8%",
    chart: [
      { label: "Mon", revenue: 4820, expenses: 2150 },
      { label: "Tue", revenue: 5490, expenses: 2420 },
      { label: "Wed", revenue: 6120, expenses: 2310 },
      { label: "Thu", revenue: 5840, expenses: 2890 },
      { label: "Fri", revenue: 7240, expenses: 2650 },
      { label: "Sat", revenue: 6910, expenses: 2100 },
      { label: "Sun", revenue: 6430, expenses: 1980 },
    ],
  },
  "30D": {
    multiplier: 1,
    growth: "+18.4%",
    chart: [
      { label: "W1", revenue: 8920, expenses: 4120 },
      { label: "W2", revenue: 10450, expenses: 4680 },
      { label: "W3", revenue: 11280, expenses: 4450 },
      { label: "W4", revenue: 12200, expenses: 4890 },
    ],
  },
  "90D": {
    multiplier: 2.85,
    growth: "+26.2%",
    chart: [
      { label: "Sep", revenue: 36400, expenses: 17200 },
      { label: "Oct", revenue: 41200, expenses: 18100 },
      { label: "Nov", revenue: 44550, expenses: 18400 },
    ],
  },
  "YTD": {
    multiplier: 9.4,
    growth: "+41.6%",
    chart: [
      { label: "Q1", revenue: 88500, expenses: 44200 },
      { label: "Q2", revenue: 104200, expenses: 48900 },
      { label: "Q3", revenue: 118900, expenses: 51400 },
      { label: "Q4", revenue: 132400, expenses: 54100 },
    ],
  },
};

const EMPTY_CHART_DATA = [
  { label: "W1", revenue: 0, expenses: 0 },
  { label: "W2", revenue: 0, expenses: 0 },
  { label: "W3", revenue: 0, expenses: 0 },
  { label: "W4", revenue: 0, expenses: 0 },
];

const INITIAL_INSIGHTS = [
  {
    id: "ins-1",
    severity: "warning",
    category: "Inventory Risk",
    title: "AeroDesk Mat hits stockout in 4 days",
    description:
      "Current velocity (28 units/day) will deplete remaining 112 units before supplier lead time. Draft PO for 250 units?",
    confidence: 96,
    impact: "+$4,200 protected",
    actionLabel: "Draft PO",
    status: "pending",
    prompt: "Analyze the stockout risk for AeroDesk Standing Mat and recommend an optimal reorder quantity.",
  },
  {
    id: "ins-2",
    severity: "opportunity",
    category: "Margin Expansion",
    title: "ErgoChair Pro conversion surged +24%",
    description:
      "Organic checkout rate rose after bundle pricing update. Shifting $1.2k budget here projects +$5.8k incremental revenue.",
    confidence: 91,
    impact: "+$5,800 est. rev",
    actionLabel: "Reallocate",
    status: "pending",
    prompt: "Break down the ErgoChair Pro conversion surge and show projected ROI for reallocating $1,200 in ad spend.",
  },
  {
    id: "ins-3",
    severity: "critical",
    category: "Cashflow Anomaly",
    title: "Fulfillment & SaaS spend up +14.2%",
    description:
      "Agent detected 2 duplicate carrier surcharge billings totaling $640 and an unused analytics seat tier.",
    confidence: 98,
    impact: "$890/mo savings",
    actionLabel: "Flag Invoices",
    status: "pending",
    prompt: "Why did fulfillment and SaaS expenses spike this week? List the duplicate charges.",
  },
];

const INITIAL_FEED = [
  {
    id: "ev-1",
    type: "sale",
    title: "Shopify POS • Order #8492",
    category: "ErgoChair Pro (x2)",
    amount: 798.0,
    units: 2,
    time: "2m ago",
    isNew: false,
  },
  {
    id: "ev-2",
    type: "sale",
    title: "Stripe Checkout • B2B Invoice",
    category: "Studio Desk Bundle (x4)",
    amount: 2140.0,
    units: 4,
    time: "14m ago",
    isNew: false,
  },
  {
    id: "ev-3",
    type: "expense",
    title: "FedEx Fulfillment Settlement",
    category: "Logistics & Shipping",
    amount: 312.5,
    units: 0,
    time: "38m ago",
    isNew: false,
  },
  {
    id: "ev-4",
    type: "sale",
    title: "Shopify Online • Order #8491",
    category: "AeroDesk Standing Mat (x3)",
    amount: 267.0,
    units: 3,
    time: "1h ago",
    isNew: false,
  },
  {
    id: "ev-5",
    type: "sync",
    title: "AI Agent Pipeline Sync",
    category: "248 records reconciled",
    amount: 0,
    units: 0,
    time: "2h ago",
    isNew: false,
  },
];

const INITIAL_INVENTORY = [
  { sku: "ERG-PRO-01", name: "ErgoChair Pro (Graphite)", stock: 184, velocity: "14/day", cover: "13 days", margin: "48%", status: "Optimal" },
  { sku: "AER-MAT-04", name: "AeroDesk Standing Mat", stock: 112, velocity: "28/day", cover: "4 days", margin: "54%", status: "Critical" },
  { sku: "LGT-BAR-09", name: "Halo LED Monitor Bar", stock: 42, velocity: "7/day", cover: "6 days", margin: "61%", status: "Low Stock" },
  { sku: "DSK-STD-02", name: "Studio Sit-Stand Desk 60\"", stock: 95, velocity: "5/day", cover: "19 days", margin: "42%", status: "Optimal" },
  { sku: "CAB-MGT-11", name: "Magnetic Cable Tray Kit", stock: 29, velocity: "6/day", cover: "5 days", margin: "68%", status: "Low Stock" },
  { sku: "DOC-USB-07", name: "Thunderbolt 4 Pro Dock", stock: 140, velocity: "8/day", cover: "17 days", margin: "51%", status: "Optimal" },
];

const INITIAL_INTEGRATIONS = [
  { id: "shopify", name: "Shopify Plus", category: "E-Commerce & POS", connected: true, lastSync: "2m ago", records: "14,280 orders" },
  { id: "stripe", name: "Stripe Billing", category: "Payments & Invoicing", connected: true, lastSync: "Just now", records: "8,912 payouts" },
  { id: "sheets", name: "Google Sheets", category: "Live Spreadsheets", connected: true, lastSync: "15m ago", records: "3 workbooks" },
  { id: "square", name: "Square Retail POS", category: "In-Store Terminals", connected: false, lastSync: "Never", records: "Not linked" },
  { id: "quickbooks", name: "QuickBooks Online", category: "Accounting & Ledger", connected: false, lastSync: "Never", records: "Not linked" },
  { id: "hubspot", name: "HubSpot CRM", category: "Customer & CLV", connected: true, lastSync: "1h ago", records: "3,410 contacts" },
];

const CASHFLOW_CATEGORIES = [
  { category: "Direct Sales", inflow: 28400, outflow: 0 },
  { category: "B2B Contracts", inflow: 14450, outflow: 0 },
  { category: "COGS & Restock", inflow: 0, outflow: 11200 },
  { category: "Fulfillment", inflow: 0, outflow: 3650 },
  { category: "Marketing & Ads", inflow: 0, outflow: 2480 },
  { category: "SaaS & Ops", inflow: 0, outflow: 1420 },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const formatCurrency = (val: number, decimals = 0) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val || 0);
};

// Micro Sparkline SVG for KPI Bento Cards
function MicroSparkline({ data, color = "#4F46E5", isEmpty = false }: { data?: number[]; color?: string; isEmpty?: boolean }) {
  if (isEmpty || !data || data.length < 2) {
    return (
      <svg viewBox="0 0 80 24" className="w-20 h-6 overflow-visible">
        <line
          x1="2"
          y1="14"
          x2="78"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="text-slate-300 dark:text-slate-700"
        />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 76 + 2;
      const y = 21 - ((d - min) / range) * 18;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 80 24" className="w-20 h-6 overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Radial Score Gauge for Inventory Health Index
function RadialScoreGauge({ score, darkMode }: { score: number; darkMode: boolean }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const strokeColor =
    clamped === 0
      ? darkMode
        ? "#334155"
        : "#E2E8F0"
      : clamped >= 80
      ? "#10B981"
      : clamped >= 60
      ? "#F59E0B"
      : "#F43F5E";

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={darkMode ? "#1E293B" : "#F1F5F9"}
          strokeWidth="7"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums leading-none text-slate-900 dark:text-white">
          {clamped}
        </span>
        <span className="text-[10px] font-medium text-slate-400">/100</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function App() {
  // Mount & Token State
  const [isMounted, setIsMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Authentication State
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authError, setAuthError] = useState("");

  // UI/UX Theme & Navigation
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("overview");

  // Mode & Timeframe
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D" | "YTD">("30D");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Business Telemetry
  const [baseRevenue, setBaseRevenue] = useState(42850);
  const [baseExpenses, setBaseExpenses] = useState(18140);
  const [baseUnits, setBaseUnits] = useState(1284);
  const [monthlyGoal] = useState(50000);
  const [insights, setInsights] = useState(INITIAL_INSIGHTS);
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [inventoryFilter, setInventoryFilter] = useState("All");
  const [insightFilter, setInsightFilter] = useState("All");

  // Modals & Overlays
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "warning" | "info" } | null>(null);

  // Transaction Modal Form
  const [txForm, setTxForm] = useState({
    type: "sale",
    amount: "",
    category: "Direct Store Sale",
    units: "1",
    note: "",
  });

  // Copilot Assistant State
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; text: string; timestamp: string }>>([
    {
      id: "m-1",
      role: "assistant",
      text: "Hello! I'm your BIA Executive Agent. I'm continuously monitoring your revenue velocity, cashflow anomalies, and inventory cover. What would you like to inspect?",
      timestamp: "Just now",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Backend User & Files Data
  const [userProfile, setUserProfile] = useState<{ email: string; files: any[] } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Sheets Integration Form
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSyncResult, setSheetSyncResult] = useState("");

  // Toast notifier
  const showToast = (message: string, tone: "success" | "warning" | "info" = "success") => {
    setToast({ message, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3400);
  };

  // Mount initialization & token loading
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("token");
      if (savedToken) setToken(savedToken);
      const savedDark = localStorage.getItem("bia_dark_mode");
      if (savedDark !== null) setDarkMode(savedDark === "true");
    }
  }, []);

  // Sync dark mode preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bia_dark_mode", String(darkMode));
    }
  }, [darkMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCopilotOpen(false);
        setTxModalOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-scroll copilot drawer
  useEffect(() => {
    if (copilotOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, copilotOpen]);

  // Fetch real backend profile & data
  const fetchProfile = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_BASE}/api/user/profile`, config);
      setUserProfile(res.data);
    } catch {}
  };

  const fetchBackendData = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [oRes, cRes, iRes, bRes] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/overview`, config).catch(() => null),
        axios.get(`${API_BASE}/api/analytics/cashflow`, config).catch(() => null),
        axios.get(`${API_BASE}/api/inventory`, config).catch(() => null),
        axios.get(`${API_BASE}/api/bam/live`, config).catch(() => null),
      ]);

      if (oRes?.data?.kpis?.total_revenue && Number(oRes.data.kpis.total_revenue) > 0) {
        setBaseRevenue(Number(oRes.data.kpis.total_revenue));
      }
      if (cRes?.data?.financial_metrics?.burn_rate) {
        setBaseExpenses(Number(cRes.data.financial_metrics.burn_rate) * 4);
      }
      if (iRes?.data?.inventory && Array.isArray(iRes.data.inventory) && iRes.data.inventory.length > 0) {
        const mapped = iRes.data.inventory.map((item: any, idx: number) => ({
          sku: `SKU-${100 + idx}`,
          name: item.category,
          stock: Number(item.remaining) || 50,
          velocity: `${item.sold || 0}/day`,
          cover: `${Math.max(2, Math.round((item.remaining || 50) / Math.max(1, item.sold || 1)))} days`,
          margin: `${Math.round(45 + (idx % 20))}%`,
          status: item.status === "Low Stock" ? "Low Stock" : item.status === "Out of Stock" ? "Critical" : "Optimal",
        }));
        setInventory(mapped);
      }
      if (bRes?.data?.live_stream && Array.isArray(bRes.data.live_stream) && bRes.data.live_stream.length > 0) {
        const streamEvents = bRes.data.live_stream.map((item: any) => ({
          id: `b-ev-${item.id}`,
          type: "sale",
          title: `Online Order • SKU ${item.product_sku || "Direct"}`,
          category: item.category,
          amount: Number(item.amount) || 0,
          units: 1,
          time: item.date || "Today",
          isNew: false,
        }));
        setFeed((prev) => [...streamEvents, ...prev.slice(0, 5)]);
      }
    } catch {}
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchBackendData();
    }
  }, [token]);

  // Derived Metrics
  const metrics = useMemo(() => {
    if (!isDemoMode) {
      return {
        revenue: 0,
        expenses: 0,
        netMargin: 0,
        growth: "0.0%",
        units: 0,
        aov: 0,
        clv: 0,
        goalProgress: 0,
        healthScore: 0,
        lowStockCount: 0,
        chartData: EMPTY_CHART_DATA,
      };
    }

    const tf = TIMEFRAME_DATA[timeframe];
    const scaledRev = Math.round(baseRevenue * tf.multiplier);
    const scaledExp = Math.round(baseExpenses * tf.multiplier);
    const scaledUnits = Math.round(baseUnits * tf.multiplier);
    const aov = scaledUnits > 0 ? scaledRev / (scaledUnits * 0.268) : 0;
    const clv = aov * 5.15;
    const goalProgress = Math.min(100, (baseRevenue / monthlyGoal) * 100);
    const lowStockCount = inventory.filter((i) => i.status !== "Optimal").length;

    return {
      revenue: scaledRev,
      expenses: scaledExp,
      netMargin: scaledRev > 0 ? ((scaledRev - scaledExp) / scaledRev) * 100 : 0,
      growth: tf.growth,
      units: scaledUnits,
      aov,
      clv,
      goalProgress,
      healthScore: Math.max(60, 96 - lowStockCount * 4),
      lowStockCount,
      chartData: tf.chart,
    };
  }, [isDemoMode, timeframe, baseRevenue, baseExpenses, baseUnits, monthlyGoal, inventory]);

  const unreadInsightsCount = useMemo(
    () => (isDemoMode ? insights.filter((i) => i.status === "pending").length : 0),
    [insights, isDemoMode]
  );

  // Google Single Sign-On
  const handleGoogleSuccess = async (response: any) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/google`, { credential: response.credential });
      if (res.data.access_token) {
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
        showToast("Signed in with Google successfully!", "success");
      }
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || "Google authentication failed.");
    }
  };

  useEffect(() => {
    if (token) return;

    const initGoogle = () => {
      const google = (typeof window !== "undefined" ? (window as any).google : null);
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: "686074278877-g6gnoercim8pevjs4mqtkdn3pplhuhbb.apps.googleusercontent.com",
          callback: handleGoogleSuccess,
        });

        const btn = document.getElementById("google-signin-btn");
        if (btn) {
          btn.innerHTML = "";
          google.accounts.id.renderButton(btn, {
            type: "standard",
            theme: darkMode ? "filled_black" : "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 320,
          });
        }
      }
    };

    initGoogle();
    const interval = setInterval(() => {
      if ((typeof window !== "undefined" ? (window as any).google?.accounts?.id : null)) {
        initGoogle();
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [token, darkMode]);

  // Authentication Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (authMode === "register") {
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match. Please try again.");
        return;
      }
      if (password.length < 8) {
        setAuthError("Password must be at least 8 characters long.");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setAuthError("Password must contain at least one uppercase letter (A-Z).");
        return;
      }
      if (!/[a-z]/.test(password)) {
        setAuthError("Password must contain at least one lowercase letter (a-z).");
        return;
      }
      if (!/[0-9]/.test(password)) {
        setAuthError("Password must contain at least one number (0-9).");
        return;
      }
      if (!termsAccepted) {
        setAuthError("You must accept the Terms of Service to create an account.");
        return;
      }
    }

    try {
      if (authMode === "register") {
        setIsSendingOtp(true);
        await axios.post(`${API_BASE}/api/auth/send-otp`, { email });
        setIsOtpStep(true);
        setResendCooldown(60);
      } else {
        const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
        showToast("Welcome back! Workspace loaded.", "success");
      }
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || "Authentication failed.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!otpCode || otpCode.trim().length !== 6) {
      setAuthError("Please enter the complete 6-digit verification code.");
      return;
    }
    try {
      setIsSendingOtp(true);
      const res = await axios.post(`${API_BASE}/api/auth/verify-otp`, {
        email,
        otp: otpCode.trim(),
        password,
        full_name: fullName || undefined,
        company: company || undefined,
      });
      if (res.data.access_token) {
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
        showToast("Registration verified! Welcome to BIA Platform.", "success");
      }
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || "Failed to verify code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    try {
      setAuthError("");
      setIsSendingOtp(true);
      await axios.post(`${API_BASE}/api/auth/send-otp`, { email });
      setResendCooldown(60);
      showToast("A new 6-digit verification code has been sent.", "info");
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || "Failed to resend code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserProfile(null);
    localStorage.removeItem("token");
    showToast("Logged out of workspace.", "info");
  };

  // Interaction Handlers
  const handleExecuteInsight = (id: string) => {
    const target = insights.find((i) => i.id === id);
    if (!target || target.status === "executed") return;

    setInsights((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "executed" } : item))
    );

    if (id === "ins-1") {
      setInventory((prev) =>
        prev.map((item) =>
          item.sku === "AER-MAT-04"
            ? { ...item, stock: item.stock + 250, cover: "13 days", status: "Optimal" }
            : item
        )
      );
    }

    setFeed((prev) => [
      {
        id: `ev-act-${Date.now()}`,
        type: "sync",
        title: `AI Agent Executed: ${target.actionLabel}`,
        category: target.title,
        amount: 0,
        units: 0,
        time: "Just now",
        isNew: true,
      },
      ...prev,
    ]);

    showToast(`Agent executed "${target.actionLabel}" successfully.`, "success");
  };

  const handleAskAgent = (promptText: string) => {
    setCopilotOpen(true);
    if (promptText) {
      handleSendPrompt(promptText);
    }
  };

  const generateAgentResponse = (query: string) => {
    const q = query.toLowerCase();
    if (!isDemoMode) {
      return `Your workspace is currently in **Empty State** with no live telemetry connected. Click **"Try Sample Data"** in the header or connect Shopify/Stripe so I can analyze real-time margins, cashflow, and SKU velocity.`;
    }

    if (q.includes("cashflow") || q.includes("summary") || q.includes("today")) {
      return `**Cashflow Executive Summary (${timeframe}):**\n• Gross Revenue: **${formatCurrency(metrics.revenue)}** (${metrics.growth} vs prior period)\n• Operating Outflows: **${formatCurrency(metrics.expenses)}**\n• Net Operating Margin: **${metrics.netMargin.toFixed(1)}%**\n\nYou are currently at **${metrics.goalProgress.toFixed(1)}%** of your $50,000 monthly target — tracking 6.2% ahead of pace.`;
    }
    if (q.includes("sku") || q.includes("restock") || q.includes("inventory") || q.includes("stockout")) {
      const lowItems = inventory.filter((i) => i.status !== "Optimal");
      if (lowItems.length === 0) {
        return `All **${inventory.length} active SKUs** are currently at optimal stock cover (>12 days). Inventory Health Index is **${metrics.healthScore}/100**.`;
      }
      const list = lowItems
        .map((i) => `• **${i.name}** (${i.sku}): ${i.stock} units left (~${i.cover} cover)`)
        .join("\n");
      return `I detected **${lowItems.length} SKUs** below safety threshold:\n${list}\n\nRecommendation: Trigger automated PO for **AeroDesk Standing Mat** first to protect ~$4,200 in projected weekly sales.`;
    }
    if (q.includes("margin") || q.includes("dip") || q.includes("spike") || q.includes("expense")) {
      return `**Margin & Anomaly Audit:**\nNet margin dipped slightly (-1.4%) over the last 72 hours due to:\n1. **2 duplicate FedEx surcharge billings** ($640 total)\n2. **Seasonal paid-search CPC uptick** (+9% on non-brand terms)\n\nExecuting the *"Flag Invoices"* action in your Executive Brief recovers **$890/mo** immediately.`;
    }
    if (q.includes("forecast") || q.includes("next month")) {
      const projected = Math.round(baseRevenue * 1.184);
      return `**30-Day Revenue Forecast (92% Confidence):**\nBased on current velocity (${metrics.growth} MoM) and ErgoChair Pro conversion lift, next month is projected at **${formatCurrency(projected)}**.\n• Upside scenario: ${formatCurrency(Math.round(projected * 1.09))}\n• Conservative floor: ${formatCurrency(Math.round(projected * 0.94))}`;
    }
    return `Based on live workspace telemetry (**${formatCurrency(metrics.revenue)}** revenue, **${metrics.units.toLocaleString()}** units, **${metrics.netMargin.toFixed(1)}%** net margin), operations are healthy. Would you like me to draft a supplier PO, audit fulfillment costs, or export a board summary?`;
  };

  const handleSendPrompt = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user" as const,
      text,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    // Call backend AI chat if authenticated, else fallback to intelligent simulation
    if (token) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.post(`${API_BASE}/api/ai/chat`, { message: text }, config);
        if (res.data?.reply || res.data?.response) {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: res.data.reply || res.data.response,
              timestamp: "Just now",
            },
          ]);
          setIsTyping(false);
          return;
        }
      } catch {}
    }

    setTimeout(() => {
      const reply = generateAgentResponse(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply,
          timestamp: "Just now",
        },
      ]);
      setIsTyping(false);
    }, 650);
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(txForm.amount);
    const numericUnits = parseInt(txForm.units, 10) || 0;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast("Please enter a valid positive amount.", "warning");
      return;
    }

    if (!isDemoMode) {
      setIsDemoMode(true);
    }

    if (txForm.type === "sale") {
      setBaseRevenue((prev) => prev + numericAmount);
      setBaseUnits((prev) => prev + Math.max(1, numericUnits));
    } else {
      setBaseExpenses((prev) => prev + numericAmount);
    }

    const newEvent = {
      id: `tx-${Date.now()}`,
      type: txForm.type,
      title:
        txForm.note.trim() ||
        (txForm.type === "sale" ? "Manual Store Sale" : "Recorded Business Outflow"),
      category:
        txForm.type === "sale"
          ? `${txForm.category} (x${Math.max(1, numericUnits)})`
          : txForm.category,
      amount: numericAmount,
      units: txForm.type === "sale" ? Math.max(1, numericUnits) : 0,
      time: "Just now",
      isNew: true,
    };

    setFeed((prev) => [newEvent, ...prev]);
    setTxModalOpen(false);
    setTxForm({
      type: "sale",
      amount: "",
      category: "Direct Store Sale",
      units: "1",
      note: "",
    });

    // Also persist to backend if signed in
    if (token) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.post(
          `${API_BASE}/api/bam/quick-sale`,
          {
            amount: numericAmount,
            category: txForm.category,
            source: txForm.note.trim() || "Manual Register POS",
            note: txForm.note.trim() || "POS Entry",
          },
          config
        );
      } catch {}
    }

    showToast(
      `${txForm.type === "sale" ? "Sale" : "Expense"} of ${formatCurrency(numericAmount, 2)} synced to live ledger.`,
      "success"
    );
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              connected: !item.connected,
              lastSync: !item.connected ? "Just now" : "Paused",
              records: !item.connected ? "Syncing stream..." : "Disconnected",
            }
          : item
      )
    );
    const found = integrations.find((i) => i.id === id);
    if (found) {
      showToast(
        `${found.name} ${found.connected ? "disconnected" : "connected & syncing"}.`,
        found.connected ? "warning" : "success"
      );
    }
  };

  const handleAutoReorder = (sku: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? { ...item, stock: item.stock + 150, cover: "18 days", status: "Optimal" }
          : item
      )
    );
    showToast(`AI Agent dispatched automated reorder PO (+150 units) for ${sku}.`, "success");
  };

  const handleSyncGoogleSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSheetUrl) return;
    setIsSyncingSheet(true);
    setSheetSyncResult("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_BASE}/api/bam/google-sheet-sync`, { sheet_url: googleSheetUrl }, config);
      setSheetSyncResult(`✓ Synced ${res.data.rows_imported || "all"} rows from Google Sheets!`);
      showToast("Google Sheet synced to live dashboard.", "success");
      fetchBackendData();
    } catch (e: any) {
      setSheetSyncResult(e.response?.data?.detail || "Make sure your Google Sheet is shared with 'Anyone with the link can view'.");
      showToast("Failed to sync Google Sheet. Check link permissions.", "warning");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !token) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/api/upload`, formData, config);
      setFile(null);
      showToast("File uploaded! AI Agent is analyzing dataset...", "info");
      fetchProfile();
      fetchBackendData();
    } catch (e: any) {
      showToast(e.response?.data?.detail || "Upload failed. Check file format.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_BASE}/api/user/files/${fileId}`, config);
      showToast("File deleted from workspace.", "info");
      fetchProfile();
      fetchBackendData();
    } catch {
      showToast("Failed to delete file.", "warning");
    }
  };

  // Navigation Items
  const navSections = [
    {
      label: "MONITORING & ANALYTICS",
      items: [
        { id: "overview", label: "Overview Dashboard", icon: LayoutDashboard },
        { id: "cashflow", label: "Cashflow Analytics", icon: Wallet },
        { id: "inventory", label: "Inventory Health", icon: Package },
        {
          id: "insights",
          label: "Proactive Insights",
          icon: Sparkles,
          badge: unreadInsightsCount > 0 ? unreadInsightsCount : null,
        },
      ],
    },
    {
      label: "AUTOMATIONS & TOOLS",
      items: [
        { id: "integrations", label: "Store Integrations", icon: Plug },
        { id: "copilot", label: "AI Copilot Assistant", icon: Bot, opensDrawer: true },
        { id: "upload", label: "Upload Datasets", icon: UploadCloud },
      ],
    },
    {
      label: "PREFERENCES",
      items: [{ id: "account", label: "Account & Files", icon: UserCog }],
    },
  ];

  // ============================================================================
  // CONDITIONAL RENDERING: LOADING & AUTHENTICATION
  // ============================================================================

  if (!isMounted) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md animate-pulse">
            <Sparkles size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Initializing BIA Workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Soft Ambient Light Gradient Orbs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-8 sm:p-10 rounded-3xl shadow-xl w-full max-w-[440px] relative z-10 animate-in fade-in duration-300">
          {isOtpStep ? (
            <div className="flex flex-col">
              <div className="flex flex-col items-center justify-center mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center mb-3 shadow-sm">
                  <Mail size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verify Your Email</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-xs">
                  We sent a 6-digit verification code to<br />
                  <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs text-center font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center text-3xl font-extrabold tracking-[10px] font-mono p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/20 text-xs cursor-pointer"
                >
                  {isSendingOtp ? "Verifying Code..." : "Verify & Launch Workspace"}
                </button>
              </form>

              <div className="flex flex-col items-center gap-2.5 mt-5 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-400"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive code? Resend"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setOtpCode("");
                    setAuthError("");
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Back to Registration
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Brand Header */}
              <div className="flex flex-col items-center justify-center mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-md shadow-indigo-500/25">
                  <Sparkles size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">BIA Platform</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    PRO
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Autonomous All-Rounder AI Business Agent</p>
              </div>

              {/* Segmented Auth Mode Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`py-2 rounded-lg transition-all ${
                    authMode === "login"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`py-2 rounded-lg transition-all ${
                    authMode === "register"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Google Single Sign-On */}
              <div className="flex flex-col gap-3 mb-4">
                <div id="google-signin-btn" className="w-full flex justify-center min-h-[44px]">
                  <button 
                    type="button" 
                    onClick={() => {
                      const google = (typeof window !== "undefined" ? (window as any).google : null);
                      if (google?.accounts?.id) {
                        google.accounts.id.prompt();
                      } else {
                        showToast("Google Sign-In is initializing. Please try again.", "info");
                      }
                    }} 
                    className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all font-semibold text-slate-700 dark:text-slate-200 text-xs cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </button>
                </div>
                <div className="relative flex items-center justify-center my-0.5">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase tracking-widest font-semibold absolute">or with email</span>
                </div>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs text-center font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="flex flex-col gap-3.5">
                {authMode === "register" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="Alex Morgan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Company / Brand Name</label>
                      <input
                        type="text"
                        placeholder="Apex Commerce Inc"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Business Email</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {authMode === "register" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-slate-500">I agree to the Terms of Service & Privacy Policy</span>
                    </label>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/20 mt-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  {authMode === "login" ? "Sign In to Workspace" : "Send Verification Code"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB VIEWS
  // ============================================================================

  const renderOverviewDashboard = () => {
    const kpiCards = [
      {
        label: "Total Revenue",
        value: formatCurrency(metrics.revenue),
        delta: isDemoMode ? metrics.growth : "0.0%",
        positive: true,
        icon: DollarSign,
        spark: [32, 36, 35, 41, 44, 48, 52],
        color: "#4F46E5",
      },
      {
        label: "MoM Growth",
        value: isDemoMode ? metrics.growth : "+0.0%",
        delta: isDemoMode ? "+2.4 pts" : "vs last mo",
        positive: true,
        icon: TrendingUp,
        spark: [10, 12, 11, 14, 15, 17, 18.4],
        color: "#10B981",
      },
      {
        label: "Total Units",
        value: metrics.units.toLocaleString(),
        delta: isDemoMode ? "+11.2%" : "0.0%",
        positive: true,
        icon: ShoppingBag,
        spark: [140, 152, 148, 170, 185, 192, 210],
        color: "#4F46E5",
      },
      {
        label: "Avg. Order Value",
        value: formatCurrency(metrics.aov, 2),
        delta: isDemoMode ? "+4.1%" : "0.0%",
        positive: true,
        icon: Zap,
        spark: [115, 118, 117, 121, 120, 123, 124.5],
        color: "#4F46E5",
      },
      {
        label: "Avg. CLV",
        value: formatCurrency(metrics.clv, 0),
        delta: isDemoMode ? "+6.8%" : "0.0%",
        positive: true,
        icon: Users,
        spark: [580, 595, 602, 610, 622, 635, 642],
        color: "#10B981",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Overview Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Executive business performance metrics & autonomous agent telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe Selector */}
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
              {(["7D", "30D", "90D", "YTD"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Export Report */}
            <button
              onClick={() => showToast(`Exported ${timeframe} Executive Report (CSV & PDF).`, "success")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Report
            </button>
          </div>
        </div>

        {/* Smart Onboarding / Active Workspace Banner */}
        {!isDemoMode ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white p-6 shadow-sm">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-[11px] font-medium tracking-wide uppercase">
                  <Sparkles className="w-3 h-3" />
                  Business Workspace Ready
                </div>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                  Connect Your Business Operations to Activate BIA Agent
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Link your POS registers, Stripe billing, or upload historical CSV datasets to
                  unlock real-time cashflow forecasting, stockout alerts, and automated executive briefs.
                </p>

                {/* 3-Step Checklist */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {[
                    { step: "1", label: "Connect POS or CSV", done: false },
                    { step: "2", label: "Map Business Schema", done: false },
                    { step: "3", label: "Activate AI Agent", done: false },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-slate-200"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center text-[10px] font-semibold">
                        {s.step}
                      </span>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                <button
                  onClick={() => setIsDemoMode(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Try Sample Data
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveNav("integrations")}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plug className="w-3.5 h-3.5" />
                    Connect Store & POS
                  </button>
                  <button
                    onClick={() => setActiveNav("upload")}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload Dataset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          !onboardingDismissed && (
            <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">
                    Workspace Pipeline Active (3/3 steps complete)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2 hidden md:inline">
                    Shopify Plus, Stripe Billing & Google Sheets are streaming live telemetry.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveNav("integrations")}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 cursor-pointer"
                >
                  Manage Sources
                </button>
                <button
                  onClick={() => setOnboardingDismissed(true)}
                  aria-label="Dismiss status banner"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}

        {/* Top KPI Bento Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {kpi.label}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      {kpi.value}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md tabular-nums ${
                          !isDemoMode
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {isDemoMode && <ArrowUpRight className="w-3 h-3" />}
                        {kpi.delta}
                      </span>
                    </div>
                  </div>
                  <MicroSparkline data={kpi.spark} color={kpi.color} isEmpty={!isDemoMode} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 12-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left (8 Cols): Revenue & Cashflow Velocity Chart */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Revenue & Cashflow Velocity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparing gross inflow against operating expenses ({timeframe})
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  Revenue
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                  Expenses
                </span>
              </div>
            </div>

            <div className="relative h-[280px] w-full">
              {!isDemoMode && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-[1px] rounded-lg text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2.5">
                    <Activity className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    No cashflow telemetry yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 mb-3">
                    Record a transaction or enable sample data to visualize revenue velocity.
                  </p>
                  <button
                    onClick={() => setIsDemoMode(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Load Demo Telemetry
                  </button>
                </div>
              )}

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.chartData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={darkMode ? "#1E293B" : "#F1F5F9"}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: darkMode ? "#94A3B8" : "#64748B" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: darkMode ? "#94A3B8" : "#64748B" }}
                    tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? "#0F172A" : "#FFFFFF",
                      borderColor: darkMode ? "#1E293B" : "#E2E8F0",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                    }}
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value)),
                      name === "revenue" ? "Revenue" : "Expenses",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#94A3B8"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#expGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right (4 Cols): AI Agent Executive Brief */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    AI Agent Executive Brief
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Proactive actions ranked by ROI
                  </p>
                </div>
              </div>
              {isDemoMode && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {unreadInsightsCount} pending
                </span>
              )}
            </div>

            {!isDemoMode ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                <Bot className="w-7 h-7 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Agent Standby Mode
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Recommendations appear automatically once sales or inventory pipelines connect.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {insights.map((item) => {
                  const isExecuted = item.status === "executed";
                  const badgeStyles =
                    item.severity === "critical"
                      ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20"
                      : item.severity === "warning"
                      ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20"
                      : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20";

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isExecuted
                          ? "border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30 opacity-75"
                          : "border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeStyles}`}>
                          {item.category}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                          {item.confidence}% conf.
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {item.impact}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAskAgent(item.prompt)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            Ask Agent
                          </button>
                          <button
                            disabled={isExecuted}
                            onClick={() => handleExecuteInsight(item.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                              isExecuted
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-default"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                            }`}
                          >
                            {isExecuted ? (
                              <>
                                <Check className="w-3 h-3" /> Done
                              </>
                            ) : (
                              item.actionLabel
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bento Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Target vs Actual */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target vs. Actual
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                    !isDemoMode
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {metrics.goalProgress.toFixed(1)}% of Goal
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {isDemoMode ? formatCurrency(baseRevenue) : "$0"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Goal: {formatCurrency(monthlyGoal)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-700 ease-out"
                  style={{ width: `${metrics.goalProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {isDemoMode ? "Monthly run-rate pace" : "Operational target calibrated"}
              </span>
              <span className={`font-medium ${isDemoMode ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                {isDemoMode ? "+6.2% ahead" : "Awaiting data"}
              </span>
            </div>
          </div>

          {/* Card 2: Inventory Health Index */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Inventory Health Index
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  !isDemoMode
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    : metrics.lowStockCount > 0
                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {!isDemoMode
                  ? "No Data"
                  : metrics.lowStockCount > 0
                  ? `${metrics.lowStockCount} Low Stock`
                  : "All Optimal"}
              </span>
            </div>

            <div className="flex items-center gap-5 my-1">
              <RadialScoreGauge score={metrics.healthScore} darkMode={darkMode} />
              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {!isDemoMode
                    ? "Threshold Monitor Idle"
                    : metrics.healthScore >= 85
                    ? "Strong Stock Coverage"
                    : "Reorder Attention Needed"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {!isDemoMode
                    ? "Connect inventory SKUs to enable automated replenishment alerts."
                    : `Tracking ${inventory.length} core SKUs with 12-day average stock cover.`}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Automated PO threshold active
              </span>
              <button
                onClick={() => setActiveNav("inventory")}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Inspect <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Live Business Velocity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Business Velocity
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>

            {!isDemoMode ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                  0 Events
                </span>
                <span className="text-xs text-slate-400 mt-0.5">
                  ~0/day velocity • Webhooks idle
                </span>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 max-h-[175px] overflow-y-auto pr-1">
                {feed.slice(0, 5).map((ev) => (
                  <div
                    key={ev.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg transition-colors ${
                      ev.isNew
                        ? "bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          ev.type === "sale"
                            ? "bg-emerald-500"
                            : ev.type === "expense"
                            ? "bg-rose-500"
                            : "bg-indigo-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {ev.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {ev.amount > 0 && (
                        <p
                          className={`text-xs font-semibold tabular-nums ${
                            ev.type === "sale"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {ev.type === "sale" ? "+" : "-"}
                          {formatCurrency(ev.amount, 2)}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCashflowView = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Cashflow Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inflow vs outflow breakdown, net operating margin, and liquidity runway.
          </p>
        </div>
        <button
          onClick={() => handleAskAgent("Summarize today's cashflow and margin drivers.")}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask Agent to Audit Margin
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Net Cashflow (30D)", value: formatCurrency(isDemoMode ? baseRevenue - baseExpenses : 0), sub: "+21.4% vs prior month" },
          { label: "Net Operating Margin", value: `${metrics.netMargin.toFixed(1)}%`, sub: "Target benchmark: 55.0%" },
          { label: "Projected 90D Runway", value: isDemoMode ? "18.4 Months" : "—", sub: "Zero debt covenants triggered" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white mt-2">
              {c.value}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Cashflow by Operational Category
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={isDemoMode ? CASHFLOW_CATEGORIES : []} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1E293B" : "#F1F5F9"} />
              <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: darkMode ? "#94A3B8" : "#64748B" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: darkMode ? "#94A3B8" : "#64748B" }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? "#0F172A" : "#FFFFFF",
                  borderColor: darkMode ? "#1E293B" : "#E2E8F0",
                  borderRadius: "10px",
                  fontSize: "12px",
                }}
                formatter={(v: any) => formatCurrency(Number(v))}
              />
              <Bar dataKey="inflow" name="Inflow" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="outflow" name="Outflow" fill="#94A3B8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderInventoryView = () => {
    const filtered = inventory.filter(
      (i) => inventoryFilter === "All" || i.status === inventoryFilter
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Inventory Health
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              SKU velocity tracking, days-of-cover forecasting, and automated PO dispatch.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {["All", "Optimal", "Low Stock", "Critical"].map((st) => (
              <button
                key={st}
                onClick={() => setInventoryFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  inventoryFilter === st
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">SKU / Product</th>
                  <th className="py-3 px-4">On Hand</th>
                  <th className="py-3 px-4">Velocity</th>
                  <th className="py-3 px-4">Days Cover</th>
                  <th className="py-3 px-4">Gross Margin</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Agent Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((item) => (
                  <tr
                    key={item.sku}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-medium text-slate-900 dark:text-white">
                      {item.stock}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                      {item.velocity}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                      {item.cover}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {item.margin}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          item.status === "Optimal"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : item.status === "Low Stock"
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {item.status !== "Optimal" ? (
                        <button
                          onClick={() => handleAutoReorder(item.sku)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          Auto-Reorder
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Monitored</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInsightsView = () => {
    const filtered = insights.filter(
      (i) => insightFilter === "All" || i.status === insightFilter.toLowerCase()
    );
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Proactive Insights
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Autonomous recommendations discovered across sales, fulfillment, and ledger streams.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {["All", "Pending", "Executed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setInsightFilter(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  insightFilter === tab
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {item.confidence}% confidence
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                  {item.impact}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAskAgent(item.prompt)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Ask Agent
                  </button>
                  <button
                    disabled={item.status === "executed"}
                    onClick={() => handleExecuteInsight(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      item.status === "executed"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {item.status === "executed" ? "Executed" : item.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIntegrationsView = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Store Integrations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time webhooks and zero-code data pipelines powering your BIA Agent.
        </p>
      </div>

      {/* 1-Click Google Sheet Sync Form */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            📊
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Google Sheets Live Sync</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Keep your spreadsheet; your BIA Agent auto-syncs live sales</p>
          </div>
        </div>
        <form onSubmit={handleSyncGoogleSheet} className="flex flex-col sm:flex-row gap-2.5 mt-4">
          <input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={isSyncingSheet}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSyncingSheet ? "Syncing Sheet..." : "Sync Sheet Now"}
          </button>
        </form>
        {sheetSyncResult && (
          <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{sheetSyncResult}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((conn) => (
          <div
            key={conn.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {conn.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {conn.category}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  conn.connected
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    conn.connected ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {conn.connected ? "Connected" : "Inactive"}
              </span>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                <p>{conn.records}</p>
                <p className="text-slate-400">Synced: {conn.lastSync}</p>
              </div>
              <button
                onClick={() => handleToggleIntegration(conn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  conn.connected
                    ? "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    : "border-indigo-600 bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {conn.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUploadView = () => (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Upload Datasets
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Ingest CSV, Excel, or JSON transaction ledgers with automatic AI schema mapping.
        </p>
      </div>

      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Drop your POS exports or transaction files here
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Supports .CSV, .XLSX, .JSON up to 50MB • Encrypted & private
        </p>
        
        <div className="flex flex-col items-center gap-3">
          <input
            type="file"
            id="csv-file-picker"
            accept=".csv,.xlsx,.json"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <label
              htmlFor="csv-file-picker"
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              {file ? file.name : "Select CSV from Computer"}
            </label>
            {file && (
              <button
                onClick={handleFileUpload}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? "Processing Dataset..." : "Upload to AI Agent"}
              </button>
            )}
            <button
              onClick={() => {
                setIsDemoMode(true);
                setActiveNav("overview");
                showToast("Sample Q4 Ledger (1,284 rows) mapped & synced.", "success");
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Try Sample CSV Stream
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountView = () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Account & Files
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your BIA Platform PRO workspace, API webhooks, and uploaded files.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Workspace Owner</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{userProfile?.email || email || "Active Workspace"}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
            PRO Tier
          </span>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Appearance Theme
            </p>
            <p className="text-[11px] text-slate-500">
              Switch between crisp executive light and slate dark mode.
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {darkMode ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>

        {/* Uploaded Files Section */}
        {userProfile && userProfile.files && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Uploaded Datasets ({userProfile.files.length})
            </h4>
            {userProfile.files.length === 0 ? (
              <p className="text-xs text-slate-400">No external CSV datasets uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {userProfile.files.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText size={16} className="text-indigo-600 shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-white truncate">{f.filename}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="Delete dataset"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={14} /> Log Out of Workspace
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN LAYOUT SHELL
  // ============================================================================

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
        {/* Mobile Sidebar Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Collapsible Left Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ease-out shrink-0 ${
            sidebarCollapsed ? "w-[68px]" : "w-[240px]"
          } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* Brand Header */}
          <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                      BIA Platform
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30">
                      PRO
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    Business Intelligent Agent
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle sidebar width"
              className="hidden lg:flex w-6 h-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
            {navSections.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <p className="px-2.5 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    {section.label}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id && !item.opensDrawer;

                    return (
                      <button
                        key={item.id}
                        title={sidebarCollapsed ? item.label : undefined}
                        onClick={() => {
                          if (item.opensDrawer) {
                            setCopilotOpen(true);
                          } else {
                            setActiveNav(item.id);
                          }
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          />
                          {!sidebarCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {!sidebarCollapsed && item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-600 text-white tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Profile & Theme Toggle */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80">
            <div
              className={`flex items-center ${
                sidebarCollapsed ? "justify-center" : "justify-between"
              } p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {(userProfile?.email || email || "U").charAt(0).toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {userProfile?.email || email || "Workspace"}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Active
                    </p>
                  </div>
                )}
              </div>

              {!sidebarCollapsed && (
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Sticky Header Bar */}
          <header className="sticky top-0 z-30 h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3">
            {/* Left: Mobile Menu + AI Command Bar Trigger */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCopilotOpen(true)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    Ask BIA Agent anything... e.g., &apos;Why did margin dip?&apos;
                  </span>
                </span>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-400 shrink-0">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Live Status Pill, Demo/Empty Toggle, Record Transaction, Notifications */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Compact Live Status Pill */}
              <div className="hidden xl:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDemoMode ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span>
                  {isDemoMode ? "Agent Live • Synced just now" : "Agent Standby • Empty"}
                </span>
              </div>

              {/* Demo Data / Empty State Segmented Toggle */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium">
                <button
                  onClick={() => setIsDemoMode(true)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    isDemoMode
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Demo Data
                </button>
                <button
                  onClick={() => setIsDemoMode(false)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    !isDemoMode
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Empty State
                </button>
              </div>

              {/* Record Live Transaction Button */}
              <button
                onClick={() => setTxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Record Transaction</span>
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  aria-label="Notifications"
                  className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadInsightsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-3 z-50">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Agent Alerts
                      </span>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {insights.map((ins) => (
                        <button
                          key={ins.id}
                          onClick={() => {
                            setNotifOpen(false);
                            handleAskAgent(ins.prompt);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium text-slate-900 dark:text-white">
                            {ins.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {ins.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Active Page View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {activeNav === "overview" && renderOverviewDashboard()}
            {activeNav === "cashflow" && renderCashflowView()}
            {activeNav === "inventory" && renderInventoryView()}
            {activeNav === "insights" && renderInsightsView()}
            {activeNav === "integrations" && renderIntegrationsView()}
            {activeNav === "upload" && renderUploadView()}
            {activeNav === "account" && renderAccountView()}
          </main>
        </div>

        {/* ====================================================================
            AI COPILOT SLIDE-OVER DRAWER
           ==================================================================== */}
        {copilotOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              onClick={() => setCopilotOpen(false)}
              className="fixed inset-0 bg-slate-900/30 dark:bg-slate-950/60 backdrop-blur-[2px]"
            />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl">
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      BIA Copilot Assistant
                    </h2>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected to live telemetry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCopilotOpen(false)}
                  aria-label="Close copilot"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Executive Prompts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Summarize today's cashflow",
                    "Which SKUs need restocking?",
                    "Forecast next month's revenue",
                    "Why did margin dip?",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSendPrompt(chip)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/70 dark:border-slate-700/70"
                      }`}
                    >
                      {m.text.split("**").map((part, idx) =>
                        idx % 2 === 1 ? (
                          <strong key={idx} className="font-semibold">
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    Analyzing workspace metrics...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrompt();
                }}
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about revenue, SKUs, or forecasts..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isTyping}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            RECORD LIVE TRANSACTION MODAL
           ==================================================================== */}
        {txModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setTxModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-[2px]"
            />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Record Live Transaction
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Instantly updates KPIs, goal pace, and live velocity feed.
                  </p>
                </div>
                <button
                  onClick={() => setTxModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordTransaction} className="p-5 space-y-4">
                {/* Type Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {[
                    { id: "sale", label: "Revenue / Sale" },
                    { id: "expense", label: "Operating Expense" },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() =>
                        setTxForm((prev) => ({
                          ...prev,
                          type: t.id,
                          category:
                            t.id === "sale" ? "Direct Store Sale" : "Logistics & Shipping",
                        }))
                      }
                      className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        txForm.type === t.id
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Amount (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="450.00"
                      value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {txForm.type === "sale" ? "Units Sold" : "Quantity"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={txForm.type === "expense"}
                      value={txForm.units}
                      onChange={(e) => setTxForm({ ...txForm, units: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {txForm.type === "sale" ? (
                      <>
                        <option>Direct Store Sale</option>
                        <option>B2B Wholesale Invoice</option>
                        <option>ErgoChair Pro Bundle</option>
                        <option>Subscription Renewal</option>
                      </>
                    ) : (
                      <>
                        <option>Logistics & Shipping</option>
                        <option>Inventory Restock (COGS)</option>
                        <option>Paid Acquisition Ads</option>
                        <option>SaaS & Cloud Infrastructure</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., POS Register #2 or Invoice #901"
                    value={txForm.note}
                    onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTxModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    Sync Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            TOAST NOTIFICATION
           ==================================================================== */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg text-xs font-medium text-slate-900 dark:text-white animate-in slide-in-from-bottom-2 duration-200">
            {toast.tone === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : toast.tone === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
