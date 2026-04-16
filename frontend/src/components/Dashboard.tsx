import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate, useTransform } from "framer-motion";
import { api } from "../api/client";
import type { AnalysisResult, AuthUser, ShipmentRequest, StatsResult } from "../api/client";
import AdminPanel from "./AdminPanel";
import LogsPanel from "./LogsPanel";

type Position = ShipmentRequest & {
  code: string;
  company: string;
  color: string;
  emoji: string;
};

const POSITIONS: Position[] = [
  { code: "MAERSK", company: "Maersk Sentosa", vessel_name: "MAERSK SENTOSA", origin_port: "CNSHA", dest_port: "AEJEA", eta: "2026-05-15T08:00:00", cargo_type: "electronics", color: "from-slate-800 to-slate-900",   emoji: "⚓" },
  { code: "MSC",    company: "MSC Aurora",     vessel_name: "MSC AURORA",     origin_port: "DEHAM", dest_port: "SGSIN", eta: "2026-05-22T08:00:00", cargo_type: "machinery",   color: "from-slate-700 to-slate-800", emoji: "🛳" },
  { code: "CMA",    company: "CMA Tiara",      vessel_name: "CMA TIARA",      origin_port: "USLAX", dest_port: "JPYOK", eta: "2026-05-27T08:00:00", cargo_type: "automotive",  color: "from-slate-600 to-slate-700",  emoji: "🚢" },
  { code: "EVG",    company: "Evergreen Polaris", vessel_name: "EVERGREEN POLARIS", origin_port: "CNSHA", dest_port: "NLRTM", eta: "2026-06-02T08:00:00", cargo_type: "textiles", color: "from-slate-500 to-slate-600", emoji: "🚁" },
];

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };
const softSpring = { type: "spring" as const, stiffness: 260, damping: 30 };

const scoreBadge   = (s: number) => s >= 85 ? "CRITICAL" : s >= 70 ? "HIGH" : s >= 45 ? "MEDIUM" : "LOW";
const scoreToColor = (s: number) => s >= 70 ? "text-slate-900" : s >= 45 ? "text-slate-700" : "text-slate-500";
const scoreRingClr = (s: number) => s >= 70 ? "#0f172a" : s >= 45 ? "#475569" : "#94a3b8";

type Tab = "Home" | "Analyze" | "Logs" | "Admin";

