"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { UploadCloud, LayoutDashboard, DollarSign, Package, MessageSquare, Bell, Send, CheckCircle, AlertTriangle, Info, LogOut, Lock, Search, X, Copy, Check, Sparkles, TrendingUp, Database, FileText, User, Trash2, Menu } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [cashflowData, setCashflowData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<any>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [insightsData, setInsightsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Insights tab state
  const [insightFilter, setInsightFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [copiedInsight, setCopiedInsight] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isChatLoading]);

  // Tracking uploaded files and errors
  const [uploadError, setUploadError] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Profile state
  const [userProfile, setUserProfile] = useState<{email: string, files: any[]} | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (token) {
      fetchAllData();
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/user/profile", config);
      setUserProfile(res.data);
    } catch (e: any) {
      console.error("Failed to fetch profile");
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        localStorage.removeItem("token");
        setToken(null);
      }
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file and all its data?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/user/files/${fileId}`, config);
      fetchProfile();
      fetchAllData();
    } catch (e) {
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
    
    // Catch common typos for popular domains
    const domain = email.split('@')[1].toLowerCase();
    const invalidDomains = ['gmail.co', 'gmail.con', 'gmail.com.co', 'yaho.com', 'yahoo.co', 'hotmail.co'];
    if (invalidDomains.includes(domain)) {
      setAuthError(`Invalid domain extension. Did you mean .com?`);
      return;
    }

    try {
      if (authMode === "register") {
        await axios.post((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/auth/register", { email, password });
        alert("Account created successfully! Please log in.");
        setAuthMode("login");
      } else {
        const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/auth/login", { email, password });
        setToken(res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
      }
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || "Authentication failed.");
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
    } catch (e) {
      alert("Error generating report.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setOverviewData(null);
    setCashflowData(null);
    setInventoryData([]);
    setInventoryMetrics(null);
    setInsightsData([]);
    setDismissedInsights([]);
    setChatLog([]); 
  };

  const fetchAllData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [overviewRes, cashflowRes, invRes, insightsRes] = await Promise.all([
        axios.get((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/analytics/overview", config),
        axios.get((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/analytics/cashflow", config),
        axios.get((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/inventory", config),
        axios.get((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/insights", config)
      ]);

      setOverviewData(overviewRes.data);
      setCashflowData(cashflowRes.data);
      setInventoryData(invRes.data.inventory || []);
      setInventoryMetrics(invRes.data.metrics || null);
      setInsightsData(insightsRes.data.insights || []);
    } catch (e: any) {
      console.log("No data found or unauthorized.");
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        localStorage.removeItem("token");
        setToken(null);
      }
    }
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
      await axios.post((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/upload", formData, config);
      
      // Reset upload inputs immediately
      setFile(null);
      const fileInput = document.getElementById('dataset-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      setChatLog([]); 

      // Poll until processing is complete
      const pollInterval = setInterval(async () => {
        try {
          const res = await axios.get((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/user/profile", config);
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
        } catch (e) {
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

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatLog((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Append an empty AI message to the chat log to stream into
      setChatLog((prev) => [...prev, { role: "ai", text: "" }]);
      
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/chat", {
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
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        
        // Update the last message in the chat log with the new chunk
        setChatLog((prev) => {
          const newLog = [...prev];
          newLog[newLog.length - 1].text += chunk;
          return newLog;
        });
      }
    } catch (e) {
      setChatLog((prev) => {
        const newLog = [...prev];
        if (newLog[newLog.length - 1].text === "") {
           newLog[newLog.length - 1].text = "Error reaching AI.";
        }
        return newLog;
      });
      setIsChatLoading(false);
    }
  };

  const totalUnitsSold = inventoryData.reduce((sum, item) => sum + item.sold, 0);
  const avgUnitValue = totalUnitsSold > 0 && overviewData?.kpis?.total_revenue 
    ? parseFloat(overviewData.kpis.total_revenue) / totalUnitsSold : 0;

  let runningTotal = 0;
  const cumulativeCashflow = cashflowData?.cashflow?.map((item: any) => {
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

  if (!token) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 items-center justify-center p-4 py-12 relative">
        {/* Abstract background shapes */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>
        
        <div className="glass-card p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-[420px] relative z-10">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-600/30">
              <LayoutDashboard className="text-white" size={28} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {authMode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-gray-500 mt-2 text-sm text-center">
              {authMode === "login" ? "Enter your details to access your dashboard." : "Start exploring your business data today."}
            </p>
          </div>
          
          <div className="flex flex-col gap-3 mb-6">
            <button type="button" onClick={() => alert("Google login is coming soon!")} className="flex items-center justify-center gap-3 w-full p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">Or continue with email</span></div>
          </div>

          {authError && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2"><AlertTriangle size={16}/>{authError}</div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {authMode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                {authMode === "login" && <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Forgot password?</a>}
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
            </div>

            {authMode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" required />
              </div>
            )}

            {authMode === "register" && (
              <div className="flex items-start gap-2 mt-1">
                <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" required />
                <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
                </label>
              </div>
            )}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 mt-2">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); setPassword(""); setConfirmPassword(""); }} className="ml-1 font-bold text-blue-600 hover:text-blue-700 transition-colors">
                {authMode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const formatCompact = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-black relative overflow-hidden">
        {/* Subtle Dashboard Background Shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-300/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob pointer-events-none"></div>
        <div className="absolute bottom-0 left-64 w-[600px] h-[600px] bg-purple-300/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000 pointer-events-none"></div>
      {/* Mobile Top Nav */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-30 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">BI Platform</h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-900 p-1">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 text-white p-6 flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">BI Platform</h1>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-col gap-6 flex-1">
          <button onClick={() => { setActiveTab("upload"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'upload' ? 'text-blue-400' : ''}`}><UploadCloud size={20}/> Upload Data</button>
          <button onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'dashboard' ? 'text-blue-400' : ''}`}><LayoutDashboard size={20}/> Dashboard</button>
          <button onClick={() => { setActiveTab("cashflow"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'cashflow' ? 'text-blue-400' : ''}`}><DollarSign size={20}/> Cashflow</button>
          <button onClick={() => { setActiveTab("chat"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'chat' ? 'text-blue-400' : ''}`}><MessageSquare size={20}/> AI Chat</button>
          <button onClick={() => { setActiveTab("inventory"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'inventory' ? 'text-blue-400' : ''}`}><Package size={20}/> Inventory</button>
          <button onClick={() => { setActiveTab("insights"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'insights' ? 'text-blue-400' : ''}`}><Bell size={20}/> Insights</button>
          <button onClick={() => { setActiveTab("profile"); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 hover:text-blue-400 ${activeTab === 'profile' ? 'text-blue-400' : ''}`}><User size={20}/> Account</button>
        </div>
        <div className="pt-6 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full"><LogOut size={20}/> Log Out</button>
        </div>
      </div>

      <div className="flex-1 p-6 pt-24 md:p-10 md:pt-10 overflow-y-auto">
        {activeTab === "upload" && (
          <div className="flex flex-col xl:flex-row gap-8 min-h-[calc(100vh-6rem)] xl:h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-y-auto xl:overflow-y-visible pb-8 xl:pb-0">
            
            {/* Introduction Side */}
            <div className="flex-1 bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 text-white p-10 lg:p-14 rounded-3xl shadow-2xl flex flex-col justify-center relative overflow-hidden shrink-0 xl:shrink">
              {/* Animated Abstract background shapes */}
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob"></div>
              <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob animation-delay-4000"></div>
              
              <div className="absolute top-10 right-10 opacity-10 transform translate-x-1/4 -translate-y-1/4 animate-pulse">
                <Database size={300} />
              </div>
              
              <div className="relative z-10 max-w-2xl bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-blue-50 text-xs font-semibold mb-6 shadow-sm">
                  <Sparkles size={14} className="text-blue-200" /> Intelligent Analytics Engine
                </div>
                
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-4 leading-snug tracking-tight">
                  Transform Raw Data Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">Actionable Intelligence</span>
                </h1>
                
                <p className="text-blue-100/90 text-base mb-8 leading-relaxed font-medium">
                  Upload your sales or inventory CSV data. Our schemaless ETL pipeline will automatically process it, generate financial KPIs, detect anomalies, and prepare an AI assistant to answer your business questions.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10 shadow-sm">
                      <TrendingUp size={20} className="text-blue-100" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base mb-1">Instant Dashboards</h3>
                      <p className="text-xs text-blue-200/80 leading-relaxed">Watch your KPIs and revenue trends populate in real-time.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10 shadow-sm">
                      <MessageSquare size={20} className="text-blue-100" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base mb-1">AI Data Assistant</h3>
                      <p className="text-xs text-blue-200/80 leading-relaxed">Chat naturally with your data to uncover hidden insights.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Side */}
            <div className="xl:w-[450px] bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white flex flex-col items-center justify-center text-center relative hover:shadow-[0_20px_50px_rgba(8,112,184,0.15)] transition-all duration-500">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-100 to-purple-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 group hover:scale-110 transition-transform duration-300">
                <UploadCloud size={36} className="animate-bounce" />
              </div>
              <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-800 tracking-tight">Upload Dataset</h2>
              <p className="text-gray-500 mb-8 text-sm font-medium">Drag and drop your <strong className="text-indigo-600">.csv</strong> file to begin</p>
              
              <div className="w-full relative group">
                <input 
                  id="dataset-upload"
                  type="file" 
                  accept=".csv,.pdf,.txt" 
                  onChange={handleFileChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-2xl p-10 transition-all duration-200 ease-in-out ${file ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-gray-50 group-hover:border-blue-400 group-hover:bg-blue-50/30'}`}>
                  {file ? (
                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                      <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                        <FileText size={32} className="text-blue-600" />
                      </div>
                      <p className="font-bold text-gray-800 truncate max-w-[250px] text-lg">{file.name}</p>
                      <p className="text-sm font-medium text-blue-600 mt-2">Ready to process</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500">
                      <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-200">
                        <UploadCloud size={28} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="font-semibold text-gray-700 text-lg mb-1">Select a file</p>
                      <p className="text-sm mt-1">Upload Data (CSV) or Documents (PDF, TXT)</p>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl flex items-start gap-3 w-full text-left animate-in slide-in-from-top-2 border border-red-100">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{uploadError}</p>
                </div>
              )}

              <button 
                onClick={handleUpload} 
                disabled={loading || !file} 
                className={`mt-10 w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 ${
                  loading || !file 
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0"
                }`}
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview Dashboard</h2>
                <p className="text-gray-500 mt-1">Your high-level business performance metrics.</p>
              </div>
              <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <FileText size={16} /> Export Report
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign size={48} />
                </div>
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <p className="text-gray-500 font-medium mb-1 text-sm">Total Revenue</p>
                <p className="text-3xl font-extrabold text-gray-900 truncate" title={String(overviewData.kpis.total_revenue)}>
                  ${formatCompact(overviewData.kpis.total_revenue)}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp size={48} />
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${overviewData.kpis.mom_growth >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <TrendingUp size={20} className={overviewData.kpis.mom_growth >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                </div>
                <p className="text-gray-500 font-medium mb-1 text-sm">MoM Growth</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-gray-900 truncate">
                    {overviewData.kpis.mom_growth >= 0 ? '+' : ''}{overviewData.kpis.mom_growth}%
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${overviewData.kpis.mom_growth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    vs last mo
                  </span>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Package size={48} />
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Package size={20} className="text-blue-600" />
                </div>
                <p className="text-gray-500 font-medium mb-1 text-sm">Total Units</p>
                <p className="text-3xl font-extrabold text-gray-900 truncate" title={String(totalUnitsSold)}>
                  {formatCompact(totalUnitsSold)}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles size={48} />
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                  <Sparkles size={20} className="text-purple-600" />
                </div>
                <p className="text-gray-500 font-medium mb-1 text-sm">Avg. Order Value</p>
                <p className="text-3xl font-extrabold text-gray-900 truncate" title={String(avgUnitValue)}>
                  ${formatCompact(avgUnitValue)}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Database size={48} />
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                  <Database size={20} className="text-indigo-600" />
                </div>
                <p className="text-gray-500 font-medium mb-1 text-sm">Avg. CLV</p>
                <p className="text-3xl font-extrabold text-gray-900 truncate" title={String(overviewData.kpis.clv)}>
                  ${formatCompact(overviewData.kpis.clv)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Line Chart Container */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 h-[450px] flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Daily Revenue Spikes</h3>
                    <p className="text-sm text-gray-500">Revenue trajectory over time</p>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="min-w-[600px] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewData.revenue_trend} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" stroke="#9ca3af" axisLine={false} tickLine={false} />
                        <YAxis 
                          stroke="#9ca3af" 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={(value) => `$${formatCompact(value)}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} dot={false} activeDot={{ r: 6, fill: '#2563eb' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

             {/* Bar Chart Container */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 h-[450px] flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Units Sold by Category</h3>
                    <p className="text-sm text-gray-500">Distribution of product sales</p>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="min-w-[600px] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="category" 
                          stroke="#9ca3af" 
                          interval={0} 
                          angle={-45} 
                          textAnchor="end" 
                          height={60}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                        />
                        <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="sold" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cashflow" && cashflowData && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Cashflow Analytics</h2>
                <p className="text-gray-500 mt-1">Deep dive into your financial health and growth.</p>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 h-[450px] flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Cumulative Business Growth</h3>
                <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="min-w-[600px] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeCashflow} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Detailed Financial Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={18} /></div>
                    <p className="text-sm text-emerald-800 font-semibold">Operating Cash Flow</p>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-900 truncate" title={String(cashflowData.financial_metrics.operating_cash_flow ?? "N/A")}>
                    {cashflowData.financial_metrics.operating_cash_flow !== null ? "$" + formatCompact(cashflowData.financial_metrics.operating_cash_flow) : "N/A"}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={18} /></div>
                    <p className="text-sm text-blue-800 font-semibold">Gross Margin</p>
                  </div>
                  <p className="text-2xl font-extrabold text-blue-900 truncate" title={String(cashflowData.financial_metrics.gross_margin ?? "Requires Cost Data")}>
                    {cashflowData.financial_metrics.gross_margin !== null ? `${cashflowData.financial_metrics.gross_margin}%` : "Requires Cost Data"}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Sparkles size={18} /></div>
                    <p className="text-sm text-purple-800 font-semibold">Net Margin</p>
                  </div>
                  <p className="text-2xl font-extrabold text-purple-900 truncate" title={String(cashflowData.financial_metrics.net_margin ?? "Requires Profit Data")}>
                    {cashflowData.financial_metrics.net_margin !== null ? `${cashflowData.financial_metrics.net_margin}%` : "Requires Profit Data"}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-200 text-gray-600 rounded-lg"><AlertTriangle size={18} /></div>
                    <p className="text-sm text-gray-700 font-semibold">Cash Burn Rate</p>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 truncate" title={String(cashflowData.financial_metrics.burn_rate)}>
                    ${formatCompact(cashflowData.financial_metrics.burn_rate)} <span className="text-base font-medium text-gray-500">/mo</span>
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
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Inventory Intelligence</h2>
                <p className="text-gray-500 mt-1">Real-time stock tracking and portfolio health.</p>
              </div>
            </div>
            
            {inventoryMetrics && (
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
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" 
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
                    {inventoryData.filter(item => item.category.toLowerCase().includes(inventorySearch.toLowerCase())).map((item, idx) => (
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
                    ))}
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
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Proactive Insights</h2>
                <p className="text-gray-500 mt-2">AI-driven analysis and key observations from your latest data.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search insights..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button onClick={() => setInsightFilter("all")} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${insightFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>All ({insightCounts.total})</button>
              <button onClick={() => setInsightFilter("alert")} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${insightFilter === 'alert' ? 'bg-amber-100 text-amber-800 border-amber-200 border' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Alerts ({insightCounts.alert})</button>
              <button onClick={() => setInsightFilter("success")} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${insightFilter === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 border' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Success ({insightCounts.success})</button>
              <button onClick={() => setInsightFilter("info")} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${insightFilter === 'info' ? 'bg-blue-100 text-blue-800 border-blue-200 border' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Info ({insightCounts.info})</button>
            </div>
            
            {visibleInsights.length === 0 ? (
              <div className="bg-white border rounded-xl p-12 text-center text-gray-500 shadow-sm">
                <Bell className="mx-auto mb-4 text-gray-300" size={48} />
                <h3 className="text-lg font-semibold text-gray-700">No insights found</h3>
                <p>Try adjusting your search or filters, or upload more data.</p>
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
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[85vh] max-h-[800px] animate-in fade-in duration-500 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Data Assistant</h2>
                  <p className="text-sm text-gray-500">Ask questions grounded in your latest uploaded data.</p>
                </div>
              </div>
              <button 
                onClick={() => setChatLog([])}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors flex items-center gap-2"
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
                  <h3 className="text-xl font-bold text-gray-800 mb-2">How can I help you today?</h3>
                  <p className="text-gray-500 max-w-md">
                    Try asking about your revenue trends, top performing products, or anomalies in your inventory.
                  </p>
                </div>
              ) : (
                chatLog.map((msg, i) => (
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
                        {(msg.text || "").split(/(\*\*.*?\*\*)/g).map((part, partIdx) => {
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
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-end gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-1">
                      <Sparkles size={14} className="text-blue-600 animate-pulse" />
                    </div>
                    <div className="p-4 rounded-2xl shadow-sm bg-white border border-gray-100 rounded-bl-sm flex gap-1 items-center h-[52px]">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
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
                  placeholder="Ask a question about your revenue, inventory, or trends..."
                  className="flex-1 pl-6 pr-16 py-4 bg-gray-50 border border-gray-200 rounded-full text-base outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" 
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={!chatInput.trim()}
                  className={`absolute right-2 p-3 rounded-full flex items-center justify-center transition-all ${
                    !chatInput.trim() 
                      ? "bg-gray-100 text-gray-400" 
                      : "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">AI responses are generated based on your uploaded CSV context.</p>
            </div>
          </div>
        )}

        {activeTab === "profile" && userProfile && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Account & Resources</h2>
                <p className="text-gray-500 mt-1">Manage your credentials and uploaded datasets.</p>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 flex items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <User size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">User Profile</h3>
                <p className="text-gray-500 font-medium">{userProfile.email}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Uploaded Files</h3>
              {userProfile.files.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-gray-500">You haven't uploaded any files yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userProfile.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 shadow-sm rounded-xl ${file.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-white text-gray-600'}`}>
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{file.filename}</p>
                            <p className={`text-xs mt-0.5 font-medium ${file.status === 'processing' ? 'text-blue-500 animate-pulse' : file.status === 'failed' ? 'text-red-500' : 'text-green-500'}`}>
                              {file.status === 'processing' ? 'Processing in background...' : file.status === 'failed' ? 'Failed processing' : 'Data Ready'}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteFile(file.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete file and its data">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}