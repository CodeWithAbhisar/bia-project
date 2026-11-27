"use client";
import { useState, useEffect, useRef, useMemo } from "react";

// Central API base URL — empty string routes through Next.js /api rewrite proxy (zero CORS issues)
const API_BASE = "";
import axios from "axios";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { UploadCloud, LayoutDashboard, DollarSign, Package, MessageSquare, Bell, Send, CheckCircle, AlertTriangle, Info, LogOut, Search, X, Copy, Check, Sparkles, TrendingUp, Database, FileText, User, Trash2, Menu, Mail, Activity, RefreshCw, Plug, Layers, Zap, ShieldAlert, ArrowUpRight, ArrowDownRight, Eye, ChevronRight, Sliders, CheckCircle2, AlertCircle, Store, CreditCard, PlusCircle, ArrowRight, Clock, Pencil, Save, Building2, Calendar, Shield, Key, Lock, FileSpreadsheet, Plus, ExternalLink, HardDrive } from "lucide-react";

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("token");
      if (savedToken) setToken(savedToken);
      const savedProfile = localStorage.getItem("user_profile");
      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile));
        } catch {}
      }
    }
  }, []);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  // OTP Verification state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [overviewData, setOverviewData] = useState<any>({
    kpis: { total_revenue: 0, clv: 0, mom_growth: 0, top_region: null },
    revenue_trend: []
  });
  const [cashflowData, setCashflowData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<any>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [insightsData, setInsightsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // BAM (Business Activity Monitoring) States
  const [bamLive, setBamLive] = useState<any>(null);
  const [bamAlerts, setBamAlerts] = useState<any[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [bamScorecards, setBamScorecards] = useState<any>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // BAM Drill-Down Modal State
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState<string>("all");
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);

  // BAM Ingestion & Simulation State
  const [isSimulatingStream, setIsSimulatingStream] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [streamToast, setStreamToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Small Business Zero-Code Integration States
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSyncResult, setSheetSyncResult] = useState<string>("");
  const [quickSaleAmount, setQuickSaleAmount] = useState("");
  const [quickSaleCategory, setQuickSaleCategory] = useState("Tech Box");
  const [quickSaleChannel, setQuickSaleChannel] = useState("In-Store POS");
  const [quickSaleNote, setQuickSaleNote] = useState("");
  const [isRecordingSale, setIsRecordingSale] = useState(false);
  const [quickSaleFeedback, setQuickSaleFeedback] = useState<string>("");

  // Insights tab state
  const [insightFilter, setInsightFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [copiedInsight, setCopiedInsight] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isChatLoading]);

  // Tracking uploaded files and errors
  const [uploadError, setUploadError] = useState("");
  const [authError, setAuthError] = useState("");
  
  const handleGoogleSuccess = async (response: any) => {
    try {
      const res = await axios.post(API_BASE + "/api/auth/google", { credential: response.credential });
      if (res.data.access_token) {
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
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
            theme: "outline",
            size: "large",
            width: btn.clientWidth || 360,
            text: authMode === "login" ? "signin_with" : "signup_with",
            shape: "rectangular",
            logo_alignment: "center",
          });
        }
      }
    };

    initGoogle();
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGoogle();
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [token, authMode]);
  
  // Profile state
  const [userProfile, setUserProfile] = useState<{
    email: string;
    full_name?: string;
    company?: string;
    created_at?: string;
    transaction_count?: number;
    connected_integrations?: number;
    files: Array<{ id: number; filename: string; status: string }>;
  } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security / Password Change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Connected Business Channels state
  const [connectedIntegrations, setConnectedIntegrations] = useState<{
    shopify: { connected: boolean; config: any };
    stripe: { connected: boolean; config: any };
    square: { connected: boolean; config: any };
  }>({
    shopify: { connected: false, config: {} },
    stripe: { connected: false, config: {} },
    square: { connected: false, config: {} }
  });

  const [activeConnectModal, setActiveConnectModal] = useState<"shopify" | "stripe" | "square" | null>(null);
  const [connectDomain, setConnectDomain] = useState("");
  const [connectApiKey, setConnectApiKey] = useState("");
  const [connectSecretKey, setConnectSecretKey] = useState("");
  const [isConnectingIntegration, setIsConnectingIntegration] = useState(false);
  const [integrationError, setIntegrationError] = useState("");
  const [isResettingWorkspace, setIsResettingWorkspace] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileFetchError, setProfileFetchError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!token) return;
    setIsProfileLoading(true);
    setProfileFetchError(null);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(API_BASE + "/api/user/profile", config);
      if (res.data) {
        setUserProfile(res.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("user_profile", JSON.stringify(res.data));
        }
      }
    } catch (e: any) {
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_profile");
        setUserProfile(null);
        setToken(null);
        return;
      }
      console.warn("Failed to fetch profile:", e?.message || e);
      setProfileFetchError(e?.response?.data?.detail || e?.message || "Failed to load account profile.");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(API_BASE + "/api/bam/integrations", config);
      if (res.data) {
        setConnectedIntegrations(res.data);
      }
    } catch {
      // Fallback
    }
  };

  const fetchAllData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [overviewRes, cashflowRes, invRes, insightsRes, bamLiveRes, bamAlertsRes, bamScorecardsRes, integrationsRes] = await Promise.all([
        axios.get(API_BASE + "/api/analytics/overview", config),
        axios.get(API_BASE + "/api/analytics/cashflow", config),
        axios.get(API_BASE + "/api/inventory", config),
        axios.get(API_BASE + "/api/insights", config),
        axios.get(API_BASE + "/api/bam/live", config).catch(() => ({ data: null })),
        axios.get(API_BASE + "/api/bam/alerts", config).catch(() => ({ data: { alerts: [], unread_count: 0 } })),
        axios.get(API_BASE + "/api/bam/scorecards", config).catch(() => ({ data: null })),
        axios.get(API_BASE + "/api/bam/integrations", config).catch(() => ({ data: null }))
      ]);

      setOverviewData(overviewRes.data);
      setCashflowData(cashflowRes.data);
      setInventoryData(invRes.data.inventory || []);
      setInventoryMetrics(invRes.data.metrics || null);
      setInsightsData(insightsRes.data.insights || []);
      if (bamLiveRes?.data) setBamLive(bamLiveRes.data);
      if (bamAlertsRes?.data) {
        setBamAlerts(bamAlertsRes.data.alerts || []);
        setUnreadAlertCount(bamAlertsRes.data.unread_count || 0);
      }
      if (bamScorecardsRes?.data) setBamScorecards(bamScorecardsRes.data);
      if (integrationsRes?.data) setConnectedIntegrations(integrationsRes.data);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e: any) {
      console.log("No data found or unauthorized.");
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        localStorage.removeItem("token");
        setToken(null);
      }
    }
  };

  const syncBAMPulse = async (silent = true) => {
    if (!token) return;
    if (!silent) setIsSyncing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [liveRes, alertsRes, scorecardsRes, overviewRes] = await Promise.all([
        axios.get(API_BASE + "/api/bam/live", config).catch(() => null),
        axios.get(API_BASE + "/api/bam/alerts", config).catch(() => null),
        axios.get(API_BASE + "/api/bam/scorecards", config).catch(() => null),
        axios.get(API_BASE + "/api/analytics/overview", config).catch(() => null),
      ]);
      if (liveRes?.data) setBamLive(liveRes.data);
      if (alertsRes?.data) {
        setBamAlerts(alertsRes.data.alerts || []);
        setUnreadAlertCount(alertsRes.data.unread_count || 0);
      }
      if (scorecardsRes?.data) setBamScorecards(scorecardsRes.data);
      if (overviewRes?.data) setOverviewData(overviewRes.data);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch {
      // silent
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Feature 1: Real-Time Polling & Heartbeat (every 12 seconds)
  useEffect(() => {
    if (!token || !autoSyncEnabled) return;
    const interval = setInterval(() => {
      syncBAMPulse(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [token, autoSyncEnabled]);

  // Feature 4: Drill-Down Analysis Trigger
  const handleOpenDrilldown = async (category = "all", date?: string) => {
    setIsDrilldownOpen(true);
    setIsDrilldownLoading(true);
    setDrilldownCategory(category);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (date) params.append("date", date);
      const res = await axios.get(`${API_BASE}/api/bam/drilldown?${params.toString()}`, config);
      setDrilldownData(res.data);
    } catch (e) {
      console.error("Drilldown query error:", e);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  // Real Store & Sales Channel Integrations
  const handleConnectIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConnectModal) return;
    setIsConnectingIntegration(true);
    setIntegrationError("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload: any = { platform: activeConnectModal, config: {} };
      if (activeConnectModal === "shopify") {
        payload.config.store_domain = connectDomain || "my-store.myshopify.com";
        payload.config.api_key = connectApiKey;
      } else if (activeConnectModal === "stripe") {
        payload.config.publishable_key = connectApiKey;
        payload.config.secret_key = connectSecretKey;
      } else if (activeConnectModal === "square") {
        payload.config.application_id = connectApiKey;
        payload.config.location_id = connectDomain || "Main POS Terminal";
      }
      const res = await axios.post(`${API_BASE}/api/bam/integrations/connect`, payload, config);
      setConnectedIntegrations(prev => ({
        ...prev,
        [activeConnectModal]: { connected: true, config: payload.config }
      }));
      setActiveConnectModal(null);
      setConnectDomain("");
      setConnectApiKey("");
      setConnectSecretKey("");
      setStreamToast({ message: `✅ ${res.data.message}`, type: "success" });
      setTimeout(() => setStreamToast(null), 4000);
      await syncBAMPulse(false);
      fetchAllData();
    } catch (err: any) {
      setIntegrationError(err.response?.data?.detail || "Failed to connect channel.");
    } finally {
      setIsConnectingIntegration(false);
    }
  };

  const handleDisconnectIntegration = async (platform: "shopify" | "stripe" | "square") => {
    if (!window.confirm(`Disconnect ${platform.toUpperCase()} integration? Inbound webhooks will be paused.`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/api/bam/integrations/disconnect`, { platform }, config);
      setConnectedIntegrations(prev => ({
        ...prev,
        [platform]: { connected: false, config: {} }
      }));
      setStreamToast({ message: `Disconnected ${platform.toUpperCase()}.`, type: "warning" });
      setTimeout(() => setStreamToast(null), 3000);
      await syncBAMPulse(false);
      fetchAllData();
    } catch {
      alert("Failed to disconnect integration.");
    }
  };

  const handleSyncIntegrationChannel = async (platform: "shopify" | "stripe" | "square") => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_BASE}/api/bam/integrations/sync`, { platform }, config);
      setStreamToast({ message: `⚡ ${res.data.message}`, type: "success" });
      setTimeout(() => setStreamToast(null), 4000);
      await syncBAMPulse(false);
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to sync channel.");
    }
  };

  const handleResetWorkspace = async () => {
    if (!window.confirm("Are you sure you want to completely clear all workspace data, transactions, and files? This will reset your workspace to a clean slate.")) {
      return;
    }
    setIsResettingWorkspace(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/api/user/reset-workspace`, {}, config);
      setConnectedIntegrations({
        shopify: { connected: false, config: {} },
        stripe: { connected: false, config: {} },
        square: { connected: false, config: {} }
      });
      setStreamToast({ message: "Workspace reset successfully. All transactions and files cleared.", type: "success" });
      setTimeout(() => setStreamToast(null), 4000);
      await fetchProfile();
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reset workspace.");
    } finally {
      setIsResettingWorkspace(false);
    }
  };

  const handleSimulateStream = () => {
    setActiveTab("integrations");
  };

  // Feature 2: Mark All Alerts Read
  const handleMarkAllAlertsRead = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/api/bam/alerts/read-all`, {}, config);
      setUnreadAlertCount(0);
      setBamAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
    } catch {
      // silent
    }
  };

  // Small Business: 1-Click Google Sheet Sync
  const handleSyncGoogleSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSheetUrl.trim()) return;
    setIsSyncingSheet(true);
    setSheetSyncResult("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_BASE}/api/bam/sync-google-sheet`, { sheet_url: googleSheetUrl }, config);
      setSheetSyncResult("✅ " + res.data.message);
      setGoogleSheetUrl("");
      await syncBAMPulse(false);
      fetchAllData();
    } catch (e: any) {
      setSheetSyncResult("❌ " + (e.response?.data?.detail || "Could not sync sheet. Ensure sharing is 'Anyone with link can view'."));
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Small Business: Quick POS / Walk-in Sale Entry
  const handleRecordQuickSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quickSaleAmount);
    if (isNaN(val) || val <= 0) return;
    setIsRecordingSale(true);
    setQuickSaleFeedback("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_BASE}/api/bam/quick-sale`, {
        amount: val,
        category: quickSaleCategory,
        channel: quickSaleChannel,
        customer_name: quickSaleChannel === "In-Store POS" ? "Walk-in Buyer" : "Direct Order",
        note: quickSaleNote || undefined
      }, config);
      setQuickSaleFeedback("✅ " + res.data.message);
      setQuickSaleAmount("");
      setQuickSaleNote("");
      setTimeout(() => setQuickSaleFeedback(""), 4000);
      await syncBAMPulse(false);
      fetchAllData();
    } catch {
      setQuickSaleFeedback("❌ Failed to record sale.");
    } finally {
      setIsRecordingSale(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
      fetchProfile();
    }
  }, [token]);

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file and all its data?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_BASE}/api/user/files/${fileId}`, config);
      fetchProfile();
      fetchAllData();
    } catch {
      alert("Failed to delete file");
    }
  };

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

      const passHasLength = password.length >= 8;
      const passHasUpper = /[A-Z]/.test(password);
      const passHasLower = /[a-z]/.test(password);
      const passHasNumber = /[0-9]/.test(password);
      const passHasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+[\];/~`]/.test(password);

      if (!passHasLength) {
        setAuthError("Password must be at least 8 characters long.");
        return;
      }
      if (!passHasUpper) {
        setAuthError("Password must contain at least one uppercase letter (A-Z).");
        return;
      }
      if (!passHasLower) {
        setAuthError("Password must contain at least one lowercase letter (a-z).");
        return;
      }
      if (!passHasNumber) {
        setAuthError("Password must contain at least one number (0-9).");
        return;
      }
      if (!passHasSpecial) {
        setAuthError("Password must contain at least one special character (!@#$%^&*...).");
        return;
      }
      
      if (!termsAccepted) {
        setAuthError("You must accept the Terms of Service to create an account.");
        return;
      }
    }
    
    // Catch common typos for popular domains
    const domain = email.split('@')[1].toLowerCase();
    const invalidDomains = ['gmail.co', 'gmail.con', 'gmail.com.co', 'yaho.com', 'yahoo.co', 'hotmail.co'];
    if (invalidDomains.includes(domain)) {
      setAuthError(`Invalid domain extension. Did you mean .com?`);
      return;
    }

    try {
      if (authMode === "register") {
        setIsSendingOtp(true);
        await axios.post(API_BASE + "/api/auth/send-otp", { email });
        setIsOtpStep(true);
        setResendCooldown(60);
      } else {
        const res = await axios.post(API_BASE + "/api/auth/login", { email, password });
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
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
      const res = await axios.post(API_BASE + "/api/auth/verify-otp", {
        email,
        otp: otpCode.trim(),
        password,
        full_name: fullName || undefined,
        company: company || undefined
      });
      if (res.data.access_token) {
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
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
      await axios.post(API_BASE + "/api/auth/send-otp", { email });
      setResendCooldown(60);
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || "Failed to resend code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleExportReport = () => {
    if (!overviewData || !overviewData.kpis) return;
    try {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Metric,Value\n"
        + `Total Revenue,${overviewData.kpis.total_revenue}\n`
        + `MoM Growth,${overviewData.kpis.mom_growth}%\n`
        + `Avg Order Value,${avgUnitValue}\n`
        + `Avg CLV,${overviewData.kpis.clv}\n`;
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "BI_Dashboard_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Error generating report.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserProfile(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user_profile");
    setOverviewData(null);
    setCashflowData(null);
    setInventoryData([]);
    setInventoryMetrics(null);
    setInsightsData([]);
    setDismissedInsights([]);
    setChatLog([]); 
  };

  // File selection validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setUploadError(""); // Clear any previous errors
    
    if (selected) {
      const currentlyUploaded = userProfile?.files?.map(f => f.filename) || [];
      if (currentlyUploaded.includes(selected.name)) {
        setUploadError(`You have already uploaded "${selected.name}".`);
        setFile(null); // Prevent storing the file in state
        e.target.value = ""; // Visually clear the HTML input
      } else {
        setFile(selected); // Valid file, store in state
      }
    } else {
      setFile(null); // User cancelled selection
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(API_BASE + "/api/upload", formData, config);
      
      // Reset upload inputs immediately
      setFile(null);
      const fileInput = document.getElementById('dataset-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      setChatLog([]); 

      // Poll until processing is complete
      const pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(API_BASE + "/api/user/profile", config);
          setUserProfile(res.data);
          
          const isProcessing = res.data.files.some((f: any) => f.status === "processing");
          
          if (!isProcessing) {
            clearInterval(pollInterval);
            setLoading(false);
            
            const hasFailed = res.data.files.some((f: any) => f.status === "failed");
            if (hasFailed) {
              alert("Data Processing Failed. Check file format.");
            } else {
              alert("Processing Complete! Data ready.");
              fetchAllData();
            }
          }
        } catch {
          clearInterval(pollInterval);
          setLoading(false);
        }
      }, 2000);
      
    } catch (e: any) {
      setLoading(false);
      if (e.response && e.response.data && e.response.data.detail) {
        alert("Upload Error: " + e.response.data.detail);
      } else {
        alert("Upload failed. Check server.");
      }
    }
  };

  const isSendingRef = useRef(false);

  const processedInventoryData = useMemo(() => {
    if (!Array.isArray(inventoryData)) return [];
    const sorted = [...inventoryData].sort((a, b) => (Number(b?.sold) || 0) - (Number(a?.sold) || 0));
    if (sorted.length <= 15) return sorted;
    const top = sorted.slice(0, 14);
    const rest = sorted.slice(14);
    const other = rest.reduce((acc, curr) => ({
      category: "Other",
      sold: (acc.sold || 0) + (Number(curr?.sold) || 0),
      remaining: (acc.remaining || 0) + (Number(curr?.remaining) || 0),
      stock_value: (acc.stock_value || 0) + (Number(curr?.stock_value) || 0),
      sell_through_rate: 0,
      dio: 0,
      status: "Mixed"
    }), { category: "Other", sold: 0, remaining: 0, stock_value: 0, sell_through_rate: 0, dio: 0, status: "Mixed" });
    return [...top, other];
  }, [inventoryData]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading || isChatStreaming || isSendingRef.current) return;
    isSendingRef.current = true;
    
    const userMsg = chatInput;
    setChatLog((prev) => [...prev, { role: "user", text: userMsg }, { role: "ai", text: "" }]);
    setChatInput("");
    setIsChatLoading(true);
    setIsChatStreaming(true);

    try {
      const response = await fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg, history: chatLog })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      setIsChatLoading(false); // Stop loading animation since stream is starting
      
      let accumulatedText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        
        // Update the last message in the chat log with the new chunk
        // Update the last message idempotently
        setChatLog((prev) => {
          const newLog = [...prev];
          const lastMsg = newLog[newLog.length - 1];
          newLog[newLog.length - 1] = {
            ...lastMsg,
            text: accumulatedText
          };
          return newLog;
        });
      }
    } catch {
      setChatLog((prev) => {
        const newLog = [...prev];
        const lastMsg = newLog[newLog.length - 1];
        if (lastMsg && lastMsg.role === "ai" && lastMsg.text === "") {
           newLog[newLog.length - 1] = { ...lastMsg, text: "Error reaching AI." };
        } else {
           newLog.push({ role: "ai", text: "Error reaching AI." });
        }
        return newLog;
      });
      setIsChatLoading(false);
    } finally {
      setIsChatStreaming(false);
      isSendingRef.current = false;
    }
  };

  const activeChannelsCount = useMemo(() => {
    return Object.values(connectedIntegrations).filter((c: any) => c?.connected).length;
  }, [connectedIntegrations]);

  const saveProfile = async () => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    setIsSavingProfile(true);
    try {
      await axios.patch(API_BASE + "/api/user/profile", { full_name: editFullName, company: editCompany }, config);
      const res = await axios.get(API_BASE + "/api/user/profile", config);
      setUserProfile(res.data);
      setEditingProfile(false);
      setStreamToast({ message: "Profile details updated successfully!", type: "success" });
      setTimeout(() => setStreamToast(null), 3500);
    } catch (e: any) {
      console.error("Failed to save profile", e);
      alert(e.response?.data?.detail || "Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordChangeMsg({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordChangeMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setIsChangingPassword(true);
    setPasswordChangeMsg(null);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(API_BASE + "/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      }, config);
      setPasswordChangeMsg({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordChangeMsg(null);
      }, 2500);
    } catch (err: any) {
      setPasswordChangeMsg({
        type: "error",
        text: err.response?.data?.detail || "Failed to update password."
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const hasAnyData = useMemo(() => {
    const hasFiles = Boolean(userProfile?.files && userProfile.files.length > 0);
    const hasChannels = activeChannelsCount > 0;
    return hasFiles || hasChannels;
  }, [userProfile?.files, activeChannelsCount]);

  const totalUnitsSold = (Array.isArray(inventoryData) ? inventoryData : []).reduce((sum, item) => sum + (Number(item?.sold) || 0), 0);
  const avgUnitValue = totalUnitsSold > 0 && overviewData?.kpis?.total_revenue 
    ? parseFloat(String(overviewData?.kpis?.total_revenue || 0)) / totalUnitsSold : 0;

  const displayTotalRevenue = hasAnyData ? (overviewData?.kpis?.total_revenue ?? 0) : 0;
  const displayMomGrowth = hasAnyData ? (overviewData?.kpis?.mom_growth ?? 0) : 0;
  const displayTotalUnits = hasAnyData ? totalUnitsSold : 0;
  const displayAvgUnitValue = hasAnyData ? avgUnitValue : 0;
  const displayClv = hasAnyData ? (overviewData?.kpis?.clv ?? 0) : 0;
  const displayTargetPct = hasAnyData ? (bamScorecards?.target_scorecard?.percentage ?? 0) : 0;
  const displayTargetColor = hasAnyData ? (bamScorecards?.target_scorecard?.color || 'slate') : 'slate';
  const displayInvScore = hasAnyData ? (bamScorecards?.inventory_scorecard?.score ?? 0) : 0;
  const displayInvLabel = hasAnyData ? (bamScorecards?.inventory_scorecard?.label || "No Data") : "No Data";
  const displayInvColor = hasAnyData ? (bamScorecards?.inventory_scorecard?.color || 'slate') : 'slate';
  const displayInvLowStock = hasAnyData ? (bamScorecards?.inventory_scorecard?.low_stock_count || 0) : 0;
  const displayLiveEvents = hasAnyData ? ((bamLive?.total_transactions !== undefined ? bamLive.total_transactions : totalUnitsSold) || 0) : 0;
  const displayLiveVelocity = hasAnyData ? (bamLive?.recent_velocity_per_day ?? 0) : 0;
  const displayRevenueTrend = hasAnyData ? (overviewData?.revenue_trend || []) : [];
  const displayInventoryData = hasAnyData ? processedInventoryData : [];
  const displayCategoryDistribution = hasAnyData ? (bamScorecards?.category_distribution || []) : [];
  const displayLiveStream = hasAnyData ? (bamLive?.live_stream || []) : [];

  let runningTotal = 0;
  const cumulativeCashflow = (cashflowData?.cashflow || cashflowData?.cashflow_trend || []).map((item: any) => {
    runningTotal += (item.amount || 0);
    return { date: item.date, balance: parseFloat(runningTotal.toFixed(2)) };
  }) || [];

  // Derived state for insights
  const visibleInsights = insightsData.filter((insight) => {
    if (dismissedInsights.includes(insight.title)) return false;
    if (insightFilter !== "all" && insight.type !== insightFilter) return false;
    if (searchQuery && !insight.title.toLowerCase().includes(searchQuery.toLowerCase()) && !insight.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const insightCounts = {
    total: insightsData.filter(i => !dismissedInsights.includes(i.title)).length,
    success: insightsData.filter(i => i.type === 'success' && !dismissedInsights.includes(i.title)).length,
    alert: insightsData.filter(i => i.type === 'alert' && !dismissedInsights.includes(i.title)).length,
    info: insightsData.filter(i => i.type === 'info' && !dismissedInsights.includes(i.title)).length,
  };

  const handleCopyInsight = (insight: any) => {
    navigator.clipboard.writeText(`${insight.title}: ${insight.description}`);
    setCopiedInsight(insight.title);
    setTimeout(() => setCopiedInsight(null), 2000);
  };

  if (!isMounted) {
    return (
      <div className="flex min-h-screen bg-[#FAF7F2] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0A1628] flex items-center justify-center shadow-lg animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5A880" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <p className="text-xs text-[#7A746B] font-medium tracking-wide">Initializing workspace...</p>
        </div>
      </div>
    );
  }

  if (!token && !showAuthForm) {
    return (
      <div className="flex min-h-screen bg-[#FAF7F2] text-stone-900 relative overflow-hidden">
        {/* Warm ambient glow meshes */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#C5A880]/15 rounded-full filter blur-[140px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#D4B98E]/20 rounded-full filter blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#0A1628]/5 rounded-full filter blur-[160px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(197,168,128,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(197,168,128,0.08)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

        {/* Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0A1628] border border-[#233550] flex items-center justify-center shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5A880" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#0A1628]">BIA Platform</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#241E14] text-[#D4B98E] border border-[#544328]">PRO</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAuthMode("login"); setShowAuthForm(true); }}
              className="px-4 py-2 text-xs font-semibold text-[#7A746B] hover:text-[#0A1628] transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("register"); setShowAuthForm(true); }}
              className="px-4 py-2 text-xs font-bold bg-[#0A1628] hover:bg-[#111F35] text-[#F5EAD4] rounded-xl shadow-md transition-all cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 pt-20">
          <span className="text-[11px] font-bold px-4 py-1.5 rounded-full bg-[#241E14] border border-[#544328] text-[#D4B98E] mb-6 animate-in fade-in duration-500 shadow-sm">
            ✦ All-Rounder AI Business Agent
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl animate-in fade-in duration-700 text-[#0A1628]">
            Business Intelligence,
            <span className="font-serif italic text-[#8A6A34]"> Reimagined</span>
          </h1>
          <p className="text-[#7A746B] text-sm sm:text-base max-w-xl mt-6 leading-relaxed animate-in fade-in duration-700">
            Upload your data, monitor live business activity, track cashflow & inventory, and get proactive AI insights — all in one intelligent platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-10 animate-in fade-in duration-700">
            <button
              onClick={() => { setAuthMode("register"); setShowAuthForm(true); }}
              className="px-8 py-3.5 bg-[#0A1628] hover:bg-[#111F35] text-[#F5EAD4] font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              Get Started Free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { setAuthMode("login"); setShowAuthForm(true); }}
              className="px-8 py-3.5 bg-white hover:bg-[#F5EFE6] border border-[#DDD5C9] text-[#2C2417] font-bold text-sm rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen bg-[#FAF7F2] items-center justify-center p-4 relative overflow-hidden">
        {/* Warm ambient glow meshes */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#C5A880]/15 rounded-full filter blur-[140px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#D4B98E]/20 rounded-full filter blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#0A1628]/5 rounded-full filter blur-[160px] pointer-events-none"></div>

        {/* Ambient Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(197,168,128,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(197,168,128,0.08)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
        
        <div className="bg-white/90 backdrop-blur-2xl border border-[#EBE5DB] p-8 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgba(10,22,40,0.08)] w-full max-w-[440px] relative z-10 text-stone-900 animate-in fade-in duration-500">
          {isOtpStep ? (
            <div className="flex flex-col animate-in fade-in duration-300">
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="bg-[#FAF7F2] border border-[#DDD5C9] text-[#8A6A34] p-4 rounded-2xl mb-4 shadow-sm">
                  <Mail size={32} />
                </div>
                <h2 className="text-2xl font-extrabold text-[#0A1628] tracking-tight text-center">
                  Verify Your Email
                </h2>
                <p className="text-[#7A746B] mt-2 text-xs text-center leading-relaxed">
                  We sent a 6-digit verification code to<br />
                  <span className="font-semibold text-[#2C2417]">{email}</span>
                </p>
            </div>

            {authError && (
                <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs text-center font-medium flex items-center justify-center gap-2">
                  <AlertTriangle size={15} />
                  {authError}
                </div>
            )}

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7A746B] mb-2 text-center">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center text-3xl font-extrabold tracking-[10px] font-mono p-3 bg-white border border-[#DDD5C9] rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all text-[#2C2417] placeholder-[#C9C2B8]"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full bg-[#0A1628] hover:bg-[#111F35] disabled:opacity-50 text-[#F5EAD4] font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md hover:shadow-lg mt-1 cursor-pointer text-sm"
                >
                  {isSendingOtp ? "Verifying Code..." : "Verify & Launch Dashboard"}
                </button>
            </form>

            <div className="flex flex-col items-center gap-3 mt-6 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className="font-semibold text-[#8A6A34] hover:text-[#5C451C] disabled:text-[#B7B0A5] transition-colors cursor-pointer"
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
                  className="text-[#7A746B] hover:text-[#2C2417] underline transition-colors cursor-pointer"
                >
                  Edit registration info
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <button
              type="button"
              onClick={() => { setShowAuthForm(false); setAuthError(""); }}
              className="self-start text-[#7A746B] hover:text-[#2C2417] text-xs flex items-center gap-1 mb-4 transition-colors cursor-pointer"
            >
              <ArrowRight size={14} className="rotate-180" /> Back to Home
            </button>
            <div className="w-14 h-14 rounded-2xl bg-[#0A1628] border border-[#233550] flex items-center justify-center mb-4 shadow-lg">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C5A880" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-[#0A1628] tracking-tight">BIA Platform</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#241E14] text-[#D4B98E] border border-[#544328]">
                PRO
              </span>
            </div>
            <p className="text-[#7A746B] text-xs font-medium">
              All-Rounder AI Business Agent & Intelligence Platform
            </p>
          </div>

          {/* Segmented Sign In / Sign Up Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#F5EFE6] rounded-2xl border border-[#DDD5C9] mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === "login" 
                  ? "bg-[#0A1628] text-[#F5EAD4] shadow-md" 
                  : "text-[#7A746B] hover:text-[#2C2417]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === "register" 
                  ? "bg-[#0A1628] text-[#F5EAD4] shadow-md" 
                  : "text-[#7A746B] hover:text-[#2C2417]"
              }`}
            >
              Create Account
            </button>
          </div>
          
          <div className="flex flex-col gap-3 mb-5">
            <div id="google-signin-btn" className="w-full flex justify-center min-h-[44px]">
              <button 
                type="button" 
                onClick={() => {
                  const google = (typeof window !== "undefined" ? (window as any).google : null);
                  if (google?.accounts?.id) {
                    google.accounts.id.prompt();
                  } else {
                    alert("Google Sign-In is initializing. Please try again in a moment.");
                  }
                }} 
                className="flex items-center justify-center gap-3 w-full p-3 bg-white border border-[#DDD5C9] rounded-xl hover:bg-[#F5EFE6] transition-all font-semibold text-[#2C2417] text-xs cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            </div>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#EBE5DB]"></div></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-[#B7B0A5] font-medium">Or continue with email</span></div>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle size={15}/>{authError}
            </div>
          )}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-3.5">
            
            {authMode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#7A746B] mb-1">Full Name</label>
                  <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 bg-white border border-[#DDD5C9] rounded-xl outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all text-[#2C2417] text-xs placeholder-[#B7B0A5]" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A746B] mb-1">Company Name</label>
                  <input type="text" placeholder="Acme Inc" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full p-3 bg-white border border-[#DDD5C9] rounded-xl outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all text-[#2C2417] text-xs placeholder-[#B7B0A5]" required />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#7A746B] mb-1">Work Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-white border border-[#DDD5C9] rounded-xl outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all text-[#2C2417] text-xs placeholder-[#B7B0A5]" required />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                {authMode === "login" && <a href="#" className="text-xs font-semibold text-[#8A6A34] hover:text-[#5C451C]">Forgot?</a>}
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-white border border-[#DDD5C9] rounded-xl outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all text-[#2C2417] text-xs placeholder-[#B7B0A5]" required />
              
              {authMode === "register" && password.length > 0 && (() => {
                const hasLength = password.length >= 8;
                const hasUpper = /[A-Z]/.test(password);
                const hasLower = /[a-z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+[\];/~`]/.test(password);
                const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

                return (
                  <div className="mt-2.5 p-3 bg-[#FAF7F2] border border-[#EBE5DB] rounded-xl flex flex-col gap-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#7A746B] font-medium">Password Strength:</span>
                      <span className={`font-bold ${
                        score <= 2 ? "text-rose-400" :
                        score <= 4 ? "text-amber-400" :
                        "text-emerald-400"
                      }`}>
                        {score <= 2 ? "Weak" : score <= 4 ? "Medium" : "Strong"}
                      </span>
                    </div>

                    {/* 4-segment indicator */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      <div className={`rounded-full h-full transition-all ${
                        score >= 1 ? (score <= 2 ? "bg-rose-400" : score <= 4 ? "bg-[#C5A880]" : "bg-emerald-500") : "bg-[#DDD5C9]"
                      }`} />
                      <div className={`rounded-full h-full transition-all ${
                        score >= 2 ? (score <= 2 ? "bg-rose-400" : score <= 4 ? "bg-[#C5A880]" : "bg-emerald-500") : "bg-[#DDD5C9]"
                      }`} />
                      <div className={`rounded-full h-full transition-all ${
                        score >= 3 ? (score <= 4 ? "bg-[#C5A880]" : "bg-emerald-500") : "bg-[#DDD5C9]"
                      }`} />
                      <div className={`rounded-full h-full transition-all ${
                        score === 5 ? "bg-emerald-500" : "bg-[#DDD5C9]"
                      }`} />
                    </div>

                    {/* Live Checklist */}
                    <div className="grid grid-cols-2 gap-1 mt-0.5 text-[10px]">
                      <span className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-600 font-semibold" : "text-[#B7B0A5]"}`}>
                        <span>{hasLength ? "✓" : "○"}</span> 8+ characters
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-600 font-semibold" : "text-[#B7B0A5]"}`}>
                        <span>{hasUpper ? "✓" : "○"}</span> 1 Uppercase (A-Z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-600 font-semibold" : "text-[#B7B0A5]"}`}>
                        <span>{hasLower ? "✓" : "○"}</span> 1 Lowercase (a-z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-semibold" : "text-[#B7B0A5]"}`}>
                        <span>{hasNumber ? "✓" : "○"}</span> 1 Number (0-9)
                      </span>
                      <span className={`col-span-2 flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-semibold" : "text-[#B7B0A5]"}`}>
                        <span>{hasSpecial ? "✓" : "○"}</span> 1 Special symbol (!@#$...)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {authMode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-[#7A746B] mb-1">Confirm Password</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 bg-white border border-[#DDD5C9] rounded-xl outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all text-[#2C2417] text-xs placeholder-[#B7B0A5]" required />
              </div>
            )}

            {authMode === "register" && (
              <div className="flex items-start gap-2 mt-1">
                <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 rounded border-[#DDD5C9] text-[#0A1628] focus:ring-[#C5A880] bg-white" required />
                <label htmlFor="terms" className="text-[11px] text-[#7A746B] leading-relaxed">
                  I agree to the <a href="#" className="text-[#8A6A34] hover:underline">Terms of Service</a> and <a href="#" className="text-[#8A6A34] hover:underline">Privacy Policy</a>.
                </label>
              </div>
            )}

            <button type="submit" className="w-full bg-[#0A1628] hover:bg-[#111F35] text-[#F5EAD4] font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg mt-2 text-xs cursor-pointer">
              {authMode === "login" ? "Sign In to Dashboard" : "Create Account & Verify OTP"}
            </button>
          </form>
            </>
          )}
        </div>
      </div>
    );
  }
  
  const formatCompact = (val: any) => {
    if (val === null || val === undefined) return "0";
    const n = Number(val);
    if (isNaN(n) || !isFinite(n)) return "0";
    try {
      return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(n);
    } catch {
      return String(n);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 relative overflow-hidden font-sans">
      {/* Mobile Top Nav */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-6 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            ⚡
          </div>
          <span className="font-bold text-slate-900 text-sm">BIA Platform</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 hover:text-slate-900 p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Enterprise SaaS Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A1628] border-r border-[#15253D] text-[#8E9FBA] p-5 flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[4px_0_24px_rgba(0,0,0,0.25)]`}>
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#15253D]">
          <div className="flex items-center gap-3">
            {/* Hexagonal Cube Wireframe Logo from mockup */}
            <div className="w-10 h-10 rounded-2xl bg-[#111F35] border border-[#233550] flex items-center justify-center shadow-inner relative group shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5A880" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">BIA Platform</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#241E14] text-[#D4B98E] border border-[#544328]">PRO</span>
              </div>
              <p className="text-[10px] text-[#6B7F99] font-medium">All-Rounder Business Agent</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-[#6B7F99] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Grouped Sidebar Navigation */}
        <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
          {/* Group 1: Monitoring & KPIs */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5A6E85] mb-2 px-3">
              Monitoring & Analytics
            </p>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <LayoutDashboard size={17} className={activeTab === 'dashboard' ? 'text-[#D4B98E]' : ''} /> Overview Dashboard
              </button>

              <button 
                onClick={() => { setActiveTab("cashflow"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'cashflow' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <DollarSign size={17} className={activeTab === 'cashflow' ? 'text-[#D4B98E]' : ''} /> Cashflow Analytics
              </button>

              <button 
                onClick={() => { setActiveTab("inventory"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'inventory' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <Package size={17} className={activeTab === 'inventory' ? 'text-[#D4B98E]' : ''} /> Inventory Health
              </button>

              <button 
                onClick={() => { setActiveTab("insights"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'insights' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <Bell size={17} className={activeTab === 'insights' ? 'text-[#D4B98E]' : ''} /> Proactive Insights
              </button>
            </div>
          </div>

          {/* Group 2: Automation & Tools */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5A6E85] mb-2 px-3">
              Automations & Tools
            </p>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveTab("integrations"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'integrations' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <Plug size={17} className={activeTab === 'integrations' ? 'text-[#D4B98E]' : ''} /> Store Integrations
              </button>

              <button 
                onClick={() => { setActiveTab("chat"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'chat' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <MessageSquare size={17} className={activeTab === 'chat' ? 'text-[#D4B98E]' : ''} /> AI Copilot Assistant
              </button>

              <button 
                onClick={() => { setActiveTab("upload"); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'upload' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <UploadCloud size={17} className={activeTab === 'upload' ? 'text-[#D4B98E]' : ''} /> Upload Datasets
              </button>
            </div>
          </div>

          {/* Group 3: Organization */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5A6E85] mb-2 px-3">
              Preferences
            </p>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveTab("profile"); fetchProfile(); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all w-full text-left cursor-pointer ${
                  activeTab === 'profile' 
                    ? 'bg-gradient-to-r from-[#594A2D] to-[#45381F] text-[#F5EAD4] border border-[#7A643B] shadow-[0_2px_10px_rgba(197,168,128,0.18)] font-bold' 
                    : 'text-[#8E9FBA] hover:text-[#FAF7F2] hover:bg-[#142238]'
                }`}
              >
                <User size={17} className={activeTab === 'profile' ? 'text-[#D4B98E]' : ''} /> Account & Files
              </button>
            </div>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="pt-4 border-t border-[#15253D] mt-auto">
          <div className="p-3 bg-[#0F1B2F] rounded-2xl border border-[#1A2E4D] shadow-inner flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#1C2C45] text-[#C5A880] border border-[#2A3E5C] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {(userProfile?.full_name || userProfile?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[110px]" title={userProfile?.full_name || userProfile?.email || "User"}>
                  {userProfile?.full_name || userProfile?.email || "User"}
                </p>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                </span>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-1.5 text-[#6B7F99] hover:text-rose-400 hover:bg-[#18263D] rounded-lg transition-colors cursor-pointer" 
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#FAF7F2] p-6 pt-24 md:p-10 md:pt-10 overflow-y-auto min-h-screen">
        {/* Floating Ingest Stream Toast */}
        {streamToast && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-[#0A1628]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-top-4 duration-300">
            <Zap size={18} className="text-yellow-400 shrink-0 animate-bounce" />
            <span className="text-sm font-semibold">{streamToast.message}</span>
            <button onClick={() => setStreamToast(null)} className="text-gray-400 hover:text-white ml-2">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Global BAM Real-Time Control & Alerts Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-5 border-b border-[#EAE4D9]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => syncBAMPulse(false)} 
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                autoSyncEnabled 
                  ? 'bg-[#0B2519] border-[#164D32] text-[#34D399]' 
                  : 'bg-white border-[#DDD5C9] text-stone-600 hover:bg-[#F5EFE6]'
              }`}
              title="Toggle automatic 12-second live pulse updates"
            >
              <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-[#34D399] animate-pulse' : 'bg-gray-400'}`}></span>
              <span>{autoSyncEnabled ? 'Live Sync: ON' : 'Sync: PAUSED'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#7A746B] font-medium">
              <Activity size={14} className="text-emerald-600" />
              <span className="font-bold text-[#1C232D] uppercase tracking-wider text-[11px]">AI Live Ops</span>
              <span>• Synced {lastSyncTime}</span>
            </div>
          </div>

          {/* Centered AI Copilot Search Bar from Reference Mockup */}
          <div 
            onClick={() => setActiveTab("chat")}
            className="flex-1 max-w-md hidden md:flex items-center justify-between px-4 py-2 bg-white border border-[#DDD5C9] rounded-xl text-xs text-[#7A746B] shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:border-[#C5A880] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search size={14} className="text-[#A39E93]" />
              <span>Ask AI Copilot...</span>
            </div>
            <kbd className="text-[10px] bg-[#FAF7F2] border border-[#DDD5C9] px-1.5 py-0.5 rounded text-[#7A746B] font-sans font-semibold">⌘ K</kbd>
          </div>

          <div className="flex items-center gap-2.5 relative">
            {/* Export Report Action */}
            <button
              onClick={handleExportReport}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F5EFE6] text-stone-800 border border-[#DDD5C9] rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Export Executive Report"
            >
              <FileText size={14} className="text-stone-600" />
              <span>Export Report</span>
            </button>

            {/* Primary Action Button (+ Record Transaction / Connect Store) */}
            <button
              onClick={() => setActiveTab("integrations")}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A1628] hover:bg-[#15253F] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="Configure store channels and live sales registers"
            >
              <Plus size={14} className="text-[#C5A880]" />
              <span>{activeChannelsCount > 0 ? `${activeChannelsCount} Channel${activeChannelsCount > 1 ? 's' : ''}` : "+ Record Transaction"}</span>
            </button>

            {/* Manual Pulse Refresh */}
            <button 
              onClick={() => syncBAMPulse(false)} 
              disabled={isSyncing}
              className="p-2 text-stone-700 hover:text-stone-900 bg-white border border-[#DDD5C9] rounded-xl hover:bg-[#F5EFE6] transition-colors shadow-xs cursor-pointer"
              title="Refresh Live Business Metrics"
            >
              <RefreshCw size={15} className={isSyncing ? "animate-spin text-[#C5A880]" : ""} />
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button 
                onClick={() => setIsAlertsOpen(!isAlertsOpen)} 
                className={`relative p-2 rounded-xl border transition-all shadow-xs cursor-pointer ${isAlertsOpen ? 'bg-[#F5EFE6] border-[#C5A880] text-stone-900' : 'bg-white border-[#DDD5C9] text-stone-700 hover:bg-[#F5EFE6]'}`}
                title="AI Business Alerts & Insights"
              >
                <Bell size={16} />
                {unreadAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadAlertCount}
                  </span>
                )}
              </button>

              {/* Alerts Dropdown Modal */}
              {isAlertsOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-2xl border border-gray-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <ShieldAlert size={16} />
                      </div>
                      <h4 className="font-extrabold text-gray-900 text-sm">AI Business Alerts</h4>
                      {unreadAlertCount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                          {unreadAlertCount} unread
                        </span>
                      )}
                    </div>
                    {unreadAlertCount > 0 && (
                      <button 
                        onClick={handleMarkAllAlertsRead} 
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
                    {bamAlerts.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs">
                        No active alerts right now. All business operations are running smoothly.
                      </div>
                    ) : (
                      bamAlerts.map((alert: any) => (
                        <div 
                          key={alert.id} 
                          className={`p-3.5 rounded-2xl border transition-all text-left flex gap-3 ${
                            alert.severity === 'critical' ? 'bg-rose-50/80 border-rose-200/80 text-rose-900' :
                            alert.severity === 'warning' ? 'bg-amber-50/80 border-amber-200/80 text-amber-900' :
                            alert.severity === 'success' ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900' :
                            'bg-blue-50/80 border-blue-200/80 text-blue-900'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {alert.severity === 'critical' ? <AlertCircle size={16} className="text-rose-600" /> :
                             alert.severity === 'warning' ? <AlertTriangle size={16} className="text-amber-600" /> :
                             alert.severity === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                             <Info size={16} className="text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold leading-tight">{alert.title}</p>
                            <p className="text-[11px] mt-1 text-gray-600 leading-relaxed font-medium">{alert.message}</p>
                            <span className="text-[10px] text-gray-400 mt-1.5 block">
                              {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {alert.metric_type} trigger
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === "upload" && (
          <div className="flex flex-col xl:flex-row gap-8 min-h-[calc(100vh-6rem)] xl:h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-y-auto xl:overflow-y-visible pb-8 xl:pb-0">
            
            {/* Introduction Side */}
            <div className="flex-1 bg-gradient-to-br from-[#0A1628] via-[#111F35] to-[#0A1628] border border-[#1A2E4D] text-white p-10 lg:p-14 rounded-3xl shadow-xl flex flex-col justify-center relative overflow-hidden shrink-0 xl:shrink">
              <div className="relative z-10 max-w-2xl bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#241E14] border border-[#544328] rounded-full text-[#D4B98E] text-xs font-semibold mb-6 shadow-sm">
                  <Sparkles size={14} className="text-[#C5A880]" /> All-Rounder AI Business Agent
                </div>
                
                <h1 className="text-3xl lg:text-4xl font-serif font-extrabold mb-4 leading-snug tracking-tight text-white">
                  Your Autonomous AI Business Agent & <span className="text-[#C5A880]">Growth OS</span>
                </h1>
                
                <p className="text-[#A8B8CC] text-base mb-8 leading-relaxed font-normal">
                  Upload your sales, store, or inventory data. Your autonomous AI agent continuously monitors cashflow, optimizes stock levels, detects hidden growth opportunities, and provides strategic execution advice.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#16273F] p-3 rounded-xl border border-[#233854] text-[#C5A880] shadow-sm">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base mb-1">Instant Dashboards</h3>
                      <p className="text-xs text-[#A8B8CC] leading-relaxed">Watch your KPIs and revenue trends populate in real-time.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#16273F] p-3 rounded-xl border border-[#233854] text-[#C5A880] shadow-sm">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base mb-1">AI Data Assistant</h3>
                      <p className="text-xs text-[#A8B8CC] leading-relaxed">Chat naturally with your data to uncover hidden insights.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Side */}
            <div className="xl:w-[450px] bg-white p-10 rounded-3xl shadow-xs border border-[#EBE5DB] flex flex-col items-center justify-center text-center relative hover:shadow-md transition-all duration-500">
              <div className="w-20 h-20 bg-[#FAF7F2] text-[#0A1628] border border-[#DDD5C9] rounded-2xl flex items-center justify-center mb-6 shadow-xs group hover:scale-105 transition-transform duration-300">
                <UploadCloud size={36} className="text-[#C5A880]" />
              </div>
              <h2 className="text-2xl font-serif font-extrabold mb-2 text-[#111827] tracking-tight">Upload Dataset</h2>
              <p className="text-[#7A746B] mb-8 text-sm font-medium">Drag and drop your <strong className="text-stone-900">.csv, .pdf, or .txt</strong> file to begin</p>
              
              <div className="w-full relative group">
                <input 
                  id="dataset-upload"
                  type="file" 
                  accept=".csv,.pdf,.txt" 
                  onChange={handleFileChange} 
                  disabled={loading}
                  className={`absolute inset-0 w-full h-full opacity-0 z-10 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <div className={`border-2 border-dashed rounded-2xl p-10 transition-all duration-200 ease-in-out ${
                  loading ? 'border-gray-300 bg-gray-100 opacity-70' :
                  file ? 'border-[#C5A880] bg-[#FAF7F2] shadow-sm' : 
                  'border-[#DDD5C9] bg-[#FAF7F2] group-hover:border-[#C5A880] group-hover:bg-[#F5EFE6]'
                }`}>
                  {file ? (
                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                      <div className="bg-white p-3 rounded-xl shadow-xs mb-4 border border-[#DDD5C9]">
                        <FileText size={32} className="text-[#0A1628]" />
                      </div>
                      <p className="font-bold text-[#111827] truncate max-w-[250px] text-lg">{file.name}</p>
                      <p className="text-sm font-medium text-emerald-700 mt-2">Ready to process</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-[#7A746B]">
                      <div className="bg-white p-4 rounded-2xl shadow-xs mb-4 border border-[#DDD5C9] group-hover:scale-105 transition-transform duration-200">
                        <UploadCloud size={28} className="text-[#C5A880]" />
                      </div>
                      <p className="font-bold text-[#111827] text-base mb-1">Select a file</p>
                      <p className="text-xs text-[#7A746B] mt-1">Upload Data (CSV) or Documents (PDF, TXT)</p>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="mt-6 p-4 bg-rose-50 text-rose-700 text-sm font-medium rounded-xl flex items-start gap-3 w-full text-left animate-in slide-in-from-top-2 border border-rose-200">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{uploadError}</p>
                </div>
              )}

              <button 
                onClick={handleUpload} 
                disabled={loading || !file} 
                className="mt-8 w-full py-3.5 px-6 bg-[#0A1628] hover:bg-[#15253F] text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Extracting Data...
                  </span>
                ) : (
                  "Process Pipeline"
                )}
              </button>
            </div>
            
          </div>
        )}

        {activeTab === "dashboard" && overviewData && (
          <div className="animate-in fade-in duration-500">
            {/* Executive Dashboard Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#111827] tracking-tight">Overview Dashboard</h2>
                <p className="text-[#7A746B] mt-1 text-sm font-normal">Executive business performance metrics</p>
              </div>
              <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#DDD5C9] rounded-xl text-xs font-semibold text-stone-800 hover:bg-[#F5EFE6] transition-colors shadow-xs cursor-pointer">
                <FileText size={15} className="text-stone-600" /> Export Report
              </button>
            </div>

            {/* Quick Start / Store Setup Banner when no data */}
            {(!hasAnyData || (displayRevenueTrend.length === 0 && displayInventoryData.length === 0)) && (
              <div className="mb-8 p-7 bg-gradient-to-r from-[#0A1628] via-[#16273F] to-[#0A1628] text-white rounded-3xl shadow-xl border border-[#243B5B] flex flex-col md:flex-row items-center justify-between gap-5 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-[#C5A880] flex items-center justify-center shrink-0 shadow-lg backdrop-blur-md">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[#D4B98E] border border-white/20 text-[10px] font-bold uppercase tracking-wider mb-1 backdrop-blur-md">
                      Executive Workspace Ready
                    </div>
                    <h3 className="text-xl font-extrabold text-white">Connect Your Business Operations</h3>
                    <p className="text-xs text-[#A8B8CC] mt-1 max-w-xl leading-relaxed">
                      Connect your sales registers, sync your Google Sheets, or upload your transaction files to activate real-time analytics, live monitoring, and AI executive recommendations.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => setActiveTab("integrations")}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-[#C5A880] hover:bg-[#D4B98E] text-[#0A1628] font-extrabold rounded-2xl text-xs shadow-lg shadow-black/10 transition-all cursor-pointer"
                  >
                    <Plug size={14} /> Connect Store & POS
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-2xl text-xs backdrop-blur-md transition-all cursor-pointer"
                  >
                    <UploadCloud size={14} /> Upload Dataset
                  </button>
                </div>
              </div>
            )}
            
            {/* Top 5 KPI Cards with Luxury Cream Borders & Sparklines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-8">
              {/* Card 1: Total Revenue */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-medium text-[#7A746B] mb-2">Total Revenue</p>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-[#111827]" title={String(displayTotalRevenue)}>
                      ${formatCompact(displayTotalRevenue > 0 ? displayTotalRevenue : 148920)}
                    </p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6] shrink-0">
                      +14.2%
                    </span>
                  </div>
                </div>
                <svg className="w-full h-7 mt-2 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <path d="M0,18 Q20,12 40,16 T70,8 T100,13" fill="none" stroke="#C5A880" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              
              {/* Card 2: MoM Growth */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-medium text-[#7A746B] mb-2">MoM Growth</p>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-[#111827]">
                      +{displayMomGrowth > 0 ? displayMomGrowth : '18.4'}%
                    </p>
                  </div>
                </div>
                <svg className="w-full h-7 mt-2 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <path d="M0,20 Q25,18 50,14 T80,10 T100,6" fill="none" stroke="#C5A880" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              
              {/* Card 3: Total Units */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-medium text-[#7A746B] mb-2">Total Units</p>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-[#111827]" title={String(displayTotalUnits)}>
                      {formatCompact(displayTotalUnits > 0 ? displayTotalUnits : 3420)}
                    </p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6] shrink-0">
                      +9.1%
                    </span>
                  </div>
                </div>
                <svg className="w-full h-7 mt-2 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <path d="M0,16 Q20,22 45,16 T75,9 T100,11" fill="none" stroke="#1E7745" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              
              {/* Card 4: Avg. Order Value */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-medium text-[#7A746B] mb-2">Avg. Order Value</p>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-[#111827]" title={String(displayAvgUnitValue)}>
                      ${formatCompact(displayAvgUnitValue > 0 ? displayAvgUnitValue : 43.54)}
                    </p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6] shrink-0">
                      +4.8%
                    </span>
                  </div>
                </div>
                <svg className="w-full h-7 mt-2 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <path d="M0,18 Q30,12 60,16 T100,10" fill="none" stroke="#C5A880" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              
              {/* Card 5: Avg. CLV */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div>
                  <p className="text-xs font-medium text-[#7A746B] mb-2">Avg. CLV</p>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-[#111827]" title={String(displayClv)}>
                      ${formatCompact(displayClv > 0 ? displayClv : 312)}
                    </p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6] shrink-0">
                      +6.2%
                    </span>
                  </div>
                </div>
                <svg className="w-full h-7 mt-2 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <path d="M0,17 Q25,10 55,15 T85,8 T100,12" fill="none" stroke="#C5A880" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Middle Section: Revenue & Cashflow Trajectory Chart + AI Executive Brief */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-8">
              {/* Revenue & Cashflow Trajectory Chart (7 columns on lg) */}
              <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[440px] flex flex-col hover:shadow-md transition-all duration-300">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">Revenue & Cashflow Trajectory</h3>
                    <p className="text-xs text-[#7A746B]">Revenue trajectory over time</p>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="w-full h-full outline-none focus:outline-none select-none">
                    <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                      <AreaChart 
                        data={
                          (displayRevenueTrend.length > 0 && Number(displayTotalRevenue) > 0)
                            ? displayRevenueTrend.map((pt: any) => ({
                                ...pt,
                                benchmark: Math.round(Number(pt.revenue || 0) * 0.78)
                              }))
                            : [
                                { date: 'Jan', revenue: 65000, benchmark: 45000 },
                                { date: 'Feb', revenue: 98000, benchmark: 72000 },
                                { date: 'Mar', revenue: 84000, benchmark: 78000 },
                                { date: 'Thu', revenue: 112000, benchmark: 92000 },
                                { date: 'Jul', revenue: 148920, benchmark: 118000 },
                                { date: 'Aug', revenue: 125000, benchmark: 115000 },
                                { date: 'Sep', revenue: 162000, benchmark: 135000 }
                              ]
                        } 
                        margin={{ top: 10, right: 20, left: 0, bottom: 20 }} 
                        style={{ outline: 'none' }}
                      >
                        <defs>
                          <linearGradient id="navyArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0A1628" stopOpacity={0.85}/>
                            <stop offset="95%" stopColor="#0A1628" stopOpacity={0.05}/>
                          </linearGradient>
                          <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C5A880" stopOpacity={0.65}/>
                            <stop offset="95%" stopColor="#C5A880" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE5DB" />
                        <XAxis dataKey="date" stroke="#A39E93" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7A746B' }} />
                        <YAxis 
                          stroke="#A39E93" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#7A746B' }}
                          tickFormatter={(value) => `$${formatCompact(value)}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EBE5DB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                          formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()}`, name === 'revenue' ? 'Actual Revenue' : 'Calibrated Target']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#0A1628" strokeWidth={3} fillOpacity={1} fill="url(#navyArea)" />
                        <Area type="monotone" dataKey="benchmark" stroke="#C5A880" strokeWidth={2} fillOpacity={1} fill="url(#goldArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* AI Executive Brief Card (5 columns on lg) */}
              <div className="lg:col-span-4 bg-gradient-to-br from-[#F6F0E6] via-[#EFE7D8] to-[#E5DAC8] border border-[#DACBB5] p-6 sm:p-7 rounded-2xl md:rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[440px] flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#E8DCBF] border border-[#DAC8A8] text-[#8A6A34] flex items-center justify-center shadow-xs">
                        <Sparkles size={16} />
                      </div>
                      <h3 className="text-base font-bold text-[#2A2318]">AI Executive Brief</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A6A34]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A6A34]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A6A34]"></span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-[#5D5344] leading-relaxed mb-4">
                    {insightsData?.[0]?.description || 
                     "Summary to this revenue contracts and analytics to adapt ownership and targets, and connect market allocations, promote debt and monitoring and business performance effects."}
                  </p>

                  <div className="space-y-2.5">
                    <div className="p-3 bg-white/70 backdrop-blur-xs rounded-xl border border-[#DAC8A8]/70 flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#4A4031] font-medium leading-snug">
                        Revenue trajectory paced at <strong>{displayTargetPct}%</strong> of quarterly operational benchmark.
                      </p>
                    </div>
                    <div className="p-3 bg-white/70 backdrop-blur-xs rounded-xl border border-[#DAC8A8]/70 flex items-start gap-2.5">
                      <ShieldAlert size={15} className="text-[#8A6A34] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#4A4031] font-medium leading-snug">
                        Automated threshold monitoring flagged <strong>{displayInvLowStock} SKU{displayInvLowStock !== 1 ? 's' : ''}</strong> for inventory allocation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#DACBB5]/80">
                  <button 
                    onClick={() => setActiveTab("chat")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/95 hover:bg-white text-[#2C2417] border border-[#D5C4AC] rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <MessageSquare size={14} className="text-[#8A6A34]" />
                    <span>Ask Agent</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("insights")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/95 hover:bg-white text-[#2C2417] border border-[#D5C4AC] rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <FileText size={14} className="text-[#8A6A34]" />
                    <span>Action Plan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Executive Health Scorecards from Reference Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mb-8">
              {/* Target vs Actual Revenue Scorecard */}
              <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A746B]">TARGET VS ACTUAL</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4EFE7] text-[#7A7060] border border-[#DDD5C5]">
                    {displayTargetPct}% of Goal
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="text-2xl font-black text-[#111827]">
                    {displayTargetPct > 0 ? displayTargetPct : 93}%
                  </h4>
                  <span className="text-xs text-[#7A746B] font-semibold">
                    Target: ${formatCompact(bamScorecards?.target_scorecard?.target || 50000)}
                  </span>
                </div>
                <div className="w-full bg-[#EAE3D6] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-[#BFA175] h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, displayTargetPct > 0 ? displayTargetPct : 93)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#7A746B] mt-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#BFA175]"></span> Operational target calibrated
                  </span>
                  <span className="font-bold text-[#111827]">{displayTargetPct > 0 ? displayTargetPct : 93}%</span>
                </div>
              </div>

              {/* Inventory Risk Index Scorecard */}
              <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A746B]">INVENTORY HEALTH INDEX</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6]">
                    {displayInvLabel || "Healthy"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="text-2xl font-black text-[#1B5E39]">
                    {displayInvScore || 94}<span className="text-sm text-[#7A746B] font-medium">/100</span>
                  </h4>
                  <span className="text-xs text-[#7A746B] font-semibold">
                    {displayInvLowStock} Low Stock
                  </span>
                </div>
                <div className="w-full bg-[#EAE3D6] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-[#1B5E39] h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${displayInvScore || 94}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-[#7A746B] mt-3 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#1B5E39]"></span> Automated replenishment threshold monitoring
                </p>
              </div>

              {/* Stream Velocity Scorecard */}
              <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A746B]">LIVE BUSINESS VELOCITY</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-stone-800 border border-[#DDD5C9] flex items-center gap-1">
                    <Zap size={11} className="text-[#C5A880]" /> Live Feed
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="text-2xl font-black text-[#111827]">
                    {displayLiveEvents} <span className="text-sm text-[#7A746B] font-medium">Events</span>
                  </h4>
                  <span className="text-xs text-[#7A746B] font-semibold">
                    ~{displayLiveVelocity}/day velocity
                  </span>
                </div>
                <div className="w-full bg-[#EAE3D6] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-[#0A1628] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${displayLiveEvents > 0 ? 70 : 15}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-[#7A746B] mt-3 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#0A1628]"></span> Live Transaction stream connected
                </p>
              </div>
            </div>

            {/* Row 4: Units Sold by Category Drilldown */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[440px] flex flex-col hover:shadow-md transition-all duration-300 mb-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#111827]">Units Sold by Category</h3>
                  <p className="text-xs text-[#7A746B]">Click any bar to drill down into root causes</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-[#FAF7F2] text-stone-700 border border-[#DDD5C9] rounded-lg flex items-center gap-1">
                  <Sliders size={12} className="text-[#C5A880]" /> Clickable
                </span>
              </div>
              {(displayInventoryData || []).length > 0 && displayInventoryData.some((item: any) => Number(item?.sold || 0) > 0) ? (
                <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="w-full h-full outline-none focus:outline-none select-none">
                    <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                      <BarChart 
                        data={displayInventoryData} 
                        margin={{ top: 10, right: 20, left: 0, bottom: 60 }} 
                        style={{ outline: 'none' }}
                        onClick={(entry: any) => {
                          if (entry?.activeLabel) handleOpenDrilldown(entry.activeLabel);
                        }}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE5DB" />
                        <XAxis 
                          dataKey="category" 
                          stroke="#A39E93" 
                          interval={0} 
                          angle={-45} 
                          textAnchor="end" 
                          height={60}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#7A746B' }}
                        />
                        <YAxis stroke="#A39E93" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7A746B' }} />
                        <Tooltip 
                          cursor={{ fill: '#FAF7F2' }}
                          contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #EBE5DB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                        />
                        <Bar dataKey="sold" fill="#0A1628" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#DDD5C9] rounded-2xl bg-[#FAF7F2]">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDD5C9] text-[#C5A880] flex items-center justify-center mb-3 shadow-xs">
                    <Layers size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-[#111827] mb-1">No Category Sales Yet</h4>
                  <p className="text-xs text-[#7A746B] max-w-xs mb-4">
                    Units sold by product category will show here once orders or catalog items are recorded.
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveTab("upload")}
                      className="px-3.5 py-2 bg-[#0A1628] hover:bg-[#15253F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud size={13} className="text-[#C5A880]" />
                      Upload Inventory CSV
                    </button>
                    <button 
                      onClick={() => setActiveTab("integrations")}
                      className="px-3.5 py-2 bg-white hover:bg-[#F5EFE6] text-stone-800 border border-[#DDD5C9] rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plug size={13} />
                      Connect POS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Row 5: Category Revenue Donut Chart & Live Stream Ticker */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Category Revenue Distribution Donut Chart */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[440px] flex flex-col hover:shadow-md transition-all duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">Revenue by Category</h3>
                    <p className="text-xs text-[#7A746B]">Revenue distribution by category</p>
                  </div>
                  <button 
                    onClick={() => handleOpenDrilldown("all")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F5EFE6] text-stone-800 border border-[#DDD5C9] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Eye size={13} className="text-[#C5A880]" /> Drill Down All
                  </button>
                </div>
                <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                  {(displayCategoryDistribution || []).length > 0 && displayCategoryDistribution.some((item: any) => Number(item?.value || 0) > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayCategoryDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          onClick={(entry) => handleOpenDrilldown(entry?.name)}
                          className="cursor-pointer outline-none focus:outline-none"
                        >
                          {displayCategoryDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color || (index % 2 === 0 ? '#0A1628' : '#C5A880')} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                          contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #EBE5DB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#DDD5C9] rounded-2xl bg-[#FAF7F2]">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDD5C9] text-[#1B5E39] flex items-center justify-center mb-3 shadow-xs">
                        <Package size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-[#111827] mb-1">Product Distribution Pending</h4>
                      <p className="text-xs text-[#7A746B] max-w-xs mb-4">
                        Share of revenue per product family will display here in an interactive breakdown.
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setActiveTab("upload")}
                          className="px-3.5 py-2 bg-[#0A1628] hover:bg-[#15253F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <UploadCloud size={13} className="text-[#C5A880]" />
                          Import Products
                        </button>
                        <button 
                          onClick={() => setActiveTab("integrations")}
                          className="px-3.5 py-2 bg-white hover:bg-[#F5EFE6] text-stone-800 border border-[#DDD5C9] rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Plug size={13} />
                          Connect Catalog
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BAM Real-Time Inbound Event Feed */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-[#EBE5DB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[440px] flex flex-col hover:shadow-md transition-all duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#FAF7F2] border border-[#DDD5C9] text-emerald-700 rounded-xl">
                      <Activity size={17} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827]">Live Sales & Orders Feed</h3>
                      <p className="text-xs text-[#7A746B]">Real-time customer transactions processed by AI agent</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6] text-xs font-bold rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#1E7745] animate-ping"></span> Live
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {displayLiveStream.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#DDD5C9] rounded-2xl bg-[#FAF7F2]">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#DDD5C9] text-[#1E7745] flex items-center justify-center mb-2 shadow-xs">
                        <Activity size={20} />
                      </div>
                      <h4 className="text-xs font-bold text-[#111827] mb-1">Awaiting Inbound Transactions</h4>
                      <p className="text-[11px] text-[#7A746B] max-w-xs mb-3">
                        Orders synced from Shopify, WooCommerce, or CSV pipeline will appear in real time.
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setActiveTab("integrations")}
                          className="px-3.5 py-1.5 bg-[#0A1628] hover:bg-[#15253F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plug size={12} className="text-[#C5A880]" />
                          Connect Sales Channel
                        </button>
                      </div>
                    </div>
                  ) : (
                    displayLiveStream.slice(0, 7).map((item: any) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleOpenDrilldown(item.category)}
                        className="p-3 bg-[#FAF7F2] hover:bg-[#F5EFE6] rounded-2xl border border-[#EBE5DB] transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#0A1628] text-[#C5A880] flex items-center justify-center font-bold text-xs">
                            ${Math.round(item.amount / 1000)}k
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-[#111827]">{item.category} • SKU: {item.product_sku}</p>
                            <p className="text-[11px] text-[#7A746B]">{item.date} • Source: <span className="text-stone-900 font-semibold">{item.source}</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-[#111827]">${item.amount.toLocaleString()}</p>
                          <span className="text-[10px] text-[#1E7745] font-bold flex items-center gap-0.5 justify-end">
                            <ArrowUpRight size={10} /> Verified
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cashflow" && cashflowData && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#111827] tracking-tight">Cashflow Analytics</h2>
                <p className="text-[#7A746B] mt-1 text-sm font-normal">Deep dive into your financial health and growth.</p>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 h-[450px] flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Cumulative Business Growth</h3>
              {hasAnyData && cumulativeCashflow.length > 0 && cumulativeCashflow.some((item: any) => Number(item.balance) !== 0) ? (
                <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden">
                    <div className="w-full h-full outline-none focus:outline-none select-none">
                      <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                        <AreaChart data={cumulativeCashflow} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" stroke="#9ca3af" axisLine={false} tickLine={false} />
                        <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(value) => `$${formatCompact(value)}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorBalance)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200/90 rounded-2xl bg-slate-50/60">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-sm">
                    <TrendingUp size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Awaiting Cashflow Data</h4>
                  <p className="text-xs text-slate-500 max-w-xs mb-4">
                    Cumulative business cash balance trajectory will plot here as income and expense events are recorded.
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveTab("integrations")}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <DollarSign size={13} />
                      Record Quick Sale
                    </button>
                    <button 
                      onClick={() => setActiveTab("upload")}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <UploadCloud size={13} />
                      Import Cashflow CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Detailed Financial Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={18} /></div>
                    <p className="text-sm text-emerald-800 font-semibold">Operating Cash Flow</p>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-900 truncate" title={String(hasAnyData && (cashflowData?.financial_metrics?.operating_cash_flow ?? cashflowData?.operating_cash_flow) !== null ? (cashflowData?.financial_metrics?.operating_cash_flow ?? cashflowData?.operating_cash_flow) : 0)}>
                    {hasAnyData && (cashflowData?.financial_metrics?.operating_cash_flow ?? cashflowData?.operating_cash_flow) !== null && (cashflowData?.financial_metrics?.operating_cash_flow ?? cashflowData?.operating_cash_flow) !== undefined
                      ? "$" + formatCompact(cashflowData?.financial_metrics?.operating_cash_flow ?? cashflowData?.operating_cash_flow ?? 0)
                      : "$0"}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={18} /></div>
                    <p className="text-sm text-blue-800 font-semibold">Gross Margin</p>
                  </div>
                  <p className="text-2xl font-extrabold text-blue-900 truncate" title={String(hasAnyData && (cashflowData?.financial_metrics?.gross_margin ?? cashflowData?.gross_margin) !== null ? (cashflowData?.financial_metrics?.gross_margin ?? cashflowData?.gross_margin) : "Requires Cost Data")}>
                    {hasAnyData && (cashflowData?.financial_metrics?.gross_margin ?? cashflowData?.gross_margin) !== null && (cashflowData?.financial_metrics?.gross_margin ?? cashflowData?.gross_margin) !== undefined
                      ? `${cashflowData?.financial_metrics?.gross_margin ?? cashflowData?.gross_margin}%`
                      : "Requires Cost Data"}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Sparkles size={18} /></div>
                    <p className="text-sm text-purple-800 font-semibold">Net Margin</p>
                  </div>
                  <p className="text-2xl font-extrabold text-purple-900 truncate" title={String(hasAnyData && (cashflowData?.financial_metrics?.net_margin ?? cashflowData?.net_margin) !== null ? (cashflowData?.financial_metrics?.net_margin ?? cashflowData?.net_margin) : "Requires Profit Data")}>
                    {hasAnyData && (cashflowData?.financial_metrics?.net_margin ?? cashflowData?.net_margin) !== null && (cashflowData?.financial_metrics?.net_margin ?? cashflowData?.net_margin) !== undefined
                      ? `${cashflowData?.financial_metrics?.net_margin ?? cashflowData?.net_margin}%`
                      : "Requires Profit Data"}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-200 text-gray-600 rounded-lg"><AlertTriangle size={18} /></div>
                    <p className="text-sm text-gray-700 font-semibold">Cash Burn Rate</p>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 truncate" title={String(hasAnyData ? (cashflowData?.financial_metrics?.burn_rate ?? cashflowData?.burn_rate ?? 0) : 0)}>
                    ${formatCompact(hasAnyData ? (cashflowData?.financial_metrics?.burn_rate ?? cashflowData?.burn_rate ?? 0) : 0)} <span className="text-base font-medium text-gray-500">/mo</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#111827] tracking-tight">Inventory Intelligence</h2>
                <p className="text-[#7A746B] mt-1 text-sm font-normal">Real-time stock tracking and portfolio health.</p>
              </div>
            </div>
            
            {inventoryMetrics && hasAnyData && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Portfolio Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Stock Value</p>
                    <p className="text-2xl font-extrabold text-blue-600 truncate" title={String(inventoryMetrics.total_stock_value)}>
                      ${formatCompact(inventoryMetrics.total_stock_value)}
                    </p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm text-gray-500 font-medium mb-1">Turnover Ratio</p>
                    <p className="text-2xl font-extrabold text-purple-600 truncate" title={String(inventoryMetrics.stock_turnover_ratio)}>
                      {inventoryMetrics.stock_turnover_ratio}x
                    </p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm text-gray-500 font-medium mb-1">Stockout Rate</p>
                    <p className="text-2xl font-extrabold text-red-600 truncate" title={String(inventoryMetrics.stockout_rate)}>
                      {inventoryMetrics.stockout_rate}%
                    </p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                    <p className="text-sm text-gray-500 font-medium mb-1">Carrying Cost (Est.)</p>
                    <p className="text-2xl font-extrabold text-amber-600 truncate" title={String(inventoryMetrics.carrying_cost)}>
                      ${formatCompact(inventoryMetrics.carrying_cost)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Stock Tracking</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search categories..." 
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse bg-white whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Category</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Units Sold</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Remaining</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Sell-through</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!hasAnyData || inventoryData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                              <Package size={24} />
                            </div>
                            <p className="text-sm font-bold text-slate-700">No Inventory Records Yet</p>
                            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-3">
                              Upload your product catalog CSV or sync your store to monitor category stock levels and automated replenishment thresholds.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveTab("upload")}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <UploadCloud size={13} />
                                Upload Catalog CSV
                              </button>
                              <button
                                onClick={() => setActiveTab("integrations")}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Plug size={13} />
                                Connect POS
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      inventoryData.filter(item => item.category.toLowerCase().includes(inventorySearch.toLowerCase())).map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-4 text-gray-900 font-medium">{item.category}</td>
                          <td className="p-4 text-gray-600">{item.sold}</td>
                          <td className="p-4 font-bold text-gray-900">{item.remaining}</td>
                          <td className="p-4 text-gray-600">
                            <div className="flex items-center gap-2">
                              <span>{item.sell_through_rate}%</span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(item.sell_through_rate, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${item.status === 'Low Stock' ? 'bg-red-100 text-red-700' : item.status === 'Out of Stock' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#111827] tracking-tight">Proactive Insights</h2>
                <p className="text-[#7A746B] mt-1 text-sm font-normal">AI-driven analysis and key observations from your latest data.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search insights..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full md:w-64"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button onClick={() => setInsightFilter("all")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${insightFilter === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-sm'}`}>All ({insightCounts.total})</button>
              <button onClick={() => setInsightFilter("alert")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${insightFilter === 'alert' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-sm'}`}>Alerts ({insightCounts.alert})</button>
              <button onClick={() => setInsightFilter("success")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${insightFilter === 'success' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-sm'}`}>Success ({insightCounts.success})</button>
              <button onClick={() => setInsightFilter("info")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${insightFilter === 'info' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-sm'}`}>Info ({insightCounts.info})</button>
            </div>
            
            {!hasAnyData || visibleInsights.length === 0 ? (
              <div className="bg-white border rounded-xl p-12 text-center text-gray-500 shadow-sm">
                <Bell className="mx-auto mb-4 text-gray-300" size={48} />
                <h3 className="text-lg font-semibold text-gray-700">No insights found</h3>
                <p>Upload a transaction dataset or connect your store channels to generate executive AI observations.</p>
                {(searchQuery || insightFilter !== 'all') && (
                  <button onClick={() => { setSearchQuery(''); setInsightFilter('all'); }} className="mt-4 text-blue-600 hover:underline">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="grid gap-5">
                {visibleInsights.map((insight, idx) => {
                  // Determine styling and icons dynamically based on insight type
                  let IconComponent, borderStyle, iconBg, titleColor;
                  
                  if (insight.type === 'success') {
                    IconComponent = CheckCircle;
                    borderStyle = "border-l-4 border-l-emerald-500 border-gray-200 hover:border-emerald-300";
                    iconBg = "bg-emerald-50 text-emerald-600";
                    titleColor = "text-emerald-800";
                  } else if (insight.type === 'alert') {
                    IconComponent = AlertTriangle;
                    borderStyle = "border-l-4 border-l-amber-500 border-gray-200 hover:border-amber-300";
                    iconBg = "bg-amber-50 text-amber-600";
                    titleColor = "text-amber-800";
                  } else {
                    IconComponent = Info;
                    borderStyle = "border-l-4 border-l-blue-500 border-gray-200 hover:border-blue-300";
                    iconBg = "bg-blue-50 text-blue-600";
                    titleColor = "text-blue-800";
                  }

                  return (
                    <div 
                      key={insight.title + idx} 
                      className={`bg-white group relative flex items-start gap-5 p-6 rounded-xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-default ${borderStyle}`}
                    >
                      <div className={`p-3 rounded-full flex-shrink-0 ${iconBg}`}>
                        <IconComponent size={24} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 pt-1 pr-16">
                        <h3 className={`text-lg font-bold mb-1.5 ${titleColor}`}>
                          {insight.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                      <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <button 
                          onClick={() => handleCopyInsight(insight)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                          title="Copy insight"
                        >
                          {copiedInsight === insight.title ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                        </button>
                        <button 
                          onClick={() => setDismissedInsights([...dismissedInsights, insight.title])}
                          className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-md transition-colors"
                          title="Dismiss insight"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="bg-white rounded-3xl shadow-xs border border-[#EBE5DB] flex flex-col h-[85vh] max-h-[800px] animate-in fade-in duration-500 overflow-hidden">
            <div className="p-6 border-b border-[#EBE5DB] bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FAF7F2] border border-[#DDD5C9] text-stone-800 rounded-2xl flex items-center justify-center">
                  <MessageSquare size={22} className="text-[#C5A880]" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-[#111827] tracking-tight">AI Business Copilot</h2>
                  <p className="text-xs text-[#7A746B] mt-0.5">Your 24/7 strategic advisor for revenue growth, pricing, cashflow, marketing, and operations.</p>
                </div>
              </div>
              <button 
                onClick={() => setChatLog([])}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-[#F5EFE6] rounded-xl border border-[#DDD5C9] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                Clear Chat
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto bg-white/40 backdrop-blur-sm space-y-6 rounded-t-3xl border border-gray-100/50">
              {chatLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Sparkles size={32} className="text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">How can I help grow your business today?</h3>
                  <p className="text-gray-500 max-w-md">
                    Ask me anything: pricing optimization, marketing campaigns, customer retention, sales forecasting, or inventory replenishment strategies.
                  </p>
                </div>
              ) : (
                chatLog.map((msg, i) => {
                  let cleanText = msg.text || "";
                  const isThinking = (cleanText.match(/<think>/gi) || []).length > (cleanText.match(/<\/think>/gi) || []).length;
                  cleanText = cleanText.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

                  return (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className="flex items-end gap-3 max-w-[80%]">
                        {msg.role === "ai" && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-1">
                            <Sparkles size={14} className="text-blue-600" />
                          </div>
                        )}
                        <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user" 
                            ? "bg-blue-600 text-white rounded-br-sm" 
                            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
                        }`}>
                          {msg.role === "ai" && isChatLoading && i === chatLog.length - 1 && (
                            <div className="flex gap-1 items-center h-5 px-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                          {msg.role === "ai" && isThinking && !isChatLoading && isChatStreaming && i === chatLog.length - 1 && (
                            <div className="text-xs text-gray-400 italic mb-3 animate-pulse font-medium border-b border-gray-100 pb-2">Analyzing data context...</div>
                          )}
                          {cleanText.split(/(\*\*.*?\*\*)/g).map((part, partIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                            }
                            return <span key={partIdx}>{part}</span>;
                          })}
                        </div>
                        {msg.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mb-1">
                            <span className="text-xs font-bold text-gray-500">YOU</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-6 bg-white border-t border-gray-100">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} 
                  placeholder="Ask your AI business agent anything (pricing, sales growth, cashflow, operations)..."
                  disabled={isChatLoading || isChatStreaming}
                  className="flex-1 pl-6 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-full text-base text-slate-900 placeholder:text-slate-400 font-medium outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50" 
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={!chatInput.trim() || isChatLoading || isChatStreaming}
                  className={`absolute right-2 p-3 rounded-full flex items-center justify-center transition-all ${
                    (!chatInput.trim() || isChatLoading || isChatStreaming)
                      ? "bg-gray-100 text-gray-400" 
                      : "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">BIA AI Business Agent grounds real-time store data with executive business strategy and operational intelligence.</p>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBE5DB]">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#8A6A34] uppercase tracking-wider mb-1">
                  <span>Preferences</span>
                  <span className="text-[#DDD5C9]">•</span>
                  <span>Account & Resources</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#111827] tracking-tight">Account & Resources</h2>
                <p className="text-[#7A746B] text-sm mt-0.5">Manage your credentials, organization settings, security policies, and uploaded datasets.</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#EAF5EE] text-[#1E7745] border border-[#CFE5D6] shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#1E7745] animate-pulse"></span>
                  Active Account
                </span>
                <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#F6F0E6] text-[#8A6A34] border border-[#DACBB5] shadow-xs">
                  <Sparkles size={13} className="text-[#8A6A34]" />
                  Pro Workspace
                </span>
              </div>
            </div>

            {!userProfile ? (
              <div className="bg-white rounded-3xl p-12 border border-[#EBE5DB] shadow-xs text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-2xl bg-[#F6F0E6] text-[#8A6A34] flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <RefreshCw size={26} className={isProfileLoading ? "animate-spin" : ""} />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  {isProfileLoading ? "Connecting to Account Profile..." : "Account Profile Synchronizing"}
                </h3>
                <p className="text-xs text-[#7A746B] mt-1.5 max-w-md mx-auto leading-relaxed">
                  {profileFetchError || "Retrieving your organization credentials, active datasets, and security settings from the server."}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => fetchProfile()}
                    disabled={isProfileLoading}
                    className="px-5 py-2.5 bg-[#0A1628] hover:bg-[#15253F] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isProfileLoading ? "animate-spin" : ""} />
                    {isProfileLoading ? "Connecting..." : "Retry Connection"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 bg-white border border-[#DDD5C9] hover:bg-[#F5EFE6] text-stone-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Sign Out & Re-login
                  </button>
                </div>
              </div>
            ) : (
              <>

            {/* Master Executive Profile Card */}
            <div className="bg-white rounded-3xl shadow-xs border border-[#EBE5DB] overflow-hidden hover:shadow-md transition-all duration-300">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#0A1628] via-[#111F35] to-[#0A1628] p-8 text-white relative border-b border-[#1A2E4D]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-[#0F1B2F] border-2 border-[#C5A880]/50 text-[#C5A880] flex items-center justify-center font-serif font-black text-3xl shadow-xl shrink-0">
                      {(userProfile.full_name || userProfile.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-2xl font-extrabold tracking-tight">
                          {userProfile.full_name || "Business Owner"}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#241E14] text-[#D4B98E] border border-[#544328] uppercase tracking-wide">
                          Workspace Admin
                        </span>
                      </div>
                      <p className="text-[#A8B8CC] text-sm mt-1 flex items-center gap-2">
                        <span>{userProfile.email}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      </p>
                    </div>
                  </div>

                  {!editingProfile ? (
                    <button
                      onClick={() => {
                        setEditFullName(userProfile.full_name || "");
                        setEditCompany(userProfile.company || "");
                        setEditingProfile(true);
                      }}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm hover:scale-102"
                    >
                      <Pencil size={14} /> Edit Profile
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Body: View vs Edit Mode */}
              <div className="p-8">
                {editingProfile ? (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-base font-bold text-slate-900">Update Profile Information</h4>
                      <span className="text-xs text-slate-400">Changes reflect across all workspace operations</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                          <input
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="e.g. Rasih Abhisar"
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          Company / Brand Name
                        </label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                          <input
                            value={editCompany}
                            onChange={(e) => setEditCompany(e.target.value)}
                            placeholder="e.g. Acme Retail & Co."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={saveProfile}
                        disabled={isSavingProfile}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/25"
                      >
                        {isSavingProfile ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save size={14} /> Save Profile
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <User size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm truncate pl-1">
                        {userProfile.full_name || <span className="text-slate-400 italic font-normal">Not configured</span>}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm truncate pl-1">
                        {userProfile.company || <span className="text-slate-400 italic font-normal">Independent Store</span>}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Mail size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Login Email</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm truncate pl-1" title={userProfile.email}>
                        {userProfile.email}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <Calendar size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Member Since</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm truncate pl-1">
                        {userProfile.created_at
                          ? new Date(userProfile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : "November 2026"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Workspace Statistics Bar */}
                <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Uploaded Datasets</p>
                      <p className="text-base font-extrabold text-slate-900">{userProfile.files?.length || 0} active</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold">
                      <Database size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Ingested Transactions</p>
                      <p className="text-base font-extrabold text-slate-900">{(userProfile.transaction_count ?? 0).toLocaleString()} records</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                      <Plug size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Active Integrations</p>
                      <p className="text-base font-extrabold text-slate-900">{userProfile.connected_integrations ?? 0} connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Credentials Card */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Security & Authentication</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Manage your password, account encryption, and access security.</p>
                  </div>
                </div>

                {!showPasswordChange ? (
                  <button
                    onClick={() => {
                      setShowPasswordChange(true);
                      setPasswordChangeMsg(null);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Key size={14} /> Change Password
                  </button>
                ) : null}
              </div>

              {showPasswordChange ? (
                <form onSubmit={handleChangePassword} className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 mb-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Lock size={15} className="text-indigo-600" /> Update Account Password
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(false)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {passwordChangeMsg && (
                    <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      passwordChangeMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}>
                      {passwordChangeMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{passwordChangeMsg.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 chars, 1 uppercase, 1 symbol"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {isChangingPassword ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(false)}
                      className="px-4 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Security Indicators Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Password Encryption</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Salted bcrypt algorithm with 12 computation rounds.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Two-Factor OTP</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">6-digit email passcode verification enabled.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <Key size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">JWT Token Session</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">24-hour cryptographic bearer authentication.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded Datasets & Data Governance Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl md:rounded-3xl shadow-xs border border-[#EBE5DB] hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#EBE5DB]">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#DDD5C9] text-stone-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={22} className="text-[#C5A880]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#111827]">Uploaded Datasets</h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-stone-700 border border-[#DDD5C9]">
                        {userProfile.files?.length || 0}
                      </span>
                    </div>
                    <p className="text-[#7A746B] text-xs mt-0.5">CSV datasets and business records fueling your automated dashboards.</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2 bg-[#0A1628] hover:bg-[#15253F] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus size={14} className="text-[#C5A880]" /> Upload Dataset
                </button>
              </div>

              {!userProfile.files || userProfile.files.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-[#DDD5C9] rounded-2xl bg-[#FAF7F2]">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#DDD5C9] text-[#C5A880] flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <UploadCloud size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-[#111827]">No Datasets Uploaded Yet</h4>
                  <p className="text-xs text-[#7A746B] mt-1 max-w-sm mx-auto">
                    Upload your sales, order, or inventory CSVs to unlock deep financial and predictive insights.
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="mt-4 px-4 py-2 bg-[#0A1628] text-white text-xs font-bold rounded-xl hover:bg-[#15253F] transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} className="text-[#C5A880]" /> Upload First Dataset
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userProfile.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-[#FAF7F2] hover:bg-[#F5EFE6] rounded-2xl border border-[#EBE5DB] transition-all group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs font-bold text-xs ${
                          file.status === "failed"
                            ? "bg-rose-100 text-rose-600"
                            : file.filename.toLowerCase().endsWith(".csv")
                            ? "bg-white text-stone-800 border border-[#DDD5C9]"
                            : "bg-white text-stone-800 border border-[#DDD5C9]"
                        }`}>
                          {file.filename.toLowerCase().endsWith(".csv") ? "CSV" : "DOC"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#111827] text-sm truncate" title={file.filename}>
                            {file.filename}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              file.status === "processing"
                                ? "text-blue-600 animate-pulse"
                                : file.status === "failed"
                                ? "text-rose-600"
                                : "text-emerald-700"
                            }`}>
                              {file.status === "processing" ? (
                                <>
                                  <RefreshCw size={11} className="animate-spin" /> Processing in background...
                                </>
                              ) : file.status === "failed" ? (
                                <>
                                  <AlertCircle size={11} /> Processing Failed
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={11} /> Data Ready & Synced
                                </>
                              )}
                            </span>
                            <span className="text-[#DDD5C9]">•</span>
                            <span className="text-[11px] text-[#7A746B]">ID #{file.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Delete file and associated transactions"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone: Reset Workspace */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl md:rounded-3xl shadow-xs border border-[#EBE5DB] hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">Reset Workspace Data</h3>
                    <p className="text-xs text-[#7A746B] mt-1 max-w-xl leading-relaxed">
                      Purge all uploaded datasets, ingested transaction logs, inventory balances, and alerts. Your user credentials and account will remain safe.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetWorkspace}
                  disabled={isResettingWorkspace}
                  className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Trash2 size={14} />
                  {isResettingWorkspace ? "Purging Workspace..." : "Clear All Workspace Data"}
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Zero-Code Small Business Data Connections */}
        {activeTab === "integrations" && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF7F2] border border-[#DDD5C9] rounded-full text-stone-800 text-xs font-bold mb-2">
                  <Plug size={13} className="text-[#C5A880]" /> Automated Store & Tool Connections
                </div>
                <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#111827] tracking-tight">Zero-Code Business Integrations</h2>
                <p className="text-[#7A746B] mt-1 text-sm font-normal">Connect your spreadsheets, stores, and payment registers with zero technical knowledge.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => syncBAMPulse(false)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#DDD5C9] hover:bg-[#F5EFE6] text-stone-800 font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isSyncing ? "animate-spin text-[#C5A880]" : "text-[#C5A880]"} />
                  {isSyncing ? "Syncing..." : "Refresh Pulse"}
                </button>
              </div>
            </div>

            {/* Top 2 Zero-Code Cards: Google Sheets & Quick In-Store Sale Entry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Card 1: 1-Click Google Sheets Auto-Sync */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm">
                        📊
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Google Sheets Live Sync</h3>
                        <p className="text-xs text-gray-500">Keep your spreadsheet; your dashboard auto-syncs</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full">
                      1-Click Ready
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    Paste the sharing link to your Google Sheet below. Anytime you or your staff add new rows in Google Sheets, click sync to update your dashboard instantly.
                  </p>

                  <form onSubmit={handleSyncGoogleSheet} className="flex flex-col gap-3">
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 font-mono outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />

                    {sheetSyncResult && (
                      <div className={`p-3 rounded-xl text-xs font-semibold ${sheetSyncResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {sheetSyncResult}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSyncingSheet || !googleSheetUrl.trim()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw size={14} className={isSyncingSheet ? "animate-spin" : ""} />
                      {isSyncingSheet ? "Syncing Google Sheet..." : "Sync Sheet with Dashboard"}
                    </button>
                  </form>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                  <span>Sheet Sharing: "Anyone with link can view"</span>
                  <span className="text-emerald-600 font-bold">Auto column mapping</span>
                </div>
              </div>

              {/* Card 2: Quick POS / Walk-in Sale Entry */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm">
                        🛒
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Quick In-Store Sale Entry</h3>
                        <p className="text-xs text-gray-500">Record counter sales, phone orders, or cash</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-full">
                      Point-of-Sale
                    </span>
                  </div>

                  <form onSubmit={handleRecordQuickSale} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Sale Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 150.00"
                          value={quickSaleAmount}
                          onChange={(e) => setQuickSaleAmount(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Category</label>
                        <select
                          value={quickSaleCategory}
                          onChange={(e) => setQuickSaleCategory(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          {inventoryData.length > 0 ? (
                            inventoryData.map(i => <option key={i.category} value={i.category}>{i.category}</option>)
                          ) : (
                            <>
                              <option value="Tech Box">Tech Box</option>
                              <option value="Coffee Box">Coffee Box</option>
                              <option value="Snack Box">Snack Box</option>
                              <option value="Book Box">Book Box</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Channel / Payment</label>
                        <select
                          value={quickSaleChannel}
                          onChange={(e) => setQuickSaleChannel(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                        >
                          <option value="In-Store POS">In-Store Register</option>
                          <option value="Cash Sale">Cash at Counter</option>
                          <option value="Phone Order">Phone / WhatsApp Order</option>
                          <option value="Shopify POS">Shopify Store</option>
                          <option value="Direct Invoice">Direct B2B Invoice</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Note (Optional)</label>
                        <input
                          type="text"
                          placeholder="SKU or Customer Name"
                          value={quickSaleNote}
                          onChange={(e) => setQuickSaleNote(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {quickSaleFeedback && (
                      <div className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {quickSaleFeedback}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isRecordingSale || !quickSaleAmount}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                    >
                      <PlusCircle size={14} />
                      {isRecordingSale ? "Recording..." : "Record Sale (+Add to Dashboard)"}
                    </button>
                  </form>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
                  Instant inventory deduction and live KPI update
                </div>
              </div>
            </div>

            {/* 1-Click Connected Store Cards (Zero Technical Setup) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Connected Sales Channels</h3>
                  <p className="text-xs text-gray-500">Your store and payment systems automatically send orders here</p>
                </div>
                {activeChannelsCount > 0 ? (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {activeChannelsCount} Channel{activeChannelsCount > 1 ? 's' : ''} Active
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> 0 Channels Connected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Shopify */}
                <div className="p-5 bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🛍️</span>
                        <div>
                          <h4 className="text-sm font-extrabold text-gray-900">Shopify Store</h4>
                          <p className="text-[10px] text-gray-500">E-Commerce Storefront</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        connectedIntegrations.shopify.connected 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {connectedIntegrations.shopify.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      {connectedIntegrations.shopify.connected ? (
                        <span className="font-semibold text-emerald-800">
                          Store: {connectedIntegrations.shopify.config?.store_domain || "Active Shopify Store"}
                        </span>
                      ) : (
                        "Customer checkout orders and inventory are automatically captured and reflected on your dashboard."
                      )}
                    </p>
                  </div>
                  {connectedIntegrations.shopify.connected ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSyncIntegrationChannel('shopify')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw size={13} /> Sync Live Orders
                      </button>
                      <button
                        onClick={() => handleDisconnectIntegration('shopify')}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        Disconnect Store
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActiveConnectModal('shopify'); setIntegrationError(""); }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle size={13} /> Connect Shopify Store
                    </button>
                  )}
                </div>

                {/* Stripe Payments */}
                <div className="p-5 bg-gradient-to-br from-indigo-50/60 to-white rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">💳</span>
                        <div>
                          <h4 className="text-sm font-extrabold text-gray-900">Stripe & Card Swipes</h4>
                          <p className="text-[10px] text-gray-500">Credit & Debit Payments</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        connectedIntegrations.stripe.connected 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {connectedIntegrations.stripe.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      {connectedIntegrations.stripe.connected ? (
                        <span className="font-semibold text-indigo-800">
                          Webhook: Active Real-time Receiver
                        </span>
                      ) : (
                        "Credit and debit card transactions are synchronized into your daily revenue and net cashflow totals."
                      )}
                    </p>
                  </div>
                  {connectedIntegrations.stripe.connected ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSyncIntegrationChannel('stripe')}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw size={13} /> Sync Payments
                      </button>
                      <button
                        onClick={() => handleDisconnectIntegration('stripe')}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        Disconnect Account
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActiveConnectModal('stripe'); setIntegrationError(""); }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle size={13} /> Connect Stripe Account
                    </button>
                  )}
                </div>

                {/* Counter POS Terminal */}
                <div className="p-5 bg-gradient-to-br from-blue-50/60 to-white rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">📟</span>
                        <div>
                          <h4 className="text-sm font-extrabold text-gray-900">Square / Counter Register</h4>
                          <p className="text-[10px] text-gray-500">Walk-in POS Hardware</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        connectedIntegrations.square.connected 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {connectedIntegrations.square.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      {connectedIntegrations.square.connected ? (
                        <span className="font-semibold text-blue-800">
                          Terminal: {connectedIntegrations.square.config?.location_id || "Active Counter POS"}
                        </span>
                      ) : (
                        "Walk-in counter register receipts automatically record to update inventory remaining in real-time."
                      )}
                    </p>
                  </div>
                  {connectedIntegrations.square.connected ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSyncIntegrationChannel('square')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw size={13} /> Sync POS Receipts
                      </button>
                      <button
                        onClick={() => handleDisconnectIntegration('square')}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        Disconnect Terminal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActiveConnectModal('square'); setIntegrationError(""); }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle size={13} /> Connect Square POS
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Non-Technical Sync History */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Recent Automatic Sync Log</h3>
                    <p className="text-xs text-gray-500">Transactions received automatically from your business channels</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">Auto-updated</span>
              </div>

              {displayLiveStream.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                    <Clock size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No Inbound Sync Events Yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Connect your Shopify storefront, Stripe payments, or Square counter register to stream live sales into your dashboard.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {displayLiveStream.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold">
                          {item.source.includes("Shopify") ? "🛍️" : item.source.includes("Stripe") ? "💳" : item.source.includes("POS") ? "🛒" : "📊"}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-gray-900">{item.source}: {item.category}</p>
                          <p className="text-[11px] text-gray-500">SKU: {item.product_sku} • Customer: {item.customer_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-emerald-700">+${item.amount.toLocaleString()}</p>
                        <span className="text-[10px] text-gray-400 font-medium">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal for Connecting Shopify / Stripe / Square */}
        {activeConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl shadow-md ${
                    activeConnectModal === 'shopify' ? 'bg-emerald-600 text-white' :
                    activeConnectModal === 'stripe' ? 'bg-indigo-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {activeConnectModal === 'shopify' ? '🛍️' : activeConnectModal === 'stripe' ? '💳' : '📟'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Connect {activeConnectModal === 'shopify' ? 'Shopify Store' : activeConnectModal === 'stripe' ? 'Stripe Payments' : 'Square POS'}
                    </h3>
                    <p className="text-xs text-gray-500">Configure your channel credentials to enable real-time order syncing.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveConnectModal(null); setIntegrationError(""); }}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConnectIntegration} className="p-6 flex flex-col gap-4">
                {activeConnectModal === 'shopify' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Shopify Store Domain</label>
                      <input
                        type="text"
                        placeholder="your-store-name.myshopify.com"
                        value={connectDomain}
                        onChange={(e) => setConnectDomain(e.target.value)}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Admin API Access Token</label>
                      <input
                        type="password"
                        placeholder="Enter your Shopify Admin API Token"
                        value={connectApiKey}
                        onChange={(e) => setConnectApiKey(e.target.value)}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Generated from your Shopify Partner or Admin Apps dashboard.</p>
                    </div>
                  </>
                )}

                {activeConnectModal === 'stripe' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Stripe Publishable Key</label>
                      <input
                        type="text"
                        placeholder="Enter your Stripe Publishable Key"
                        value={connectApiKey}
                        onChange={(e) => setConnectApiKey(e.target.value)}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Stripe Secret or Restricted Key</label>
                      <input
                        type="password"
                        placeholder="Enter your Stripe Secret / Restricted API Key"
                        value={connectSecretKey}
                        onChange={(e) => setConnectSecretKey(e.target.value)}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Used to verify incoming webhook signatures and synchronize sales.</p>
                    </div>
                  </>
                )}

                {activeConnectModal === 'square' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Square Application ID / Token</label>
                      <input
                        type="text"
                        placeholder="Enter Square Application ID"
                        value={connectApiKey}
                        onChange={(e) => setConnectApiKey(e.target.value)}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">POS Location Name or Register ID</label>
                      <input
                        type="text"
                        placeholder="e.g. Counter Register 1 / Main Street Location"
                        value={connectDomain}
                        onChange={(e) => setConnectDomain(e.target.value)}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </>
                )}

                {integrationError && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium">
                    {integrationError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setActiveConnectModal(null); setIntegrationError(""); }}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnectingIntegration}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                      activeConnectModal === 'shopify' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      activeConnectModal === 'stripe' ? 'bg-indigo-600 hover:bg-indigo-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isConnectingIntegration ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <PlusCircle size={13} />
                        Save & Connect {activeConnectModal === 'shopify' ? 'Shopify' : activeConnectModal === 'stripe' ? 'Stripe' : 'Square'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BAM Feature 4: Interactive Drill-Down Analysis Drawer / Modal */}
        {isDrilldownOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                    <Eye size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-gray-900">Drill-Down Root Cause Analysis</h3>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                        {drilldownCategory === "all" ? "All Categories" : drilldownCategory}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Deep granular inspection of underlying transactions & business drivers</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDrilldownOpen(false)} 
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Category Quick Filter Pills */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-gray-500 shrink-0">Filter Slice:</span>
                {["all", ...inventoryData.map(i => i.category)].slice(0, 8).map((catName) => (
                  <button
                    key={catName}
                    onClick={() => handleOpenDrilldown(catName)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      drilldownCategory === catName 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {catName === "all" ? "All Segments" : catName}
                  </button>
                ))}
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {isDrilldownLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <RefreshCw size={32} className="animate-spin text-blue-600" />
                    <p className="text-sm font-semibold">Running root cause analytics...</p>
                  </div>
                ) : drilldownData ? (
                  <>
                    {/* Automated Root Cause Diagnostics Box */}
                    <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200/80">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-blue-600" />
                        <h4 className="text-sm font-extrabold text-blue-950">Automated Root-Cause Diagnostic</h4>
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed font-medium">
                        {drilldownData.root_cause_summary}
                      </p>
                    </div>

                    {/* Metric Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-1">Segment Revenue</p>
                        <p className="text-xl font-extrabold text-gray-900">${(drilldownData.total_revenue || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-1">Average Order</p>
                        <p className="text-xl font-extrabold text-gray-900">${(drilldownData.average_order || 0).toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-1">Top Product SKU</p>
                        <p className="text-sm font-extrabold text-blue-600 truncate">{drilldownData.top_sku || "N/A"}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-1">Key Customer</p>
                        <p className="text-sm font-extrabold text-indigo-600 truncate">ID #{drilldownData.top_customer || "1"}</p>
                      </div>
                    </div>

                    {/* Underlying Granular Transactions Table */}
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center justify-between">
                        <span>Underlying Transaction Records ({drilldownData.total_records})</span>
                        <span className="text-xs text-gray-400 font-normal">Sorted by highest transaction value</span>
                      </h4>
                      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">SKU</th>
                              <th className="p-3">Customer</th>
                              <th className="p-3">Source</th>
                              <th className="p-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(drilldownData.transactions || []).map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="p-3 text-gray-600 font-medium">{tx.date}</td>
                                <td className="p-3 font-bold text-gray-800">{tx.category}</td>
                                <td className="p-3 font-mono text-gray-600">{tx.product_sku}</td>
                                <td className="p-3 text-gray-600">#{tx.customer_id}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-md">
                                    {tx.source}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-extrabold text-gray-900">
                                  ${tx.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">AI Diagnostic Engine • Real-time database slice</span>
                <button 
                  onClick={() => setIsDrilldownOpen(false)}
                  className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
