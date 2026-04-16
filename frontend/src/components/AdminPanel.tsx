import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

export default function AdminPanel() {
  const [users, setUsers] = useState<{ email: string; role: string; is_active: boolean }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.adminUsers()
      .then((r) => setUsers(r.users))
      .catch((e) => setErr(e.message || "Forbidden"));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">RBAC</div>
        <h2 className="text-3xl font-extrabold text-slate-900">Admin</h2>
        <div className="text-sm text-slate-500 mt-1">
          Only users with the <code className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">admin</code> role
          can load this page. The backend enforces it via <code>require_role("admin")</code>.
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Users</div>
          <div className="text-[11px] text-slate-500">{users.length} total</div>
        </div>

        {err && (
          <div className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-xl p-3">
            {err}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {users.map((u, i) => (
            <motion.div
              key={u.email}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, ...spring }}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
                  {u.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {maskEmail(u.email)}
                  </div>
                  <div className="text-[10px] text-slate-400">PII masked in UI · encrypted at rest</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
                }`}>{u.role.toUpperCase()}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}>{u.is_active ? "ACTIVE" : "DISABLED"}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function maskEmail(e: string) {
  const [local, domain] = e.split("@");
  if (!domain) return e;
  const shown = local.length <= 2 ? local[0] + "*" : local.slice(0, 2) + "***";
  return `${shown}@${domain}`;
}
