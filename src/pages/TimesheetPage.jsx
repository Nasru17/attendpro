import { useState, useMemo } from "react";
import { getDaysInMonth, getDayName, isFriday } from "../utils/helpers";
import { isEmpActiveOnDate } from "../constants/employees";
import { downloadAttendanceExcel } from "../utils/excel";

const ACTIVE_STATUSES = new Set(["active", "retention"]);

export default function TimesheetPage({ employees, sites, attendance, setAttendance, rosters, toast }) {
  const activeSites = sites.filter(s => ACTIVE_STATUSES.has(s.status || "active"));
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [siteId, setSiteId] = useState(""); // "" = all sites
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState({});
  const [empFilter, setEmpFilter] = useState("");

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);
  const roster = rosters[monthKey] || {};
  const assignedIds = Object.keys(roster);

  // Get attendance for an employee on a day — respects site filter
  const getAtt = (empId, d) => {
    const dk = `${monthKey}-${String(d).padStart(2,"0")}`;
    const dayData = attendance[dk] || {};
    if (siteId) return dayData[siteId]?.[empId];
    for (const sid of Object.keys(dayData)) {
      if (dayData[sid]?.[empId]) return dayData[sid][empId];
    }
    return undefined;
  };

  // All employees in this month's roster — no site filter required
  const siteEmps = useMemo(() => {
    const base = employees.filter(e => {
      const inRoster = assignedIds.includes(e.id);
      // If site selected: only employees who have at least one attendance record at that site this month
      if (siteId) {
        for (let d = 1; d <= days; d++) {
          const dk = `${monthKey}-${String(d).padStart(2,"0")}`;
          if (attendance[dk]?.[siteId]?.[e.id]) return true;
        }
        return false;
      }
      return inRoster;
    });
    if (!empFilter) return base;
    return base.filter(e => e.name.toLowerCase().includes(empFilter.toLowerCase()) || e.empId.toLowerCase().includes(empFilter.toLowerCase()));
  }, [employees, assignedIds, siteId, attendance, days, monthKey, empFilter]);

  const monthEnded = new Date(year, month + 1, 0) < today;
  const statusColors = { P:"badge-green", A:"badge-red", H:"badge-yellow", S:"badge-purple", L:"badge-gray" };

  // Summary totals across shown employees
  const totals = useMemo(() => {
    const t = { P:0, A:0, H:0, S:0, L:0 };
    siteEmps.forEach(e => {
      for (let d = 1; d <= days; d++) {
        const a = getAtt(e.id, d);
        if (a?.status && t[a.status] !== undefined) t[a.status]++;
      }
    });
    return t;
  }, [siteEmps, days, siteId, monthKey]);

  const startEdit = (empId, day) => {
    const dk = `${monthKey}-${String(day).padStart(2,"0")}`;
    const dayData = attendance[dk] || {};
    let foundSite = siteId;
    if (!foundSite) foundSite = Object.keys(dayData).find(sid => dayData[sid]?.[empId]);
    const cur = (foundSite ? dayData[foundSite]?.[empId] : null) || { status: "P", genOT: 0, concreteOT: 0, cementOT: 0, minutesLate: 0 };
    setEditing({ empId, day, dk, siteKey: foundSite });
    setEditVal({ ...cur });
  };

  const saveEdit = () => {
    const { dk, empId, siteKey } = editing;
    if (!siteKey) { toast("Cannot determine site for this record", "error"); return; }
    setAttendance(p => ({
      ...p,
      [dk]: { ...(p[dk] || {}), [siteKey]: { ...(p[dk]?.[siteKey] || {}), [empId]: editVal } }
    }));
    setEditing(null);
    toast("Updated", "success");
  };

  return (
    <div>
      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="gap-3" style={{ flexWrap: "wrap" }}>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
                {months.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Filter by Site</label>
              <select className="form-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">All Sites</option>
                {activeSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Search Employee</label>
              <input className="form-input" placeholder="Name or ID…" value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={{ minWidth: 160 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {siteEmps.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {[["👷 Employees", siteEmps.length, "#3b82f6"],["✅ Present", totals.P, "#10b981"],["❌ Absent", totals.A, "#ef4444"],["½ Half", totals.H, "#f59e0b"],["🤒 Sick", totals.S, "#8b5cf6"],["🏖 Leave", totals.L, "#94a3b8"]].map(([l,v,c]) => (
            <div key={l} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 16px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, fontWeight:800, color:c, fontFamily:"var(--mono)" }}>{v}</span>
              <span style={{ fontSize:11, color:"var(--text3)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timesheet table — always shown if there are employees in roster */}
      {siteEmps.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state"><div className="icon">📊</div><p>No employees found in roster for {months[month]} {year}{siteId ? ` at this site` : ""}.</p></div></div></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Timesheet — {months[month]} {year}{siteId ? ` · ${sites.find(s=>s.id===siteId)?.name||""}` : " · All Sites"}</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{siteEmps.length} employees · click any cell to edit</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              {!monthEnded && <span className="badge badge-yellow">⚠ Month in progress</span>}
              {monthEnded && <span className="badge badge-green">✓ Month Ended</span>}
              <button className="btn btn-success btn-sm" onClick={() => downloadAttendanceExcel({ employees: siteEmps, sites, attendance, rosters, months, month, year, siteId })}>
                ⬇ Excel
              </button>
            </div>
          </div>
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ fontSize: 11, minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 130, position:"sticky", left:0, background:"var(--surface2)", zIndex:2 }}>Employee</th>
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1;
                    const fri = isFriday(year,month,d);
                    return <th key={d} style={{ minWidth: 32, padding:"4px 2px", color: fri?"#f87171":"inherit" }}>{getDayName(year,month,d)}<br/>{d}</th>;
                  })}
                  <th style={{ color:"#10b981" }}>P</th>
                  <th style={{ color:"#ef4444" }}>A</th>
                  <th style={{ color:"#f59e0b" }}>H</th>
                  <th style={{ color:"#8b5cf6" }}>S</th>
                  <th style={{ color:"#94a3b8" }}>L</th>
                </tr>
              </thead>
              <tbody>
                {siteEmps.map((e,ri) => {
                  const counts = { P: 0, A: 0, H: 0, S: 0, L: 0 };
                  return (
                    <tr key={e.id} style={{ background: ri%2===0?"var(--surface)":"var(--surface2)" }}>
                      <td style={{ fontWeight:600, position:"sticky", left:0, background: ri%2===0?"var(--surface)":"var(--surface2)", zIndex:1, borderRight:"1px solid var(--border)" }}>
                        <div>{e.name}</div>
                        <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"var(--mono)" }}>{e.empId}</div>
                      </td>
                      {Array.from({ length: days }, (_, i) => {
                        const d = i + 1;
                        const dk2 = `${monthKey}-${String(d).padStart(2,"0")}`;
                        const a = getAtt(e.id, d);
                        const rType = roster[e.id]?.[d] || (isFriday(year,month,d) ? "H" : "W");
                        if (a?.status && counts[a.status] !== undefined) counts[a.status]++;
                        const isHoliday = rType === "H" && !a;
                        const isOff = rType === "O" && !a;
                        const empSt = e.empStatus || "active";
                        const isLocked = !a && empSt !== "active" && !isEmpActiveOnDate(e, dk2);
                        const lockedLabel = empSt === "leave" ? "LV" : empSt === "resigned" ? "RS" : empSt === "fled" ? "FL" : null;
                        return (
                          <td key={d} style={{ padding:2, cursor: isLocked ? "default" : "pointer", textAlign:"center" }} onClick={() => !isLocked && startEdit(e.id, d)}>
                            {a
                              ? <span className={`badge ${statusColors[a.status]||"badge-gray"}`} style={{ fontSize:9, padding:"1px 4px" }}>{a.status}</span>
                              : isLocked && lockedLabel ? <span style={{ color:"#f59e0b", fontSize:9, fontWeight:700 }}>{lockedLabel}</span>
                              : isHoliday ? <span style={{ color:"#06b6d4", fontSize:9 }}>PH</span>
                              : isOff ? <span style={{ color:"#64748b", fontSize:9 }}>OFF</span>
                              : <span style={{ color:"var(--text3)", fontSize:10 }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ color:"#10b981", fontWeight:700, textAlign:"center" }}>{counts.P}</td>
                      <td style={{ color:"#ef4444", fontWeight:700, textAlign:"center" }}>{counts.A}</td>
                      <td style={{ color:"#f59e0b", fontWeight:700, textAlign:"center" }}>{counts.H}</td>
                      <td style={{ color:"#8b5cf6", fontWeight:700, textAlign:"center" }}>{counts.S}</td>
                      <td style={{ color:"#94a3b8", fontWeight:700, textAlign:"center" }}>{counts.L}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Edit Attendance — Day {editing.day}</div>
              <button className="modal-close" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:12 }}>
                {employees.find(e=>e.id===editing.empId)?.name} · {editing.dk}
                {editing.siteKey && <span style={{ marginLeft:6 }}>@ {sites.find(s=>s.id===editing.siteKey)?.name||editing.siteKey}</span>}
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Status</label>
                <div className="att-status">
                  {["P","A","H","S","L"].map(s => (
                    <button key={s} className={`att-btn ${s} ${editVal.status === s ? "" : "inactive"}`} onClick={() => setEditVal(p => ({ ...p, status: s }))}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Gen OT (hrs)</label>
                  <input className="form-input" type="number" value={editVal.genOT || 0} onChange={e => setEditVal(p => ({ ...p, genOT: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Concrete OT</label>
                  <input className="form-input" type="number" value={editVal.concreteOT || 0} onChange={e => setEditVal(p => ({ ...p, concreteOT: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cement OT</label>
                  <input className="form-input" type="number" value={editVal.cementOT || 0} onChange={e => setEditVal(p => ({ ...p, cementOT: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Minutes Late</label>
                  <input className="form-input" type="number" value={editVal.minutesLate || 0} onChange={e => setEditVal(p => ({ ...p, minutesLate: +e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-success" onClick={saveEdit}>Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
