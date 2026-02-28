import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { mqttStore } from "../stores/mqttStore";
import { chargingHistoryStore } from "../stores/chargingHistoryStore";
import { vehicleStore } from "../stores/vehicleStore";

/**
 * Diagnostic panel — shows MQTT status, charging data status, active API test
 * results, and captured errors. Helps debug deployment issues remotely.
 *
 * Tap the status dot to expand/collapse.
 * Auto-expands on critical errors.
 */
export default function DebugPanel() {
  const mqtt = useStore(mqttStore);
  const charging = useStore(chargingHistoryStore);
  const vehicle = useStore(vehicleStore);
  const [expanded, setExpanded] = useState(false);
  const [serverDiag, setServerDiag] = useState(null);
  const [apiTests, setApiTests] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const autoExpandedRef = useRef(false);

  // Capture console.error and console.warn for display
  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    const addLog = (level, args) => {
      const msg = args.map(a => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === "object") {
          try { return JSON.stringify(a).substring(0, 200); } catch { return String(a); }
        }
        return String(a);
      }).join(" ").substring(0, 400);

      const next = [...logsRef.current.slice(-29), { level, msg, t: Date.now() }];
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

  // Auto-expand on critical errors (first time only)
  useEffect(() => {
    if (autoExpandedRef.current || expanded) return;
    const hasError = mqtt.status === "error" || charging.error;
    // Wait 10s for errors to surface before auto-expanding
    const timer = setTimeout(() => {
      const stillError = mqttStore.get().status === "error" || chargingHistoryStore.get().error;
      if (stillError && !autoExpandedRef.current) {
        autoExpandedRef.current = true;
        setExpanded(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [mqtt.status, charging.error, expanded]);

  // Run server diagnostics on first expand
  useEffect(() => {
    if (!expanded || serverDiag) return;
    setServerDiag({ status: "testing..." });

    (async () => {
      try {
        const res = await fetch("/api/debug", { credentials: "include" });
        const data = await res.json();
        setServerDiag(data);
      } catch (e) {
        setServerDiag({ error: e.message });
      }
    })();
  }, [expanded]);

  // Run active API endpoint tests on first expand
  const runApiTests = useCallback(async () => {
    const vin = vehicleStore.get().vin;
    const results = {};

    // Test 1: Server debug endpoint
    try {
      const t0 = performance.now();
      const res = await fetch("/api/debug", { credentials: "include" });
      results.debug = { status: res.status, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      results.debug = { error: e.message };
    }

    // Test 2: Vehicle info (GET, unsigned)
    try {
      const t0 = performance.now();
      const res = await fetch("/api/proxy/ccarusermgnt/api/v1/user-vehicle?region=vn", {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      let dataLen = 0;
      try { dataLen = JSON.parse(text)?.data?.length || 0; } catch {}
      results.vehicles = { status: res.status, ms, vehicles: dataLen };
      if (!res.ok) results.vehicles.body = text.substring(0, 100);
    } catch (e) {
      results.vehicles = { error: e.message };
    }

    // Test 3: Charging sessions (POST, signed — requires X-HASH)
    if (vin) {
      try {
        const t0 = performance.now();
        const res = await fetch("/api/proxy/ccarcharging/api/v1/charging-sessions/search?region=vn&page=0&size=1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-vin-code": vin,
            "x-service-name": "CAPP",
            "x-device-platform": "android",
            "x-device-identifier": "vfdashboard-community-edition",
          },
          body: JSON.stringify({ orderStatus: [3, 5, 7] }),
        });
        const text = await res.text();
        const ms = Math.round(performance.now() - t0);
        const proxyLog = res.headers.get("x-proxy-log");
        let sessions = 0;
        try { sessions = JSON.parse(text)?.data?.length || 0; } catch {}
        results.charging = { status: res.status, ms, sessions };
        if (proxyLog) {
          try { results.charging.proxyLog = JSON.parse(proxyLog); } catch {}
        }
        if (!res.ok) results.charging.body = text.substring(0, 150);
      } catch (e) {
        results.charging = { error: e.message };
      }
    } else {
      results.charging = { skipped: "no VIN" };
    }

    // Test 4: MQTT credentials
    try {
      const t0 = performance.now();
      const res = await fetch("/api/mqtt-credentials", { credentials: "include" });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      let data = {};
      try { data = JSON.parse(text); } catch {}
      results.mqttCreds = {
        status: res.status,
        ms,
        hasAccessKey: !!data.accessKeyId,
        hasSecretKey: !!data.secretAccessKey,
        hasSessionToken: !!data.sessionToken,
        policyAttached: data.policyAttached,
        endpoint: data.endpoint || null,
      };
      if (!res.ok) results.mqttCreds.body = text.substring(0, 150);
    } catch (e) {
      results.mqttCreds = { error: e.message };
    }

    // Test 5: list_resource registration (POST, signed)
    if (vin) {
      try {
        const t0 = performance.now();
        const res = await fetch(`/api/proxy/ccaraccessmgmt/api/v1/telemetry/${vin}/list_resource?region=vn`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-vin-code": vin,
            "x-service-name": "CAPP",
            "x-device-platform": "android",
            "x-device-identifier": "vfdashboard-community-edition",
          },
          body: JSON.stringify([{ objectId: "34101", instanceId: "0", resourceId: "0" }]),
        });
        const text = await res.text();
        const ms = Math.round(performance.now() - t0);
        results.listResource = { status: res.status, ms };
        if (!res.ok) results.listResource.body = text.substring(0, 100);
      } catch (e) {
        results.listResource = { error: e.message };
      }
    }

    setApiTests(results);
  }, []);

  useEffect(() => {
    if (!expanded || apiTests) return;
    setApiTests({ status: "running..." });
    runApiTests();
  }, [expanded, apiTests, runApiTests]);

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
        <span className="font-bold text-xs">Diagnostics v2</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { setApiTests(null); setServerDiag(null); }}
            className="text-blue-400 hover:text-blue-300 text-[9px] px-1"
          >
            Re-test
          </button>
          <button onClick={() => setExpanded(false)} className="text-white/50 hover:text-white text-sm px-1">&times;</button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Active API Tests — most important section */}
        <Section title="API Endpoint Tests">
          {apiTests && apiTests.status !== "running..." ? (
            Object.entries(apiTests).map(([name, result]) => {
              if (typeof result !== "object" || !result) return null;
              const ok = result.status >= 200 && result.status < 400;
              const summary = result.error
                ? `ERR: ${result.error}`
                : result.skipped
                ? result.skipped
                : `${result.status} (${result.ms}ms)`;
              return (
                <div key={name}>
                  <Row label={name} value={summary} ok={result.error ? false : result.skipped ? undefined : ok} />
                  {result.body && (
                    <div className="text-[8px] text-red-300/70 ml-2 break-all">{result.body}</div>
                  )}
                  {result.proxyLog && (
                    <div className="text-[8px] text-white/40 ml-2">
                      {result.proxyLog.map((l, i) => (
                        <span key={i}>{l.via}:{l.status}({l.ms}ms) </span>
                      ))}
                    </div>
                  )}
                  {/* Extra fields for specific tests */}
                  {result.vehicles != null && <Row label="  vehicles" value={String(result.vehicles)} ok={result.vehicles > 0} />}
                  {result.sessions != null && <Row label="  sessions" value={String(result.sessions)} ok={result.sessions > 0} />}
                  {result.hasAccessKey != null && <Row label="  hasKeys" value={`ak:${result.hasAccessKey} sk:${result.hasSecretKey} st:${result.hasSessionToken}`} ok={result.hasAccessKey && result.hasSecretKey && result.hasSessionToken} />}
                  {result.policyAttached != null && <Row label="  policy" value={String(result.policyAttached)} ok={result.policyAttached} />}
                  {result.endpoint && <Row label="  endpoint" value={result.endpoint} />}
                </div>
              );
            })
          ) : (
            <Row label="Status" value={apiTests?.status || "not tested"} />
          )}
        </Section>

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

        {/* Server Diagnostics */}
        <Section title="Server Diagnostics">
          {serverDiag && serverDiag.status !== "testing..." ? (
            Object.entries(serverDiag).map(([k, v]) => (
              <Row key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} ok={v === true || v === "ok"} />
            ))
          ) : (
            <Row label="Status" value={serverDiag?.status || "not tested"} />
          )}
        </Section>

        {/* Captured Logs */}
        {logs.length > 0 && (
          <Section title={`Console (${logs.length})`}>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
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
