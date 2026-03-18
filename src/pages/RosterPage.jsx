import { useState } from "react";
import { getDaysInMonth, getDayName, isFriday, genId } from "../utils/helpers";
import { EMP_STATUS_META, isEmpActiveOnDate } from "../constants/employees";

export default function RosterPage({ employees, rosters, setRosters, toast, user }) {
  const isManager = user?.role === "manager";
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showPicker, setShowPicker] = useState(false);

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);

  const firstOfMonth = new Date(year, month, 1);
  const canEdit = isManager && today >= new Date(firstOfMonth.getTime() - 3 * 86400000);

  const rKey = monthKey;
  const roster = rosters[rKey] || {};
  const assignedIds = Object.keys(roster);
  const rosterEmps = employees.filter(e => assignedIds.includes(e.id));

  const TYPES = ["W", "O", "H", "L"];
  const TYPE_LABELS = { W: "Work", O: "Off", H: "Holiday", L: "Leave" };

  // Returns true if a day should be locked due to employee status
  const isDayLocked = (emp, day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return !isEmpActiveOnDate(emp, dateStr);
  };

  // What label to show on a locked cell
  const lockedLabel = (emp) => {
    const st = emp.empStatus || "active";
    if (st === "leave")    return { text: "LV", color: "#f59e0b", bg: "rgba(245,158,11,0.18)", title: "On Leave" };
    if (st === "fled")     return { text: "FL", color: "#ef4444", bg: "rgba(239,68,68,0.18)",  title: "Fled" };
    if (st === "resigned") return { text: "RS", color: "#94a3b8", bg: "rgba(148,163,184,0.18)",title: "Resigned" };
    return null;
  };

  const cycleType = (emp, day) => {
    if (!canEdit) return;
    if (isDayLocked(emp, day)) return; // locked — do nothing
    const cur = roster[emp.id]?.[day] || "W";
    const next = TYPES[(TYPES.indexOf(cur) + 1) % TYPES.length];
    setRosters(p => ({ ...p, [rKey]: { ...p[rKey], [emp.id]: { ...(p[rKey]?.[emp.id] || {}), [day]: next } } }));
  };

  const toggleEmp = (empId) => {
    if (assignedIds.includes(empId)) {
      const updated = { ...roster };
      delete updated[empId];
      setRosters(p => ({ ...p, [rKey]: updated }));
    } else {
      const sched = {};
      for (let d = 1; d <= days; d++) sched[d] = isFriday(year, month, d) ? "H" : "W";
      setRosters(p => ({ ...p, [rKey]: { ...p[rKey], [empId]: sched } }));
    }
  };

  const initAllDays = () => {
    const base = {};
    rosterEmps.forEach(e => {
      base[e.id] = {};
      for (let d = 1; d <= days; d++) base[e.id][d] = roster[e.id]?.[d] || (isFriday(year, month, d) ? "H" : "W");
    });
    setRosters(p => ({ ...p, [rKey]: base }));
    toast("Roster initialized — Fridays set as Holiday", "success");
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-body">
          <div className="gap-3">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {canEdit && (
              <>
                <div className="form-group" style={{ justifyContent: "flex-end" }}>
                  <label className="form-label">&nbsp;</label>
                  <button className="btn btn-ghost" onClick={() => setShowPicker(true)}>
                    👷 Assign Staff ({assignedIds.length})
                  </button>
                </div>
                {rosterEmps.length > 0 && (
                  <div className="form-group" style={{ justifyContent: "flex-end" }}>
                    <label className="form-label">&nbsp;</label>
                    <button className="btn btn-primary" onClick={initAllDays}>↺ Re-init Days</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {!isManager && (
        <div className="alert alert-info" style={{ marginBottom: 12 }}>👁 View Only — only managers can edit the roster.</div>
      )}
      {!canEdit && isManager && (
        <div className="alert alert-warning">⚠ Roster editing opens 3 days before the month starts ({new Date(firstOfMonth.getTime() - 3*86400000).toDateString()})</div>
      )}

      {canEdit && rosterEmps.length === 0 && (
        <div className="alert alert-info">ℹ Click "Assign Staff" to add employees to the {months[month]} {year} roster.</div>
      )}

      {rosterEmps.length > 0 && (
        <>
          <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {TYPES.map(t => (
              <span key={t} className={`badge ${t==="W"?"badge-blue":t==="O"?"badge-green":t==="H"?"badge-yellow":"badge-purple"}`}>
                {t} = {TYPE_LABELS[t]}
              </span>
            ))}
            <span className="badge" style={{ background: "rgba(245,158,11,0.18)", color: "#f59e0b", border: "1px solid #f59e0b44" }}>LV = On Leave</span>
            <span className="badge" style={{ background: "rgba(239,68,68,0.18)", color: "#ef4444", border: "1px solid #ef444444" }}>FL = Fled</span>
            <span className="badge" style={{ background: "rgba(148,163,184,0.18)", color: "#94a3b8", border: "1px solid #94a3b844" }}>RS = Resigned</span>
            {canEdit && <span className="text-sm" style={{ marginLeft: 4 }}>Tap cells to cycle · Locked cells cannot be changed</span>}
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Duty Roster — {months[month]} {year}</div>
              {canEdit && <button className="btn btn-success btn-sm" onClick={() => toast("Roster saved!", "success")}>✓ Save</button>}
            </div>
            <div className="roster-grid">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", minWidth: 130, position: "sticky", left: 0, background: "var(--surface2)", zIndex: 2 }}>Employee</th>
                    {Array.from({ length: days }, (_, i) => {
                      const d = i + 1;
                      return <th key={d} style={{ color: isFriday(year,month,d) ? "var(--warning)" : undefined }}>{getDayName(year,month,d)}<br/>{d}</th>;
                    })}
                    <th style={{ color: "#3b82f6" }}>W</th>
                    <th style={{ color: "#f59e0b" }}>H</th>
                    <th style={{ color: "#8b5cf6" }}>L</th>
                    <th style={{ color: "#10b981" }}>O</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterEmps.map(e => {
                    const row = roster[e.id] || {};
                    const locked = lockedLabel(e);
                    const counts = { W: 0, H: 0, L: 0, O: 0 };
                    for (let d = 1; d <= days; d++) {
                      if (!isDayLocked(e, d)) {
                        const t = row[d] || "W";
                        counts[t] = (counts[t]||0)+1;
                      }
                    }
                    const empStatus = e.empStatus || "active";
                    const statusMeta = EMP_STATUS_META[empStatus];
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600, fontSize: 12, position: "sticky", left: 0, background: "var(--surface)", zIndex: 1 }}>
                          <div>{e.name}</div>
                          {e.designation && <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>{e.designation}</div>}
                          {empStatus !== "active" && (
                            <div style={{ marginTop: 3 }}>
                              <span className={`badge ${statusMeta.badge}`} style={{ fontSize: 9 }}>{statusMeta.icon} {statusMeta.label}</span>
                              {e.statusDate && <div style={{ fontSize: 9, color: "var(--text3)" }}>from {e.statusDate}</div>}
                            </div>
                          )}
                        </td>
                        {Array.from({ length: days }, (_, i) => {
                          const d = i + 1;
                          const isLocked = isDayLocked(e, d);
                          const t = row[d] || "W";
                          if (isLocked && locked) {
                            return (
                              <td key={d} style={{ padding: 3 }} title={`${locked.title} — cannot edit`}>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: 26, height: 26, borderRadius: 4, fontSize: 9, fontWeight: 800,
                                  background: locked.bg, color: locked.color,
                                  border: `1px solid ${locked.color}44`, cursor: "not-allowed",
                                  userSelect: "none"
                                }}>{locked.text}</span>
                              </td>
                            );
                          }
                          return (
                            <td key={d} style={{ padding: 3 }}>
                              <span className={`roster-cell roster-${t}`} onClick={() => cycleType(e, d)} style={{ cursor: canEdit ? "pointer" : "default" }}>{t}</span>
                            </td>
                          );
                        })}
                        <td style={{ fontWeight: 700, color: "#3b82f6" }}>{counts.W}</td>
                        <td style={{ fontWeight: 700, color: "#f59e0b" }}>{counts.H}</td>
                        <td style={{ fontWeight: 700, color: "#8b5cf6" }}>{counts.L}</td>
                        <td style={{ fontWeight: 700, color: "#10b981" }}>{counts.O}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Staff Picker Modal */}
      {showPicker && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">Assign Staff — {months[month]} {year}</div>
              <button className="modal-close" onClick={() => setShowPicker(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                ℹ Select all employees working this month. This roster is shared across all sites.
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => employees.forEach(e => !assignedIds.includes(e.id) && toggleEmp(e.id))}>Select All</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { const copy = { ...roster }; employees.forEach(e => delete copy[e.id]); setRosters(p => ({ ...p, [rKey]: copy })); }}>Clear All</button>
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                {employees.length === 0 ? (
                  <div className="empty-state"><p>No employees added yet</p></div>
                ) : employees.map(e => {
                  const isAssigned = assignedIds.includes(e.id);
                  const st = e.empStatus || "active";
                  const stMeta = EMP_STATUS_META[st];
                  return (
                    <label key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: isAssigned ? "rgba(59,130,246,0.06)" : "transparent" }}>
                      <input type="checkbox" checked={isAssigned} onChange={() => toggleEmp(e.id)} style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                        <div className="text-sm">{e.empId}{e.designation ? ` · ${e.designation}` : ""}</div>
                      </div>
                      <span className={`badge ${stMeta.badge}`} style={{ fontSize: 9 }}>{stMeta.icon} {stMeta.label}</span>
                      {isAssigned && <span className="badge badge-blue">✓</span>}
                    </label>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>
                {assignedIds.length} of {employees.length} employees assigned
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowPicker(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
