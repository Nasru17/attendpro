export default function AttendanceDashboard({ onNavigate, user, attendance, ot, employees, rosters }) {
  const isManager = user?.role === "manager";

  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance[today] || {};
  const presentToday = Object.values(todayAtt).filter(v => v === "P").length;
  const absentToday  = Object.values(todayAtt).filter(v => v === "A").length;
  const leaveToday   = Object.values(todayAtt).filter(v => v === "L").length;
  const totalEmp     = employees.length;

  const thisMonth = today.slice(0, 7);
  const otThisMonth = Object.entries(ot)
    .filter(([d]) => d.startsWith(thisMonth))
    .reduce((sum, [, dayOt]) => sum + Object.values(dayOt).reduce((s, h) => s + (parseFloat(h) || 0), 0), 0);

  const cards = [
    {
      id: "attendance",
      icon: "✅",
      label: "Attendance",
      desc: "Mark and view daily attendance records",
      color: "#10b981",
      stat: `${presentToday} present today`,
      roles: ["manager", "supervisor"],
    },
    {
      id: "otentry",
      icon: "⏱",
      label: "OT Entry",
      desc: "Record and manage overtime hours",
      color: "#f59e0b",
      stat: `${otThisMonth.toFixed(1)} hrs this month`,
      roles: ["manager", "supervisor"],
    },
    {
      id: "roster",
      icon: "📋",
      label: "Duty Roster",
      desc: "Plan and manage employee duty schedules",
      color: "#3b82f6",
      stat: `${totalEmp} employees`,
      roles: ["manager", "supervisor"],
    },
    {
      id: "timesheet",
      icon: "📊",
      label: "Timesheet",
      desc: "View detailed attendance & hours reports",
      color: "#8b5cf6",
      stat: "Monthly summary",
      roles: ["manager"],
    },
  ];

  const visibleCards = cards.filter(c => c.roles.includes(user?.role));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        borderRadius: 14,
        padding: "28px 32px",
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            📅 Attendance & OT
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            Manage daily attendance, overtime, rosters, and timesheets
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Present Today", value: presentToday, color: "#d1fae5" },
            { label: "Absent Today",  value: absentToday,  color: "#fee2e2" },
            { label: "On Leave",      value: leaveToday,   color: "#fef3c7" },
          ].map(s => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.18)",
              borderRadius: 10,
              padding: "10px 18px",
              textAlign: "center",
              minWidth: 80,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-page cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
        marginBottom: 28,
      }}>
        {visibleCards.map(c => (
          <div
            key={c.id}
            onClick={() => onNavigate(c.id)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: `4px solid ${c.color}`,
              borderRadius: 12,
              padding: "20px 18px",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.18)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            {/* Background icon */}
            <div style={{
              position: "absolute", right: 12, top: 10,
              fontSize: 48, opacity: 0.07, pointerEvents: "none", userSelect: "none",
            }}>{c.icon}</div>

            <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12, lineHeight: 1.5 }}>{c.desc}</div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: c.color,
              background: `${c.color}18`,
              borderRadius: 6, padding: "3px 8px", display: "inline-block",
            }}>{c.stat}</div>
          </div>
        ))}
      </div>

      {/* Quick info */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 13,
        color: "var(--text2)",
      }}>
        <span style={{ fontSize: 18 }}>💡</span>
        <span>
          Select a section above to get started. Today is <strong style={{ color: "var(--text)" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>.
          {totalEmp === 0 && " Add employees in the EMS module first to start tracking attendance."}
        </span>
      </div>
    </div>
  );
}