export default function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("Home");
  const [selected, setSelected] = useState<Position>(POSITIONS[0]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [liveTrace, setLiveTrace] = useState<{ type: string; content: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [useStream, setUseStream] = useState(true);
  const abortStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const tick = () => api.stats().then(setStats).catch(() => {});
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  const analyze = async (p: Position) => {
    setSelected(p);
    setLoading(true);
    setResult(null);
    setLiveTrace([]);
    setShowDetail(true);
    abortStreamRef.current?.();

    if (useStream) {
      abortStreamRef.current = api.streamAnalyze(
        p,
        (step) => setLiveTrace((t) => [...t, step]),
        (final) => { setResult(final); setLoading(false); },
        (err)   => { console.error(err); fallbackAnalyze(p); }
      );
    } else {
      fallbackAnalyze(p);
    }
  };

  const fallbackAnalyze = async (p: Position) => {
    try {
      const r = await api.analyze(p);
      setResult(r);
      setLiveTrace(r.agent_trace ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center font-sans selection:bg-slate-200 overflow-x-hidden">

      {/* ---------- PERFECTLY CENTERED TOP BAR ---------- */}
      <div className="w-full max-w-5xl px-6 pt-10 pb-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center shadow-sm">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-slate-800 tracking-tight hidden sm:block">FreightSentinel</span>
        </div>

        <div className="flex bg-white rounded-full p-1 border border-slate-100 shadow-sm">
          {(["Home", "Analyze", "Logs", ...(isAdmin ? ["Admin" as const] : [])] as Tab[]).map((t) => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              whileTap={{ scale: 0.95 }}
              className={`relative px-5 py-2 rounded-full text-sm font-medium transition ${
                tab === t ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab === t && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-slate-100/60"
                  transition={spring}
                />
              )}
              <span className="relative z-10">{t}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <OpsIndicator stats={stats} />
          <button
            onClick={onLogout}
            title="Sign out"
            className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 hover:border-slate-300 transition bg-white shadow-sm flex items-center justify-center"
          >
            {user.picture ? (
              <img src={user.picture} className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-600 font-semibold text-sm">
                {user.name.charAt(0)}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ---------- CENTERED MAIN CONTENT ---------- */}
      <div className="w-full max-w-5xl flex-1 px-6 pb-20 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {tab === "Home" && (
            <motion.div key="home"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={softSpring}
              className="w-full flex flex-col items-center"
            >
              <Hero name={user.name} onRun={() => analyze(selected)} />
              <StatsGrid stats={stats} />
              <div className="w-full mt-12 mb-6 flex justify-center">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Active Shipments</h3>
              </div>
              <PositionsGrid positions={POSITIONS} selected={selected} onPick={analyze} />
            </motion.div>
          )}
          {tab === "Analyze" && (
            <motion.div key="analyze"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={softSpring}
              className="w-full flex flex-col items-center"
            >
              <AnalyzePage
                positions={POSITIONS}
                onPick={analyze}
                selected={selected}
                useStream={useStream}
                setUseStream={setUseStream}
              />
            </motion.div>
          )}
          {tab === "Logs" && (
            <motion.div key="logs"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={softSpring}
              className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8"
            >
              <LogsPanel />
            </motion.div>
          )}
          {tab === "Admin" && isAdmin && (
            <motion.div key="admin"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={softSpring}
              className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8"
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- CENTERED MODAL OVERLAY (Zen Mode) ---------- */}
      <AnimatePresence>
        {showDetail && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
              onClick={() => { setShowDetail(false); abortStreamRef.current?.(); }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={spring}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="sticky top-0 bg-white/90 backdrop-blur px-8 py-6 border-b border-slate-50 flex items-center justify-between z-10">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Risk Analysis Profile</div>
                  <div className="font-semibold text-slate-800 text-xl tracking-tight">{selected.vessel_name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {selected.origin_port} → {selected.dest_port} · {selected.cargo_type}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowDetail(false); abortStreamRef.current?.(); }}
                  className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </motion.button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
                {(loading || liveTrace.length > 0) && (
                  <motion.div layout className="bg-[#fcfcfd] rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        System Analysis
                      </div>
                      {loading && <LivePulse />}
                    </div>
                    <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                      <AnimatePresence initial={false}>
                        {liveTrace.map((s, i) => (
                          <motion.div
                            key={i}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 leading-relaxed"
                          >
                            <span className="w-20 shrink-0 font-medium text-slate-400">{s.type}</span>
                            <span className="text-slate-600">{s.content}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="space-y-6">
                    <div className="bg-white border border-slate-100 rounded-2xl p-8 flex flex-col sm:flex-row gap-8 items-center justify-center text-center sm:text-left">
                      <ScoreRing score={result.risk_score} />
                      <div className="flex flex-col items-center sm:items-start">
                        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Assessment</div>
                        <div className={`text-4xl font-semibold tracking-tight ${scoreToColor(result.risk_score)}`}>
                          {scoreBadge(result.risk_score)}
                        </div>
                        <div className="text-sm text-slate-500 mt-2">
                          <span className="font-medium text-slate-700">{Math.round(result.delay_probability * 100)}%</span> delay probability
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">~{result.expected_delay_days?.toFixed(1)}</span> days expected
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-8">
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 text-center">
                        Identified Factors
                      </div>
                      <div className="space-y-4">
                        {(result.shap_factors || result.risk_factors || []).map((f, i) => (
                          <div key={f.factor} className="w-full">
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-medium text-slate-700 capitalize">{f.factor}</span>
                              <span className="text-slate-400">+{f.contribution}</span>
                            </div>
                            <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, f.contribution * 3)}%` }}
                                transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                                className="h-full bg-slate-300 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── BUILDING BLOCKS ─────────────────────── */

function OpsIndicator({ stats }: { stats: StatsResult | null }) {
  const ok = stats?.redis === "ok" && stats?.celery === "ok";
  return (
    <div className="hidden md:flex items-center gap-2">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className={`w-2 h-2 rounded-full ${ok ? "bg-slate-800" : "bg-rose-400"}`}
      />
      <span className="text-xs font-medium text-slate-400">{ok ? "System Normal" : "Degraded"}</span>
    </div>
  );
}

function LivePulse() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold tracking-widest">
      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
      ANALYZING
    </div>
  );
}

function Hero({ name, onRun }: { name: string; onRun: () => void }) {
  return (
    <div className="flex flex-col items-center text-center mt-12 mb-16 max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
        className="text-4xl sm:text-5xl font-semibold text-slate-800 tracking-tight mb-4"
      >
        Welcome, {name.split(" ")[0]}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}
        className="text-slate-500 mb-8 text-lg"
      >
        Your logistics operations are stable. Select a shipment below to perform a deep AI risk analysis.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onRun}
        className="px-8 py-3.5 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition shadow-sm"
      >
        Analyze Network
      </motion.button>
    </div>
  );
}

function PositionsGrid({ positions, selected, onPick }: { positions: Position[]; selected: Position; onPick: (p: Position) => void }) {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {positions.map((p, i) => {
        const active = selected.code === p.code;
        return (
          <motion.button
            key={p.code}
            onClick={() => onPick(p)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ...softSpring }}
            className={`w-full p-6 rounded-3xl border transition flex flex-col items-center text-center ${
              active ? "bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)]" : "bg-transparent border-slate-100 hover:bg-white hover:border-slate-200"
            }`}
          >
            <div className={`w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xl mb-4`}>
              {p.emoji}
            </div>
            <div className="font-semibold text-slate-800 mb-0.5">{p.code}</div>
            <div className="text-xs text-slate-400 mb-3">{p.company}</div>
            <div className="w-full h-px bg-slate-50 mb-3" />
            <div className="text-[11px] text-slate-400 font-medium">
              {p.origin_port} → {p.dest_port}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function StatsGrid({ stats }: { stats: StatsResult | null }) {
  const items = [
    { label: "Total Analyses", value: stats?.analyses_total ?? 0 },
    { label: "Queue Depth",    value: stats?.queue_depth ?? 0 },
    { label: "Active Workers", value: stats?.workers?.length ?? 0 },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-8 mt-4">
      {items.map((it, i) => (
        <motion.div key={it.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="flex flex-col items-center">
          <div className="text-2xl font-semibold text-slate-800 mb-1"><CountUp value={it.value} /></div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{it.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

function AnalyzePage({ positions, selected, onPick, useStream, setUseStream }: {
  positions: Position[]; selected: Position; onPick: (p: Position) => void;
  useStream: boolean; setUseStream: (b: boolean) => void;
}) {
  return (
    <div className="w-full flex flex-col items-center text-center mt-12 max-w-4xl">
      <div className="mb-12">
        <h2 className="text-3xl font-semibold text-slate-800 tracking-tight mb-4">Event-Driven Architecture</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Every selection dispatches an asynchronous task via Celery. Workers process the analysis and stream the ReAct trace back to this centered interface.
        </p>
      </div>

      <div className="w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
        <div className="flex justify-center mb-8">
          <label className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-full px-5 py-2.5 cursor-pointer hover:bg-slate-100 transition">
            <span className="font-medium">Stream Agent Trace</span>
            <Toggle on={useStream} onChange={setUseStream} />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {positions.map((p) => (
            <motion.button
              key={p.code} onClick={() => onPick(p)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`p-6 rounded-2xl border transition flex flex-col items-center ${
                selected.code === p.code ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-transparent border-slate-100 hover:bg-slate-50 text-slate-600"
              }`}
            >
              <div className="text-2xl mb-3">{p.emoji}</div>
              <div className="font-semibold">{p.code}</div>
              <div className={`text-xs mt-1 ${selected.code === p.code ? "text-slate-400" : "text-slate-400"}`}>{p.origin_port}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`relative w-10 h-5 rounded-full transition ${on ? "bg-slate-800" : "bg-slate-200"}`}>
      <motion.div layout transition={spring} className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" style={{ left: on ? "calc(100% - 18px)" : 2 }} />
    </button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const R = 44, C = 2 * Math.PI * R;
  const dash = useMotionValue(0);
  useEffect(() => { const c = animate(dash, (score / 100) * C, { duration: 1.2, ease: "easeOut" }); return () => c.stop(); }, [score, C, dash]);
  const strokeDasharray = useTransform(dash, (v) => `${v} ${C}`);
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={116} height={116} viewBox="0 0 116 116">
        <circle cx="58" cy="58" r={R} fill="none" stroke="#f1f5f9" strokeWidth={6} />
        <motion.circle cx="58" cy="58" r={R} fill="none" stroke={scoreRingClr(score)} strokeWidth={6} strokeLinecap="round" style={{ strokeDasharray }} transform="rotate(-90 58 58)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-3xl font-semibold text-slate-800">
        <CountUp value={score} />
      </div>
    </div>
  );
}

function CountUp({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => { const ctrl = animate(mv, value, { duration, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) }); return () => ctrl.stop(); }, [value, mv, duration]);
  return <span>{display}</span>;
}
