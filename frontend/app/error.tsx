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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 text-center">
      <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl max-w-md w-full shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={28} className="animate-spin-slow" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Workspace Refresh Needed</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {error?.message || "A cache update was completed on your workspace. Click reload to refresh smoothly."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Reload Page
          </button>
          <button
            onClick={handleResetSession}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={14} /> Clear Cache & Log In
          </button>
        </div>
      </div>
    </div>
  );
}
