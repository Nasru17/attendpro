import { useState } from "react";
import { sbSignIn, getRoleInfo } from "../utils/supabase";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const data = await sbSignIn(trimmedEmail, password);
      // Get role from user metadata
      const sbUser = data.user || {};
      const roleInfo = getRoleInfo(sbUser);
      onLogin({ email: trimmedEmail, token: data.access_token, ...roleInfo });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Attend<span>Pro</span></div>
        <div className="login-sub">Alitho Construction · HR System</div>
        <div className="login-title">Sign In</div>
        <div className="login-desc">Enter your credentials to continue</div>
        {error && <div className="login-error">⚠ {error}</div>}
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Password</label>
          <div style={{ position: "relative" }}>
            <input className="form-input" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ paddingRight: 40 }} />
            <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 14 }}>{showPass ? "🙈" : "👁"}</button>
          </div>
        </div>
        <button className="btn btn-primary login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </div>
    </div>
  );
}
