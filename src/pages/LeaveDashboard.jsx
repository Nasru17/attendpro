import { useMemo } from "react";

export default function LeaveDashboard({ leaves, employees, leaveTimetable, onNavigate, user }) {
  const isManager = user?.role === "manager";
  const today = new Date();
  const thisMonth = today.getMonth() + 1;
  const thisYear  = today.getFullYear();

  const stats = useMemo(() => {
    const total    = leaves.length;
    const pending  = leaves.filter(l => l.status === "pending").length;
    const approved = leaves.filter(l => l.status === "approved").length;
    const rejected = leaves.filter(l => l.status === "rejected").length;
    const onLeave  = employees.filter(e => (e.empStatus || "active") === "leave").length;

    // "Returned this month" = returnedAt is within current month
    const monthStr = `${thisYear}-${String(thisMonth).padStart(2,"0")}`;
    const returned = leaves.filter(l => l.returnedAt && l.returnedAt.startsWith(monthStr)).length;

    return { total, pending, approved, rejected, onLeave, returned };
  }, [leaves, employees, thisMonth, thisYear]);

  const navCards = [
    { id: "leave-management", icon: "🏖",  label: "Leave",     desc: "View and add leave requests",       color: "#06b6d4", show: true },
    { id: "leave-timetable",  icon: "📅",  label: "Timetable", desc: "Monthly slot configuration",        color: "#8b5cf6", show: true },
    { id: "leave-requests",   icon: "📋",  label: "Requests",  desc: `${stats.pending} pending approvals`, color: "#f59e0b", show: isManager },
  ];

  return (
    <div>
      {/* Gradient banner */}
      <div style={{
        background: "linear-gradient(135deg, #06b6d4, #0891b2)",
        borderRadius: 16,
        padding: "28px 32px",
        marginBottom: 24,
        color: "#fff",
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>🏖 Leave Management</div>
        <div style={{ fontSize: 14, opacity: 0.85 }}>Manage employee leave requests, timetable, and approvals</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Requests",       value: stats.total,    color: "#06b6d4" },
          { label: "Pending Review",        value: stats.pending,  color: "#f59e0b" },
          { label: "Approved",              value: stats.approved, color: "#10b981" },
          { label: "Rejected",              value: stats.rejected, color: "#ef4444" },
          { label: "Currently on Leave",    value: stats.onLeave,  color: "#8b5cf6" },
          { label: "Returned This Month",   value: stats.returned, color: "#94a3b8" },
        ].map(s => (
          <div key={s.label} style={{
            background: `${s.color}18`,
            border: `1px solid ${s.color}33`,
            borderRadius: 12,
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, fontFamily: "var(--mono)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
        {navCards.filter(c => c.show).map(c => (
          <div key={c.id}
            onClick={() => onNavigate(c.id)}
            style={{
              background: "var(--surface)",
              border: `1px solid var(--border)`,
              borderRadius: 14,
              padding: "22px 24px",
              cursor: "pointer",
              transition: "border-color 0.15s, transform 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
