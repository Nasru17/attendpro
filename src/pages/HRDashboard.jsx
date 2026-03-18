export default function HRDashboard({ employees, sites, attendance, ot, rosters, user, onNavigate, modules }) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = today.getDate();

  // Quick stats
  const todayAtt = attendance[todayKey] || {};
  let presentToday = 0, absentToday = 0;
  Object.values(todayAtt).forEach(siteMap => {
    Object.values(siteMap).forEach(r => {
      if (r.status === "P") presentToday++;
      else if (r.status === "A") absentToday++;
    });
  });

  const activeEmps   = employees.filter(e => (e.empStatus || "active") === "active").length;
  const onLeave      = employees.filter(e => e.empStatus === "leave").length;
  const flaggedEmps  = employees.filter(e => e.empStatus && e.empStatus !== "active").length;
  const rosterCount  = Object.keys(rosters[monthKey] || {}).length;

  let monthOT = 0;
  for (let d = 1; d <= dayOfMonth; d++) {
    const dk = `${monthKey}-${String(d).padStart(2, "0")}`;
    Object.values(ot?.[dk] || {}).forEach(sm =>
      Object.values(sm).forEach(r => { monthOT += (r.genOT || 0); })
    );
  }

  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // Per-module quick stat text
  const moduleStats = {
    recruitment:  null,
    ems:          `${employees.length} employees · ${sites.length} sites`,
    attendance_ot:`${presentToday} present today · ${rosterCount} in roster`,
    payroll:      `${activeEmps} active employees`,
    leave:        `${onLeave} currently on leave`,
    pettycash:    null,
    permits:      null,
  };

  const visibleModules = modules.filter(m => m.roles.includes(user.role));

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Welcome bar ── */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {greeting()}, {user.name} 👋
          </div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>
            {today.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <span className={`badge ${user.role === "manager" ? "role-manager" : "role-supervisor"}`}
          style={{ fontSize: 12, padding: "6px 14px" }}>
          {user.role === "manager" ? "👔 Manager" : "🧑‍💼 Supervisor"}
        </span>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Total Staff",    value: employees.length, color: "#3b82f6",  icon: "👷" },
          { label: "Active",         value: activeEmps,       color: "#10b981",  icon: "✅" },
          { label: "Present Today",  value: presentToday,     color: "#06b6d4",  icon: "📍" },
          { label: "Absent Today",   value: absentToday,      color: "#ef4444",  icon: "❌" },
          { label: "On Leave",       value: onLeave,          color: "#f59e0b",  icon: "🏖" },
          { label: "Flagged",        value: flaggedEmps,      color: "#8b5cf6",  icon: "⚠" },
          { label: "Work Sites",     value: sites.length,     color: "#ec4899",  icon: "🏗" },
          { label: "OT This Month",  value: `${monthOT.toFixed(1)}h`, color: "#a78bfa", icon: "⏱" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: 10, top: 8, fontSize: 20, opacity: 0.12 }}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "var(--mono)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Module cards grid ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>
        HR Modules
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
        {visibleModules.map(m => {
          const stat   = moduleStats[m.id];
          const isOpen = !m.comingSoon;

          return (
            <div key={m.id}
              className="module-card"
              onClick={() => isOpen && onNavigate(m.pages.find(p => p.roles.includes(user.role))?.id)}
              style={{
                background: "var(--surface)",
                border: `1px solid var(--border)`,
                borderLeft: `3px solid ${m.color}`,
                borderRadius: 12,
                padding: "14px 16px",
                cursor: isOpen ? "pointer" : "default",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
                opacity: m.comingSoon ? 0.72 : 1,
              }}
              onMouseEnter={e => {
                if (!isOpen) return;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.3)`;
                e.currentTarget.style.borderColor = m.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {/* Faint background icon */}
              <div style={{ position: "absolute", right: -6, bottom: -6, fontSize: 52, opacity: 0.05, lineHeight: 1 }}>{m.icon}</div>

              {/* Coming soon badge */}
              {m.comingSoon && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  fontSize: 8, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                  background: "rgba(100,116,139,0.18)", color: "var(--text3)",
                  padding: "2px 7px", borderRadius: 20, border: "1px solid var(--border)"
                }}>Soon</div>
              )}

              <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, color: m.comingSoon ? "var(--text2)" : "var(--text)" }}>
                {m.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, marginBottom: 10 }}>{m.desc}</div>

              {stat && (
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: m.comingSoon ? "var(--text3)" : m.color,
                  fontFamily: "var(--mono)", marginBottom: 10
                }}>{stat}</div>
              )}

              {isOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: m.color }}>
                  Open <span style={{ fontSize: 14 }}>→</span>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: "var(--text3)" }}>Under development</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
