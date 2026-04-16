import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };
const softSpring = { type: "spring" as const, stiffness: 260, damping: 30 };

type LogRow = { trace_id: string; level: string; message: string; ts: string; service?: string };

export default function LogsPanel() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "backend" | "worker">("all");

  useEffect(() => {
    let live = true;
    const tick = () =>
      api.logs()
        .then((r) => { if (live) { setRows(r.logs); setErr(null); } })
        .catch((e) => { if (live) setErr(e.message || "Failed to load logs"); });
    tick();
    const id = setInterval(tick, 2500);
    return () => { live = false; clearInterval(id); };
  }, []);

  const visible = rows.filter((r) => filter === "all" || r.service === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Observability</div>
          <h2 className="text-3xl font-extrabold text-slate-900">Logs</h2>
          <div className="text-sm text-slate-500 mt-1">
            Structured JSON logs emitted by every service, tagged with a <code>trace_id</code>.
            Also scraped by Loki + Prometheus — open Grafana at <code>:3001</code> for dashboards.
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-white rounded-full border border-slate-200">
          {(["all", "backend", "worker"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f ? "text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {filter === f && (
                <motion.div layoutId="log-filter" transition={spring}
                  className="absolute inset-0 bg-slate-900 rounded-full" />
              )}
              <span className="relative z-10 uppercase">{f}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-950 rounded-[32px] p-5 shadow-xl text-slate-100 min-h-[480px]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <span className="ml-3 font-mono text-xs text-white/60">freightsentinel › stdout</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            />
            streaming
          </div>
        </div>

        {err && (
          <div className="mt-3 text-rose-300 text-xs font-mono">{err}</div>
        )}

        <div className="font-mono text-[11px] mt-3 space-y-1 max-h-[560px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {visible.map((r, i) => (
              <motion.div
                key={`${r.ts}-${i}`}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={softSpring}
                className="flex gap-3 py-0.5"
              >
                <span className="text-white/30 shrink-0">{fmt(r.ts)}</span>
                <span className={`shrink-0 font-bold w-12 ${levelColor(r.level)}`}>
                  [{r.level.toUpperCase()}]
                </span>
                {r.service && (
                  <span className={`shrink-0 w-20 ${r.service === "worker" ? "text-violet-300" : "text-cyan-300"}`}>
                    {r.service}
                  </span>
                )}
                <span className="shrink-0 text-amber-300/80 w-24 truncate">{r.trace_id?.slice(0, 8)}</span>
                <span className="text-white/80">{r.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function fmt(ts: string) {
  try { return new Date(ts).toISOString().split("T")[1].replace("Z", ""); } catch { return ts; }
}
function levelColor(l: string) {
  return l === "error" ? "text-rose-400" : l === "warn" ? "text-amber-300" : "text-emerald-300";
}
