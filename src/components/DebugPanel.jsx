import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { mqttStore } from "../stores/mqttStore";
import { chargingHistoryStore } from "../stores/chargingHistoryStore";
import { vehicleStore } from "../stores/vehicleStore";

/**
 * Small diagnostic panel — shows MQTT status, charging data status,
 * and captured errors. Helps debug issues when browser console isn't accessible.
 *
 * Tap the status dot to expand/collapse.
 */
export default function DebugPanel() {
  const mqtt = useStore(mqttStore);
  const charging = useStore(chargingHistoryStore);
  const vehicle = useStore(vehicleStore);
  const [expanded, setExpanded] = useState(false);
  const [apiTest, setApiTest] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsRef = useRef(logs);
  logsRef.current = logs;

  // Capture console.error and console.warn for display
  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    const addLog = (level, args) => {
      const msg = args.map(a => {
        if (a instanceof Error) return a.message;
        if (typeof a === "object") {
          try { return JSON.stringify(a).substring(0, 200); } catch { return String(a); }
        }
        return String(a);
      }).join(" ").substring(0, 300);

      const next = [...logsRef.current.slice(-19), { level, msg, t: Date.now() }];
      logsRef.current = next;
      setLogs(next);
    };

    console.error = (...args) => {
      addLog("error", args);
      origError.apply(console, args);
    };
    console.warn = (...args) => {
      addLog("warn", args);
      origWarn.apply(console, args);
    };

    return () => {
      console.error = origError;
      console.warn = origWarn;
    };
  }, []);

  // Run API diagnostic test on first expand
  useEffect(() => {
    if (!expanded || apiTest) return;
    setApiTest({ status: "testing..." });

    (async () => {
      try {
        const res = await fetch("/api/debug", { credentials: "include" });
        const data = await res.json();
        setApiTest(data);
      } catch (e) {
        setApiTest({ error: e.message });
      }
    })();
  }, [expanded]);

  const mqttColor = {
    connected: "bg-green-500",
    connecting: "bg-yellow-500 animate-pulse",
    error: "bg-red-500",
    disconnected: "bg-gray-400",
  }[mqtt.status] || "bg-gray-400";

  const chargingOk = charging.totalLoaded > 0;
  const hasError = mqtt.status === "error" || charging.error;
  const dotColor = hasError ? "bg-red-500" : mqtt.status === "connected" && chargingOk ? "bg-green-500" : "bg-yellow-500 animate-pulse";

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 md:bottom-4 right-4 z-[9998] flex items-center gap-1.5 px-2 py-1 bg-black/70 backdrop-blur rounded-full text-[9px] text-white/80 font-mono shadow-lg"
        title="Diagnostics"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {mqtt.status === "error" ? "ERR" : mqtt.status.substring(0, 4).toUpperCase()}
        {charging.totalLoaded > 0 && ` | ${charging.totalLoaded}ch`}
        {charging.error && " | CH-ERR"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[9998] w-80 max-h-[70vh] overflow-y-auto bg-black/90 backdrop-blur-sm text-white rounded-2xl shadow-2xl text-[10px] font-mono">
      <div className="sticky top-0 bg-black/95 flex justify-between items-center px-3 py-2 border-b border-white/10">
        <span className="font-bold text-xs">Diagnostics</span>
        <button onClick={() => setExpanded(false)} className="text-white/50 hover:text-white text-sm px-1">&times;</button>
      </div>

      <div className="p-3 space-y-3">
        {/* Vehicle Store */}
        <Section title="Vehicle">
          <Row label="VIN" value={vehicle.vin || "null"} />
          <Row label="Model" value={vehicle.model || "--"} />
          <Row label="Initialized" value={String(!!vehicle.isInitialized)} ok={vehicle.isInitialized} />
          <Row label="Refreshing" value={String(!!vehicle.isRefreshing)} ok={!vehicle.isRefreshing} />
          <Row label="Battery" value={vehicle.battery_level != null ? `${vehicle.battery_level}%` : "null"} ok={vehicle.battery_level != null} />
          <Row label="Range" value={vehicle.range != null ? `${vehicle.range}km` : "null"} ok={vehicle.range != null} />
          <Row label="Odometer" value={vehicle.odometer != null ? String(vehicle.odometer) : "null"} ok={vehicle.odometer != null} />
        </Section>

        {/* MQTT */}
        <Section title="MQTT">
          <Row label="Status" value={mqtt.status} ok={mqtt.status === "connected"} />
          {mqtt.error && <Row label="Error" value={mqtt.error} ok={false} />}
          <Row label="Messages" value={String(mqtt.messageCount)} ok={mqtt.messageCount > 0} />
          <Row label="Last msg" value={mqtt.lastMessageTime ? `${((Date.now() - mqtt.lastMessageTime) / 1000).toFixed(0)}s ago` : "never"} ok={!!mqtt.lastMessageTime} />
        </Section>

        {/* Charging */}
        <Section title="Charging History">
          <Row label="Loading" value={String(charging.isLoading)} />
          <Row label="Sessions" value={`${charging.totalLoaded}/${charging.totalRecords}`} ok={charging.totalLoaded > 0} />
          <Row label="VIN" value={charging.loadedVin || "null"} />
          {charging.error && <Row label="Error" value={charging.error} ok={false} />}
          {charging.warning && <Row label="Warn" value={charging.warning} />}
        </Section>

        {/* API Test */}
        <Section title="Server Diagnostics">
          {apiTest ? (
            Object.entries(apiTest).map(([k, v]) => (
              <Row key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} ok={v === true || v === "ok"} />
            ))
          ) : (
            <Row label="Status" value="not tested" />
          )}
        </Section>

        {/* Captured Logs */}
        {logs.length > 0 && (
          <Section title={`Console (${logs.length})`}>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {logs.map((l, i) => (
                <div key={i} className={`text-[9px] break-all ${l.level === "error" ? "text-red-400" : "text-yellow-400"}`}>
                  <span className="text-white/30">{new Date(l.t).toLocaleTimeString()}</span>{" "}
                  {l.msg}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value, ok }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className={`text-right truncate ${ok === true ? "text-green-400" : ok === false ? "text-red-400" : "text-white/80"}`}>
        {value}
      </span>
    </div>
  );
}
