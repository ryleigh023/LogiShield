const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ShipmentRequest {
  vessel_name: string;
  origin_port?: string;
  dest_port: string;
  eta: string;
  cargo_type: string;
}

export interface ShapFactor {
  factor: string;
  contribution: number;
  severity?: string;
  details?: string;
}

export interface Recommendation {
  action: string;
  priority?: number;
  title?: string;
  detail?: string;
  cost_delta?: string;
  time_saved?: string;
}

export interface AnalysisResult {
  shipment_id: string;
  task_id?: string | null;
  risk_score: number;
  delay_probability: number;
  expected_delay_days: number;
  confidence_interval?: [number, number];
  shap_factors?: ShapFactor[];
  risk_factors?: ShapFactor[];
  recommendations?: Recommendation[];
  agent_trace?: { type: string; content: string; timestamp: string }[];
  signals?: Record<string, any>;
  fallback?: boolean;
}

export interface StatsResult {
  analyses_total: number;
  queue_depth: number;
  redis: string;
  celery: string;
  workers?: string[];
}

export interface AuthUser {
  email: string;
  name: string;
  picture?: string | null;
  role?: "admin" | "user";
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem("fs_access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text();
    try {
      const j = JSON.parse(txt);
      throw new Error(j.detail || j.message || txt);
    } catch {
      throw new Error(txt || `HTTP ${res.status}`);
    }
  }
  return res.json();
}

export const api = {
  analyze: async (payload: ShipmentRequest): Promise<AnalysisResult> => {
    const res = await fetch(`${BASE}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return json(res);
  },

  stats: async (): Promise<StatsResult> => json(await fetch(`${BASE}/api/v1/stats`)),

  logs: async (): Promise<{ logs: { trace_id: string; level: string; message: string; ts: string }[] }> =>
    json(await fetch(`${BASE}/api/v1/logs`, { headers: authHeaders() })),

  adminUsers: async (): Promise<{ users: { email: string; role: string; is_active: boolean }[] }> =>
    json(await fetch(`${BASE}/api/v1/admin/users`, { headers: authHeaders() })),

  googleLogin: async (id_token: string): Promise<AuthResponse> =>
    json(await fetch(`${BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token }),
    })),

  demoLogin: async (): Promise<AuthResponse> =>
    json(await fetch(`${BASE}/auth/demo`, { method: "POST" })),

  // Email+password → triggers OTP email
  login: async (email: string, password: string): Promise<{ msg: string; dev_otp?: string }> =>
    json(await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })),

  verifyOtp: async (email: string, otp: string): Promise<AuthResponse> =>
    json(await fetch(`${BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    })),

  refresh: async (refresh_token: string): Promise<{ access_token: string }> =>
    json(await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    })),

  streamAnalyze: (
    payload: ShipmentRequest,
    onStep: (step: { type: string; content: string; timestamp: string }) => void,
    onFinal: (final: AnalysisResult) => void,
    onError: (e: string) => void
  ) => {
    // EventSource can't POST, so we fall back to fetch + stream parsing.
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/analyze/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) { onError(`HTTP ${res.status}`); return; }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const events = buf.split("\n\n");
          buf = events.pop() || "";
          for (const ev of events) {
            const lines = ev.split("\n");
            let name = "message", data = "";
            for (const l of lines) {
              if (l.startsWith("event:")) name = l.slice(6).trim();
              else if (l.startsWith("data:")) data += l.slice(5).trim();
            }
            if (!data) continue;
            try {
              const payload = JSON.parse(data);
              if (name === "trace") onStep(payload);
              else if (name === "final") onFinal(payload);
              else if (name === "error") onError(payload.error || "error");
            } catch {
              /* ignore malformed */
            }
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") onError(e.message || "stream error");
      }
    })();
    return () => ctrl.abort();
  },
};
