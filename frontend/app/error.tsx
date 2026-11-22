"use client";
import { useEffect } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard caught client error:", error);
  }, [error]);

  const handleResetSession = () => {
    try {
      localStorage.removeItem("token");
    } catch {}
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
      <div className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={28} className="animate-spin-slow" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-2">Workspace Refresh Needed</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {error?.message || "A cache update was completed on your workspace. Click reload to refresh smoothly."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            Reload Page
          </button>
          <button
            onClick={handleResetSession}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={14} /> Clear Cache & Log In
          </button>
        </div>
      </div>
    </div>
  );
}
