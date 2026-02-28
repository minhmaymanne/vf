import { useStore } from "@nanostores/react";
import { useState, useEffect } from "react";
import { vehicleStore } from "../stores/vehicleStore";

const INIT_TIMEOUT_MS = 15_000;

export default function AuthGate() {
  const { isInitialized, vin } = useStore(vehicleStore);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isInitialized && vin) return;
    const timer = setTimeout(() => setTimedOut(true), INIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isInitialized, vin]);

  // Authenticated: Render nothing (unblock the view)
  if (isInitialized && vin) return null;

  // Loading timed out — show retry / error state
  if (timedOut) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-[9999] px-6">
        <div className="relative mb-4">
          <img src="/logo.png" className="w-14 h-14 object-contain opacity-60" alt="Logo" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Unable to load vehicle data</p>
        <p className="text-xs text-gray-400 mb-6 text-center max-w-xs">
          This may be a temporary network issue or an expired session.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setTimedOut(false); window.location.reload(); }}
            className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-colors shadow-md"
          >
            Retry
          </button>
          <button
            onClick={() => { window.location.href = "/login"; }}
            className="px-5 py-2.5 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors"
          >
            Re-login
          </button>
        </div>
      </div>
    );
  }

  // Loading State (Not initialized yet or checking auth)
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-[9999]">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-gray-100 border-t-blue-600 animate-spin shadow-inner"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/logo.png"
            className="w-10 h-10 object-contain"
            alt="Logo"
          />
        </div>
      </div>
      <div className="flex flex-col items-center space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
          Authenticating
        </p>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
