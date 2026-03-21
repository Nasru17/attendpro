import { useState } from "react";

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ flex: "1 1 140px", minWidth: 130 }}>
      <div className="card-body" style={{ padding: "18px 20px" }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: color || "var(--text)", marginBottom: 2 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Nav card ──────────────────────────────────────────────────
function NavCard({ icon, title, desc, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="card"
      style={{
        cursor: "pointer",
        borderLeft: `4px solid ${color}`,
        transition: "transform 0.13s, box-shadow 0.13s",
        transform: hov ? "translateY(-2px)" : "",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.32)" : "",
      }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="card-body" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{desc}</div>
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: color }}>Open →</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// RECRUITMENT DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function RecruitmentDashboard({ quotas, requirements, applicants, onNavigate }) {
  const totalQuotas     = quotas.length;
  const availableQuotas = quotas.filter(q => q.status === "available").length;
  const openReqs        = requirements.length;
  const totalApplicants = applicants.length;
  const pendingReview   = applicants.filter(a => a.status === "pending").length;
  const accepted        = applicants.filter(a => a.status === "accepted").length;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Banner */}
      <div style={{
        background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        borderRadius: 16,
        padding: "32px 36px",
        marginBottom: 28,
        color: "#fff",
      }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>👔 Recruitment</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Workforce Recruitment Management</div>
        <div style={{ fontSize: 13, opacity: 0.85, maxWidth: 540, lineHeight: 1.6 }}>
          Manage work quotas, define job requirements, track applicants, and generate appointment letters — all in one place.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard icon="🎯" label="Total Quotas"     value={totalQuotas}     color="#3b82f6" />
        <StatCard icon="✅" label="Available Quotas" value={availableQuotas} color="#10b981" />
        <StatCard icon="📋" label="Open Requirements" value={openReqs}        color="#8b5cf6" />
        <StatCard icon="👤" label="Total Applicants" value={totalApplicants} color="#f59e0b" />
        <StatCard icon="⏳" label="Pending Review"   value={pendingReview}   color="#ef4444" />
        <StatCard icon="🎉" label="Accepted"          value={accepted}        color="#10b981" />
      </div>

      {/* Navigation cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        <NavCard
          icon="🎯"
          title="Quota Management"
          desc="Track and manage work quotas. Assign quotas to employees or candidates."
          color="#3b82f6"
          onClick={() => onNavigate("quota")}
        />
        <NavCard
          icon="📋"
          title="Job Requirements"
          desc="Define job positions, salary structures, and working conditions for recruitment."
          color="#8b5cf6"
          onClick={() => onNavigate("requirements")}
        />
        <NavCard
          icon="👤"
          title="Applicants"
          desc="Manage candidate applications, review profiles, assign quotas, and generate appointment letters."
          color="#10b981"
          onClick={() => onNavigate("recruitment")}
        />
      </div>
    </div>
  );
}
