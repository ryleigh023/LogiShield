import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import type { AuthUser } from "../api/client";

declare global { interface Window { google?: any } }

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const spring = { type: "spring" as const, stiffness: 300, damping: 28 };

type Stage = "creds" | "otp";

export default function Login({ onLogin }: { onLogin: (u: AuthUser, access: string, refresh?: string) => void }) {
  const gBtnRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("creds");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || stage !== "creds") return;
    const tryInit = () => {
      if (!window.google?.accounts?.id || !gBtnRef.current) return false;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          try {
            setBusy(true);
            const out = await api.googleLogin(resp.credential);
            onLogin(out.user, out.access_token, out.refresh_token);
          } catch (e: any) {
            setErr(e.message || "Google sign-in failed");
          } finally { setBusy(false); }
        },
      });
      window.google.accounts.id.renderButton(gBtnRef.current, {
        theme: "outline", size: "large", shape: "pill", width: 340, text: "signin_with", logo_alignment: "center"
      });
      return true;
    };
    if (tryInit()) return;
    const id = setInterval(() => { if (tryInit()) clearInterval(id); }, 250);
    return () => clearInterval(id);
  }, [onLogin, stage]);

  const submitCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true); setDevOtp(null);
    try {
      const out = await api.login(email, password);
      setStage("otp");
      if (out.dev_otp) setDevOtp(out.dev_otp);
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    } catch (e: any) {
      setErr(e.message || "Invalid credentials");
    } finally { setBusy(false); }
  };

  const submitOtp = async (code?: string) => {
    const c = code ?? otp.join("");
    if (c.length !== 6) return;
    setErr(null); setBusy(true);
    try {
      const out = await api.verifyOtp(email, c);
      onLogin(out.user, out.access_token, out.refresh_token);
    } catch (e: any) {
      setErr(e.message || "Invalid code");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally { setBusy(false); }
  };

  const demoLogin = async () => {
    try {
      setBusy(true); setErr(null);
      const out = await api.demoLogin();
      onLogin(out.user, out.access_token, out.refresh_token);
    } catch (e: any) {
      setErr(e.message || "Demo sign-in failed");
    } finally { setBusy(false); }
  };

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = c; setOtp(next);
    if (c && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every(x => x) && next.join("").length === 6) submitOtp(next.join(""));
  };
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (txt.length === 6) {
      e.preventDefault();
      const next = txt.split("");
      setOtp(next);
      submitOtp(txt);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-4 font-sans selection:bg-slate-200">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 p-10 md:p-12 flex flex-col items-center"
      >
        
        {/* Minimal Centered Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight mb-1 text-center">Welcome back</h1>
          <p className="text-sm text-slate-400 text-center">Please enter your details to sign in.</p>
        </div>

        <div className="w-full relative">
          <AnimatePresence mode="wait">
            
            {stage === "creds" && (
              <motion.div
                key="creds"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={spring}
                className="w-full flex flex-col items-center"
              >
                <form onSubmit={submitCreds} className="w-full space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-slate-400 transition placeholder-slate-400 text-center"
                      autoFocus
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-slate-400 transition placeholder-slate-400 text-center"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      disabled={busy || !email || !password}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-12 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      {busy ? <Spinner /> : "Sign In"}
                    </motion.button>
                  </div>
                </form>

                <div className="w-full flex items-center justify-center my-6">
                  <div className="h-px bg-slate-100 flex-1"></div>
                  <span className="px-3 text-xs font-medium text-slate-400 tracking-wide">OR</span>
                  <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <div className="w-full flex flex-col items-center space-y-3">
                  {GOOGLE_CLIENT_ID ? (
                    <div ref={gBtnRef} className="w-full flex justify-center" />
                  ) : (
                    <div className="text-center text-xs text-amber-600 bg-amber-50 rounded-xl p-3 w-full border border-amber-100">
                      Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={demoLogin}
                    disabled={busy}
                    className="w-full h-12 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                  >
                    Continue as Demo User
                  </motion.button>
                </div>
              </motion.div>
            )}

            {stage === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={spring}
                className="w-full flex flex-col items-center"
              >
                <div className="w-full mb-6 text-center">
                  <div className="text-sm text-slate-500">
                    We sent a code to <span className="font-medium text-slate-800">{email}</span>
                  </div>
                </div>

                {devOtp && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 w-full text-center text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3"
                  >
                    Demo OTP: <span className="font-mono font-bold tracking-widest text-slate-800">{devOtp}</span>
                  </motion.div>
                )}

                <div className="flex justify-center gap-2 mb-8 w-full">
                  {otp.map((d, i) => (
                    <motion.input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => onKey(i, e)}
                      onPaste={onPaste}
                      inputMode="numeric"
                      maxLength={1}
                      className="w-12 h-14 text-center text-xl font-medium text-slate-800 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 transition"
                    />
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => submitOtp()}
                  disabled={busy || otp.some(x => !x)}
                  className="w-full h-12 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition mb-4"
                >
                  {busy ? <Spinner /> : "Verify Code"}
                </motion.button>

                <button
                  onClick={() => { setStage("creds"); setErr(null); setOtp(["","","","","",""]); }}
                  className="text-sm text-slate-400 hover:text-slate-600 transition"
                >
                  Return to login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {err && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 w-full text-center text-sm font-medium text-rose-500 bg-rose-50/50 rounded-xl py-2"
            >
              {err}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-4 h-4 border-2 rounded-full border-slate-500 border-t-white"
      />
    </div>
  );
}
