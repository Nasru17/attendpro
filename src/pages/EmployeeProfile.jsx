import { useState, useMemo, useEffect } from "react";
import { EMP_STATUS_META, getSalaryForMonth } from "../constants/employees";
import { getDaysInMonth, mvr, fmt, genId } from "../utils/helpers";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const TABS = ["Overview","Contact","Documents","Attendance","Leave","Salary","Promotions"];

// ── Helpers ──────────────────────────────────────────────────
function docStatus(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(expiryDate);
  const d = Math.ceil((expiry - today) / 86400000);
  if (d < 0)  return { label: `Expired ${Math.abs(d)}d ago`, color: "#ef4444", badge: "badge-red", urgent: true };
  if (d < 30) return { label: `${d}d left`, color: "#ef4444", badge: "badge-red", urgent: true };
  if (d < 90) return { label: `${d}d left`, color: "#f59e0b", badge: "badge-yellow", urgent: false };
  return      { label: `${d}d left`, color: "#10b981", badge: "badge-green", urgent: false };
}

function tenure(joinDate) {
  if (!joinDate) return "—";
  const start = new Date(joinDate);
  const now = new Date();
  let y = now.getFullYear() - start.getFullYear();
  let m = now.getMonth() - start.getMonth();
  if (m < 0) { y--; m += 12; }
  if (y === 0) return `${m} month${m !== 1 ? "s" : ""}`;
  return `${y} yr${y !== 1 ? "s" : ""} ${m} mo`;
}

function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
}

// Month attendance summary for one employee
function empMonthAtt(empId, year, month, attendance) {
  const mk = `${year}-${String(month+1).padStart(2,"0")}`;
  const days = getDaysInMonth(year, month);
  const counts = { P:0, A:0, H:0, S:0, L:0 };
  const dayDetails = [];
  for (let d = 1; d <= days; d++) {
    const dk = `${mk}-${String(d).padStart(2,"0")}`;
    const dayAtt = attendance[dk] || {};
    let found = null, foundSite = null;
    for (const [sid, siteMap] of Object.entries(dayAtt)) {
      if (siteMap[empId]) { found = siteMap[empId]; foundSite = sid; break; }
    }
    if (found && counts[found.status] !== undefined) counts[found.status]++;
    dayDetails.push({ day: d, status: found?.status || null, minutesLate: found?.minutesLate || 0, siteId: foundSite });
  }
  return { counts, dayDetails, days };
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, action, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div className="card-title">{title}</div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// ── Inline edit field ─────────────────────────────────────────
function Field({ label, value, editing, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {editing ? children : (
        <div style={{ padding: "9px 0", fontSize: 13, color: value ? "var(--text)" : "var(--text3)", minHeight: 20 }}>
          {value || "—"}
        </div>
      )}
    </div>
  );
}

// ── Doc card ─────────────────────────────────────────────────
function DocCard({ icon, title, fields, editing, onEdit, onSave, onCancel, isManager }) {
  const anyExpiry = fields.find(f => f.isExpiry && f.value);
  const ds = anyExpiry ? docStatus(anyExpiry.value) : null;
  return (
    <div style={{ background: "var(--surface2)", border: `1px solid ${ds?.urgent ? ds.color+"55" : "var(--border)"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ds && <span className={`badge ${ds.badge}`} style={{ fontSize: 10 }}>{ds.label}</span>}
          {isManager && !editing && <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>}
          {editing && <>
            <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          </>}
        </div>
      </div>
      <div className="form-grid form-grid-2">
        {fields.map(f => (
          <div key={f.key} className="form-group" style={f.full ? { gridColumn: "1/-1" } : {}}>
            <label className="form-label">{f.label}</label>
            {editing
              ? f.type === "checkbox"
                ? <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
                    <input type="checkbox" checked={!!f.value} onChange={e => f.onChange(e.target.checked)} style={{ width:16, height:16 }} />
                    <span style={{ fontSize:13 }}>{f.checkLabel || ""}</span>
                  </label>
                : <input className="form-input" type={f.type||"text"} value={f.value||""} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder||""} />
              : <div style={{ padding:"9px 0", fontSize:13, color: f.value?"var(--text)":"var(--text3)" }}>
                  {f.type==="checkbox" ? (f.value ? "✓ Yes" : "No") : (f.value||"—")}
                </div>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status badge (inline) ─────────────────────────────────────
function StatusBadge({ status }) {
  const meta = EMP_STATUS_META[status] || EMP_STATUS_META.active;
  return <span className={`badge ${meta.badge}`}>{meta.icon} {meta.label}</span>;
}

// ════════════════════════════════════════════════════════════════
// EMPLOYEE PROFILE
// ════════════════════════════════════════════════════════════════
export default function EmployeeProfile({ emp, onSave, onBack, user, attendance, rosters, ot, sites, leaves, setLeaves, payroll = {} }) {
  const [tab, setTab]       = useState("Overview");
  const [form, setForm]     = useState({ ...emp });
  const [editing, setEditing] = useState(null); // "personal"|"contact"|"agent"|"identity"|docKey|null
  const isManager = user?.role === "manager";

  useEffect(() => { setForm({ ...emp }); setEditing(null); }, [emp]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saveSection = (section) => {
    onSave({ ...form });
    setEditing(null);
  };
  const cancelEdit = () => { setForm({ ...emp }); setEditing(null); };

  // ── Status change ──
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus,  setNewStatus]  = useState(emp.empStatus || "active");
  const [statusDate, setStatusDate] = useState(emp.statusDate || new Date().toISOString().slice(0,10));
  const [statusNote, setStatusNote] = useState(emp.statusNote || "");

  const applyStatus = () => {
    onSave({ ...emp, empStatus: newStatus, statusDate, statusNote });
    setShowStatusChange(false);
  };

  // ── Attendance month picker ──
  const today = new Date();
  const [attYear,  setAttYear]  = useState(today.getFullYear());
  const [attMonth, setAttMonth] = useState(today.getMonth());

  const attData = useMemo(() => empMonthAtt(emp.id, attYear, attMonth, attendance), [emp.id, attYear, attMonth, attendance]);

  // ── Promotions ──
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({ date: today.toISOString().slice(0,10), fromDesignation: emp.designation||"", toDesignation: "", fromSalary: emp.basicSalary||"", toSalary: "", allowanceChanges: [], note: "" });

  const addPromotion = () => {
    if (!promoForm.toDesignation) return;
    const updated = { ...form, promotions: [...(form.promotions||[]), { id: genId(), ...promoForm }] };
    onSave(updated);
    setShowAddPromo(false);
    setPromoForm({ date: today.toISOString().slice(0,10), fromDesignation: promoForm.toDesignation, toDesignation: "", fromSalary: promoForm.toSalary||emp.basicSalary||"", toSalary: "", allowanceChanges: [], note: "" });
  };

  const deletePromo = (id) => {
    onSave({ ...emp, promotions: (emp.promotions||[]).filter(p => p.id !== id) });
  };

  // ── Salary history ──
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [salaryEntry, setSalaryEntry] = useState({ effectiveDate:"", basicSalary:"", attendanceAllowance:"", accommodationAllowance:"", foodAllowance:"", phoneAllowance:"" });

  // ── Saved pay slips ──
  const [viewSlip, setViewSlip] = useState(null);

  const addSalaryEntry = () => {
    if (!salaryEntry.effectiveDate) return;
    const entry = {
      effectiveDate:          salaryEntry.effectiveDate,
      basicSalary:            salaryEntry.basicSalary            || emp.basicSalary,
      attendanceAllowance:    salaryEntry.attendanceAllowance    || emp.attendanceAllowance,
      accommodationAllowance: salaryEntry.accommodationAllowance || emp.accommodationAllowance,
      foodAllowance:          salaryEntry.foodAllowance          || emp.foodAllowance,
      phoneAllowance:         salaryEntry.phoneAllowance         || emp.phoneAllowance,
    };
    const updated = [...(emp.salaryHistory||[]).filter(h => h.effectiveDate !== entry.effectiveDate), entry]
      .sort((a,b) => b.effectiveDate.localeCompare(a.effectiveDate));
    onSave({ ...emp, salaryHistory: updated });
    setShowAddSalary(false);
    setSalaryEntry({ effectiveDate:"", basicSalary:"", attendanceAllowance:"", accommodationAllowance:"", foodAllowance:"", phoneAllowance:"" });
  };

  const removeSalaryEntry = (date) => {
    onSave({ ...emp, salaryHistory: (emp.salaryHistory||[]).filter(h => h.effectiveDate !== date) });
  };

  // ── Leave summary ──
  const leaveSummary = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear(), mo = d.getMonth();
      const { counts } = empMonthAtt(emp.id, yr, mo, attendance);
      if (Object.values(counts).some(v => v > 0)) {
        months.push({ year: yr, month: mo, label: `${MONTHS[mo].slice(0,3)} ${yr}`, ...counts });
      }
    }
    return months;
  }, [emp.id, attendance]);

  const totalLeave = leaveSummary.reduce((s, m) => s + m.L, 0);

  // ── Leave Requests section state ──
  const empLeaves = useMemo(() => (leaves || []).filter(l => l.employeeId === emp.id)
    .sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || "")),
    [leaves, emp.id]);

  const [showLeaveForm,    setShowLeaveForm]    = useState(false);
  const [leaveForm,        setLeaveForm]        = useState({ leaveType: "annual", startDate: today.toISOString().slice(0,10), endDate: today.toISOString().slice(0,10), reason: "" });
  const setLF = (k, v) => setLeaveForm(p => ({ ...p, [k]: v }));
  const leaveFormDays = leaveForm.startDate && leaveForm.endDate
    ? Math.max(0, Math.ceil((new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) / 86400000) + 1)
    : 0;

  const [returningLeaveId, setReturningLeaveId] = useState(null);
  const [returnDateEmp,    setReturnDateEmp]    = useState(today.toISOString().slice(0,10));
  const [rejectingLeaveId, setRejectingLeaveId] = useState(null);
  const [rejectLeaveNote,  setRejectLeaveNote]  = useState("");

  const submitLeaveRequest = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) return;
    if (!setLeaves) return;
    setLeaves(p => [...p, {
      id:           genId(),
      employeeId:   emp.id,
      employeeName: emp.name,
      leaveType:    leaveForm.leaveType,
      startDate:    leaveForm.startDate,
      endDate:      leaveForm.endDate,
      days:         leaveFormDays,
      reason:       leaveForm.reason,
      status:       "pending",
      requestedAt:  today.toISOString().slice(0,10),
      requestedBy:  user?.name || "",
      reviewNote:   "",
      returnedAt:   null,
    }]);
    setShowLeaveForm(false);
    setLeaveForm({ leaveType: "annual", startDate: today.toISOString().slice(0,10), endDate: today.toISOString().slice(0,10), reason: "" });
  };

  const approveLeave = (id) => {
    if (!setLeaves) return;
    setLeaves(p => p.map(l => l.id === id ? { ...l, status: "approved" } : l));
  };

  const rejectLeave = (id) => {
    if (!setLeaves) return;
    setLeaves(p => p.map(l => l.id === id ? { ...l, status: "rejected", reviewNote: rejectLeaveNote } : l));
    setRejectingLeaveId(null);
    setRejectLeaveNote("");
  };

  const markReturned = (id) => {
    if (!setLeaves) return;
    setLeaves(p => p.map(l => l.id === id ? { ...l, returnedAt: returnDateEmp } : l));
    setReturningLeaveId(null);
  };

  // ── Leave days since statusDate (for employees on leave) ──
  const leaveDaysElapsed = useMemo(() => {
    if (emp.empStatus !== "leave" || !emp.statusDate) return 0;
    const start = new Date(emp.statusDate);
    const now = new Date();
    return Math.max(0, Math.floor((now - start) / 86400000));
  }, [emp.empStatus, emp.statusDate]);

  // ── Document expiry alerts ──
  const docAlerts = useMemo(() => {
    if (!emp.isExpat) return [];
    const checks = [
      { label: "Work Permit", date: emp.wpExpiry },
      { label: "Passport",    date: emp.passportExpiry },
      { label: "Visa",        date: emp.visaExpiry },
      { label: "Medical",     date: emp.medicalExpiry },
      { label: "Insurance",   date: emp.insuranceExpiry },
    ];
    return checks.map(c => ({ ...c, status: docStatus(c.date) })).filter(c => c.status?.urgent);
  }, [emp]);

  const statusMeta = EMP_STATUS_META[emp.empStatus || "active"];

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Back button ── */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>
        ← All Employees
      </button>

      {/* ── Profile header ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
              background: `${statusMeta.color}22`, color: statusMeta.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 800, border: `2px solid ${statusMeta.color}44`,
            }}>{initials(emp.name)}</div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{emp.name}</div>
                <StatusBadge status={emp.empStatus || "active"} />
                {emp.isExpat && <span className="badge badge-blue" style={{ fontSize: 10 }}>🌍 Expat</span>}
                {docAlerts.length > 0 && (
                  <span className="badge badge-red" style={{ fontSize: 10 }}>⚠ {docAlerts.length} doc{docAlerts.length > 1 ? "s" : ""} expiring</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>
                {emp.empId}
                {emp.isExpat
                  ? (emp.passportNumber ? <span> · <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>Passport: {emp.passportNumber}</span></span> : null)
                  : (emp.nidNumber      ? <span> · <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>NID: {emp.nidNumber}</span></span> : null)
                }
                {emp.designation ? ` · ${emp.designation}` : ""}
                {emp.nationality ? ` · ${emp.nationality}` : ""}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Joined", value: emp.joinDate || "—" },
                  { label: "Tenure", value: tenure(emp.joinDate) },
                  { label: "Basic Salary", value: isManager ? mvr(emp.basicSalary) : "—", mono: true },
                  { label: "Phone", value: emp.phone || "—" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontFamily: s.mono ? "var(--mono)" : undefined }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {isManager && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStatusChange(p => !p)}>
                ⚡ Change Status
              </button>
            )}
          </div>

          {/* Status change inline form */}
          {showStatusChange && isManager && (
            <div style={{ marginTop: 20, padding: "18px 20px", background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Change Employment Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {Object.entries(EMP_STATUS_META).map(([k, v]) => (
                  <div key={k} onClick={() => setNewStatus(k)} style={{
                    padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                    border: `2px solid ${newStatus === k ? v.color : "var(--border)"}`,
                    background: newStatus === k ? `${v.color}18` : "var(--surface3)",
                    color: newStatus === k ? v.color : "var(--text2)", transition: "all 0.12s"
                  }}>{v.icon} {v.label}</div>
                ))}
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Effective Date</label>
                  <input className="form-input" type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <input className="form-input" value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="e.g. Returned to home country" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={applyStatus}>Save Status</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowStatusChange(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Doc expiry alerts ── */}
      {docAlerts.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <span>⚠</span>
          <div>
            <strong>Document Alert:</strong>{" "}
            {docAlerts.map(a => `${a.label} (${a.status.label})`).join(", ")}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, overflowX: "auto", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
            fontSize: 13, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? "var(--accent)" : "var(--text3)",
            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            whiteSpace: "nowrap", fontFamily: "var(--font)", transition: "color 0.15s",
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: OVERVIEW
          ════════════════════════════════════════════════════════ */}
      {tab === "Overview" && (
        <div>
          {/* Current month attendance */}
          <Section title={`📅 ${MONTHS[today.getMonth()]} ${today.getFullYear()} — Attendance`}>
            {(() => {
              const { counts } = empMonthAtt(emp.id, today.getFullYear(), today.getMonth(), attendance);
              const total = Object.values(counts).reduce((s,v) => s+v, 0);
              if (total === 0) return <div className="empty-state"><p>No attendance entered for this month.</p></div>;
              return (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[["P","Present","#10b981"],["A","Absent","#ef4444"],["H","Half Day","#f59e0b"],["S","Sick","#8b5cf6"],["L","Leave","#94a3b8"]].map(([k,l,c]) => (
                    <div key={k} style={{ textAlign: "center", padding: "12px 20px", background: `${c}18`, borderRadius: 10, border: `1px solid ${c}33` }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "var(--mono)" }}>{counts[k]}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Section>

          {/* Salary snapshot */}
          {isManager && (
            <Section title="💰 Current Salary">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                {[
                  ["Basic Salary",   emp.basicSalary],
                  ["Attendance Allow.", emp.attendanceAllowance],
                  ["Accommodation",  emp.accommodationAllowance],
                  ["Food Allow.",    emp.foodAllowance],
                  ["Phone Allow.",   emp.phoneAllowance],
                ].map(([l,v]) => (
                  <div key={l} style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--accent)" }}>{mvr(v)}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Status note */}
          {emp.empStatus !== "active" && (
            <Section title="⚠ Status Info">
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div className="form-label">Status</div>
                  <StatusBadge status={emp.empStatus} />
                </div>
                <div>
                  <div className="form-label">Since</div>
                  <div style={{ fontSize: 13 }}>{emp.statusDate || "—"}</div>
                </div>
                {emp.empStatus === "leave" && (
                  <div>
                    <div className="form-label">Days on Leave</div>
                    <div style={{ fontSize: 13, color: leaveDaysElapsed > 30 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
                      {leaveDaysElapsed} days {leaveDaysElapsed > 30 && "(⚠ exceeded 30-day paid leave)"}
                    </div>
                  </div>
                )}
                {emp.statusNote && (
                  <div>
                    <div className="form-label">Notes</div>
                    <div style={{ fontSize: 13 }}>{emp.statusNote}</div>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: CONTACT
          ════════════════════════════════════════════════════════ */}
      {tab === "Contact" && (
        <div>
          {/* Personal info */}
          <Section title="👤 Personal Information"
            action={isManager && (
              editing === "personal"
                ? <div className="gap-2"><button className="btn btn-primary btn-sm" onClick={() => saveSection("personal")}>Save</button><button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button></div>
                : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("personal")}>Edit</button>
            )}>
            <div className="form-grid form-grid-2">
              {[
                { key:"name",        label:"Full Name *" },
                { key:"empId",       label:"Employee ID *" },
                { key:"designation", label:"Designation" },
                { key:"joinDate",    label:"Join Date", type:"date" },
                { key:"phone",       label:"Phone" },
                { key:"whatsapp",    label:"WhatsApp" },
              ].map(f => (
                <Field key={f.key} label={f.label} value={form[f.key]} editing={editing === "personal"}>
                  <input className="form-input" type={f.type||"text"} value={form[f.key]||""} onChange={e => set(f.key, e.target.value)} />
                </Field>
              ))}
            </div>
          </Section>

          {/* Emergency contact */}
          <Section title="🚨 Emergency Contact"
            action={isManager && (
              editing === "emergency"
                ? <div className="gap-2"><button className="btn btn-primary btn-sm" onClick={() => saveSection("emergency")}>Save</button><button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button></div>
                : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("emergency")}>Edit</button>
            )}>
            <div className="form-grid form-grid-2">
              {[
                { key:"emergencyContactName",     label:"Contact Name" },
                { key:"emergencyContactPhone",    label:"Contact Phone" },
                { key:"emergencyContactRelation", label:"Relation" },
              ].map(f => (
                <Field key={f.key} label={f.label} value={form[f.key]} editing={editing === "emergency"}>
                  <input className="form-input" value={form[f.key]||""} onChange={e => set(f.key, e.target.value)} />
                </Field>
              ))}
            </div>
          </Section>

          {/* Agent (expat only) */}
          {(emp.isExpat || editing === "agent") && (
            <Section title="🤝 Recruitment Agent"
              action={isManager && (
                editing === "agent"
                  ? <div className="gap-2"><button className="btn btn-primary btn-sm" onClick={() => saveSection("agent")}>Save</button><button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button></div>
                  : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("agent")}>Edit</button>
              )}>
              <div className="form-grid form-grid-2">
                {[
                  { key:"agentName",    label:"Agent Name" },
                  { key:"agentContact", label:"Agent Contact / Phone" },
                ].map(f => (
                  <Field key={f.key} label={f.label} value={form[f.key]} editing={editing === "agent"}>
                    <input className="form-input" value={form[f.key]||""} onChange={e => set(f.key, e.target.value)} />
                  </Field>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: DOCUMENTS
          ════════════════════════════════════════════════════════ */}
      {tab === "Documents" && (
        <div>
          {/* Identity */}
          <Section title="🪪 Identity"
            action={isManager && (
              editing === "identity"
                ? <div className="gap-2"><button className="btn btn-primary btn-sm" onClick={() => saveSection("identity")}>Save</button><button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button></div>
                : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("identity")}>Edit</button>
            )}>
            <div className="form-grid form-grid-2">
              <Field label="Nationality" value={form.nationality} editing={editing === "identity"}>
                <input className="form-input" value={form.nationality||""} onChange={e => set("nationality", e.target.value)} placeholder="e.g. Bangladeshi" />
              </Field>
              <Field label={form.isExpat ? "Passport Number" : "NID / ID Card Number"} value={form.isExpat ? form.passportNumber : form.nidNumber} editing={editing === "identity"}>
                {form.isExpat
                  ? <input className="form-input" value={form.passportNumber||""} onChange={e => set("passportNumber", e.target.value)} placeholder="Passport number" />
                  : <input className="form-input" value={form.nidNumber||""} onChange={e => set("nidNumber", e.target.value)} placeholder="National ID card number" />
                }
              </Field>
              <div className="form-group">
                <label className="form-label">Employee Type</label>
                {editing === "identity" ? (
                  <label style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", cursor:"pointer" }}>
                    <input type="checkbox" checked={!!form.isExpat} onChange={e => set("isExpat", e.target.checked)} style={{ width:16, height:16 }} />
                    <span style={{ fontSize:13 }}>Expatriate (non-Maldivian)</span>
                  </label>
                ) : (
                  <div style={{ padding:"9px 0", fontSize:13 }}>
                    {form.isExpat ? <span className="badge badge-blue">🌍 Expatriate</span> : <span className="badge badge-green">🇲🇻 Local</span>}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Expat docs */}
          {emp.isExpat && (
            <>
              <DocCard icon="📄" title="Work Permit"
                editing={editing === "wp"} isManager={isManager}
                onEdit={() => setEditing("wp")} onSave={() => saveSection("wp")} onCancel={cancelEdit}
                fields={[
                  { key:"wpNumber",      label:"WP Number",       value:form.wpNumber,      onChange:v=>set("wpNumber",v) },
                  { key:"wpExpiry",      label:"Expiry Date",     value:form.wpExpiry,      onChange:v=>set("wpExpiry",v),      type:"date", isExpiry:true },
                  { key:"wpFeePaid",     label:"Fee Paid",        value:form.wpFeePaid,     onChange:v=>set("wpFeePaid",v),     type:"checkbox", checkLabel:"Yes, fee has been paid" },
                  { key:"wpFeePaidDate", label:"Fee Paid Date",   value:form.wpFeePaidDate, onChange:v=>set("wpFeePaidDate",v), type:"date" },
                ]}
              />
              <DocCard icon="🛂" title="Passport"
                editing={editing === "passport"} isManager={isManager}
                onEdit={() => setEditing("passport")} onSave={() => saveSection("passport")} onCancel={cancelEdit}
                fields={[
                  { key:"passportNumber", label:"Passport Number", value:form.passportNumber, onChange:v=>set("passportNumber",v) },
                  { key:"passportExpiry", label:"Expiry Date",     value:form.passportExpiry, onChange:v=>set("passportExpiry",v), type:"date", isExpiry:true },
                ]}
              />
              <DocCard icon="🛡" title="Visa"
                editing={editing === "visa"} isManager={isManager}
                onEdit={() => setEditing("visa")} onSave={() => saveSection("visa")} onCancel={cancelEdit}
                fields={[
                  { key:"visaType",   label:"Visa Type",   value:form.visaType,   onChange:v=>set("visaType",v),   placeholder:"e.g. Work Visa" },
                  { key:"visaNumber", label:"Visa Number", value:form.visaNumber, onChange:v=>set("visaNumber",v) },
                  { key:"visaExpiry", label:"Expiry Date", value:form.visaExpiry, onChange:v=>set("visaExpiry",v), type:"date", isExpiry:true },
                ]}
              />
              <DocCard icon="🏥" title="Medical"
                editing={editing === "medical"} isManager={isManager}
                onEdit={() => setEditing("medical")} onSave={() => saveSection("medical")} onCancel={cancelEdit}
                fields={[
                  { key:"medicalProvider", label:"Provider",    value:form.medicalProvider, onChange:v=>set("medicalProvider",v) },
                  { key:"medicalExpiry",   label:"Expiry Date", value:form.medicalExpiry,   onChange:v=>set("medicalExpiry",v), type:"date", isExpiry:true },
                ]}
              />
              <DocCard icon="🛡️" title="Insurance"
                editing={editing === "insurance"} isManager={isManager}
                onEdit={() => setEditing("insurance")} onSave={() => saveSection("insurance")} onCancel={cancelEdit}
                fields={[
                  { key:"insuranceProvider", label:"Provider",      value:form.insuranceProvider, onChange:v=>set("insuranceProvider",v) },
                  { key:"insurancePolicyNo", label:"Policy Number", value:form.insurancePolicyNo, onChange:v=>set("insurancePolicyNo",v) },
                  { key:"insuranceExpiry",   label:"Expiry Date",   value:form.insuranceExpiry,   onChange:v=>set("insuranceExpiry",v), type:"date", isExpiry:true },
                ]}
              />
            </>
          )}
          {!emp.isExpat && (
            <div className="alert alert-info">ℹ Mark employee as Expatriate in Identity section above to see document tracking.</div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: ATTENDANCE
          ════════════════════════════════════════════════════════ */}
      {tab === "Attendance" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Month</label>
                  <select className="form-select" value={attMonth} onChange={e => setAttMonth(+e.target.value)}>
                    {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Year</label>
                  <select className="form-select" value={attYear} onChange={e => setAttYear(+e.target.value)}>
                    {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[["P","Present","#10b981"],["A","Absent","#ef4444"],["H","Half Day","#f59e0b"],["S","Sick","#8b5cf6"],["L","Leave","#94a3b8"]].map(([k,l,c]) => (
              <div key={k} style={{ textAlign:"center", padding:"12px 20px", background:`${c}18`, borderRadius:10, border:`1px solid ${c}33`, flex:"1 1 90px" }}>
                <div style={{ fontSize:24, fontWeight:800, color:c, fontFamily:"var(--mono)" }}>{attData.counts[k]}</div>
                <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Day-by-day */}
          <div className="card">
            <div className="card-header"><div className="card-title">{MONTHS[attMonth]} {attYear} — Day by Day</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Day</th><th>Weekday</th><th>Status</th><th>Late (min)</th><th>Site</th></tr>
                </thead>
                <tbody>
                  {attData.dayDetails.filter(d => d.status).map(d => {
                    const wd = new Date(attYear, attMonth, d.day).toLocaleDateString("en",{weekday:"short"});
                    const COLOR = {P:"#10b981",A:"#ef4444",H:"#f59e0b",S:"#8b5cf6",L:"#94a3b8"};
                    const siteName = sites.find(s => s.id === d.siteId)?.name || d.siteId || "—";
                    return (
                      <tr key={d.day}>
                        <td className="text-mono">{String(attMonth+1).padStart(2,"0")}/{String(d.day).padStart(2,"0")}</td>
                        <td style={{ color:"var(--text3)" }}>{wd}</td>
                        <td>
                          <span style={{ fontWeight:700, color:COLOR[d.status]||"var(--text3)", fontSize:13 }}>{d.status}</span>
                        </td>
                        <td style={{ color: d.minutesLate>0?"#f59e0b":"var(--text3)" }}>{d.minutesLate||0}</td>
                        <td style={{ color:"var(--text3)", fontSize:12 }}>{siteName}</td>
                      </tr>
                    );
                  })}
                  {attData.dayDetails.every(d => !d.status) && (
                    <tr><td colSpan={5}><div className="empty-state"><p>No attendance entered for {MONTHS[attMonth]} {attYear}</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: LEAVE
          ════════════════════════════════════════════════════════ */}
      {tab === "Leave" && (
        <div>
          {/* ── Leave Requests section ── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Leave Requests</div>
              {setLeaves && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowLeaveForm(p => !p)}>
                  {showLeaveForm ? "✕ Cancel" : "+ Request Leave"}
                </button>
              )}
            </div>
            <div className="card-body">
              {/* Add form */}
              {showLeaveForm && (
                <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid var(--border)" }}>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Leave Type</label>
                      <select className="form-select" value={leaveForm.leaveType} onChange={e => setLF("leaveType", e.target.value)}>
                        <option value="annual">Annual</option>
                        <option value="sick">Sick</option>
                        <option value="emergency">Emergency</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div />
                    <div className="form-group">
                      <label className="form-label">Start Date *</label>
                      <input className="form-input" type="date" value={leaveForm.startDate} onChange={e => setLF("startDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date *</label>
                      <input className="form-input" type="date" value={leaveForm.endDate} onChange={e => setLF("endDate", e.target.value)} />
                    </div>
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label className="form-label">Reason</label>
                      <textarea className="form-input" rows={2} value={leaveForm.reason} onChange={e => setLF("reason", e.target.value)} placeholder="Optional..." style={{ resize: "vertical" }} />
                    </div>
                  </div>
                  {leaveFormDays > 0 && (
                    <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 10 }}>
                      Duration: {leaveFormDays} day{leaveFormDays !== 1 ? "s" : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={submitLeaveRequest}>Submit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowLeaveForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Requests table */}
              {empLeaves.length === 0 ? (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <p>No leave requests for this employee.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empLeaves.map(l => {
                        const TYPE_COLOR = { annual: "#06b6d4", sick: "#8b5cf6", emergency: "#ef4444", other: "#94a3b8" };
                        const TYPE_LABEL = { annual: "Annual", sick: "Sick", emergency: "Emergency", other: "Other" };
                        const STATUS_CLS = { pending: "badge-yellow", approved: "badge-green", rejected: "badge-red" };
                        return (
                          <tr key={l.id}>
                            <td>
                              <span style={{ color: TYPE_COLOR[l.leaveType] || "var(--text3)", fontWeight: 700, fontSize: 12 }}>
                                {TYPE_LABEL[l.leaveType] || l.leaveType}
                              </span>
                            </td>
                            <td className="text-mono" style={{ fontSize: 12 }}>{l.startDate}</td>
                            <td className="text-mono" style={{ fontSize: 12 }}>{l.endDate}</td>
                            <td style={{ fontWeight: 700 }}>{l.days}</td>
                            <td>
                              <span className={`badge ${STATUS_CLS[l.status] || "badge-gray"}`}>
                                {l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1) : "—"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                {l.status === "approved" && !l.returnedAt && setLeaves && (
                                  returningLeaveId === l.id ? (
                                    <>
                                      <input className="form-input" type="date" value={returnDateEmp} onChange={e => setReturnDateEmp(e.target.value)} style={{ width: 130, padding: "3px 7px", fontSize: 12 }} />
                                      <button className="btn btn-primary btn-sm" onClick={() => markReturned(l.id)}>Confirm</button>
                                      <button className="btn btn-ghost btn-sm" onClick={() => setReturningLeaveId(null)}>✕</button>
                                    </>
                                  ) : (
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setReturningLeaveId(l.id); setReturnDateEmp(today.toISOString().slice(0,10)); }}>
                                      Mark Returned
                                    </button>
                                  )
                                )}
                                {l.status === "approved" && l.returnedAt && (
                                  <span style={{ fontSize: 11, color: "var(--text3)" }}>Returned {l.returnedAt}</span>
                                )}
                                {isManager && l.status === "pending" && setLeaves && (
                                  rejectingLeaveId === l.id ? (
                                    <>
                                      <input className="form-input" placeholder="Note..." value={rejectLeaveNote} onChange={e => setRejectLeaveNote(e.target.value)} style={{ width: 150, padding: "3px 7px", fontSize: 12 }} />
                                      <button className="btn btn-danger btn-sm" onClick={() => rejectLeave(l.id)}>Confirm</button>
                                      <button className="btn btn-ghost btn-sm" onClick={() => setRejectingLeaveId(null)}>✕</button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="btn btn-sm" style={{ background: "#10b981", borderColor: "#10b981", color: "#fff" }} onClick={() => approveLeave(l.id)}>✓</button>
                                      <button className="btn btn-danger btn-sm" onClick={() => { setRejectingLeaveId(l.id); setRejectLeaveNote(""); }}>✗</button>
                                    </>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {emp.empStatus === "leave" && (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <span>🏖</span>
              <div>
                <strong>Currently on Leave</strong> since {emp.statusDate || "unknown date"} — {leaveDaysElapsed} day{leaveDaysElapsed!==1?"s":""} elapsed.
                {leaveDaysElapsed > 30 && <span style={{ color:"#ef4444", fontWeight:700 }}> ⚠ Exceeded 30-day paid leave.</span>}
                {emp.statusNote && <div style={{ fontSize:12, marginTop:4 }}>Note: {emp.statusNote}</div>}
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
            {[
              { label:"Leave Days (L) — Last 12 Months", value:totalLeave, color:"#94a3b8" },
              { label:"Days on Leave (Status)", value:leaveDaysElapsed || "—", color:"#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ flex:"1 1 180px", background:`${s.color}18`, border:`1px solid ${s.color}33`, borderRadius:12, padding:"16px 20px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:"var(--mono)" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Monthly leave breakdown */}
          <div className="card">
            <div className="card-header"><div className="card-title">Monthly Leave History (L days from Attendance)</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th>P</th><th>A</th><th>H</th><th>S</th><th style={{color:"#94a3b8"}}>L</th></tr></thead>
                <tbody>
                  {leaveSummary.length === 0
                    ? <tr><td colSpan={6}><div className="empty-state"><p>No attendance data found.</p></div></td></tr>
                    : leaveSummary.map(m => (
                      <tr key={`${m.year}-${m.month}`}>
                        <td style={{ fontWeight:600 }}>{m.label}</td>
                        <td style={{ color:"#10b981", fontWeight:700 }}>{m.P||0}</td>
                        <td style={{ color:"#ef4444", fontWeight:700 }}>{m.A||0}</td>
                        <td style={{ color:"#f59e0b", fontWeight:700 }}>{m.H||0}</td>
                        <td style={{ color:"#8b5cf6", fontWeight:700 }}>{m.S||0}</td>
                        <td style={{ color:"#94a3b8", fontWeight:800 }}>{m.L||0}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: SALARY
          ════════════════════════════════════════════════════════ */}
      {tab === "Salary" && (
        <div>
          {!isManager
            ? <div className="alert alert-info">🔒 Salary details are only visible to managers.</div>
            : <>
              {/* Current salary */}
              <Section title="💰 Current Salary Structure">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
                  {[
                    ["Basic Salary",         emp.basicSalary],
                    ["Attendance Allow.",     emp.attendanceAllowance],
                    ["Accommodation Allow.", emp.accommodationAllowance],
                    ["Food Allowance",        emp.foodAllowance],
                    ["Phone Allowance",       emp.phoneAllowance],
                  ].map(([l,v]) => (
                    <div key={l} style={{ background:"var(--surface2)", borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ fontSize:10, color:"var(--text3)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:700, fontFamily:"var(--mono)", color:"var(--accent)" }}>{mvr(v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {[
                    ["Gen OT Rate",       `MVR ${emp.otRate||20}/hr`],
                    ["Concrete OT",       `MVR ${emp.concreteOT||200}/unit`],
                    ["Cement OT",         `MVR ${emp.cementOT||100}/unit`],
                  ].map(([l,v]) => (
                    <div key={l} style={{ fontSize:12, color:"var(--text3)" }}><strong>{l}:</strong> {v}</div>
                  ))}
                </div>
              </Section>

              {/* Salary history */}
              <Section title="📈 Salary History"
                action={
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddSalary(p => !p)}>
                    {showAddSalary ? "✕ Cancel" : "+ Add Entry"}
                  </button>
                }>
                {showAddSalary && (
                  <div style={{ background:"var(--surface3)", borderRadius:10, padding:14, marginBottom:14, border:"1px solid var(--border)" }}>
                    <div style={{ fontSize:11, color:"var(--text3)", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>New Salary Entry</div>
                    <div className="form-grid form-grid-2" style={{ marginBottom:10 }}>
                      <div className="form-group" style={{ gridColumn:"1/-1" }}>
                        <label className="form-label">Effective Date *</label>
                        <input className="form-input" type="date" value={salaryEntry.effectiveDate} onChange={e => setSalaryEntry(p => ({...p, effectiveDate:e.target.value}))} />
                      </div>
                      {["basicSalary","attendanceAllowance","accommodationAllowance","foodAllowance","phoneAllowance"].map(k => (
                        <div key={k} className="form-group">
                          <label className="form-label">{k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase())}</label>
                          <input className="form-input" type="number" value={salaryEntry[k]} placeholder={emp[k]||"0"} onChange={e => setSalaryEntry(p => ({...p, [k]:e.target.value}))} />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text3)", marginBottom:8 }}>Leave blank to keep current value.</div>
                    <button className="btn btn-primary btn-sm" onClick={addSalaryEntry}>Save Entry</button>
                  </div>
                )}
                {(emp.salaryHistory||[]).length === 0
                  ? <div style={{ fontSize:12, color:"var(--text3)" }}>No history. Current salary fields are used for all payroll calculations.</div>
                  : <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Effective Date</th><th>Basic</th><th>Att. Allow.</th>
                            <th>Accom.</th><th>Food</th><th>Phone</th><th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(emp.salaryHistory||[]).sort((a,b) => b.effectiveDate.localeCompare(a.effectiveDate)).map((h,i) => (
                            <tr key={h.effectiveDate}>
                              <td style={{ fontWeight:600, color:i===0?"var(--accent)":"var(--text)" }}>
                                {h.effectiveDate}
                                {i===0 && <span style={{ fontSize:9, marginLeft:5, color:"var(--accent)", fontWeight:800, textTransform:"uppercase" }}>latest</span>}
                              </td>
                              <td className="text-mono">{mvr(h.basicSalary)}</td>
                              <td className="text-mono">{mvr(h.attendanceAllowance)}</td>
                              <td className="text-mono">{mvr(h.accommodationAllowance)}</td>
                              <td className="text-mono">{mvr(h.foodAllowance)}</td>
                              <td className="text-mono">{mvr(h.phoneAllowance)}</td>
                              <td><button onClick={() => removeSalaryEntry(h.effectiveDate)} style={{ background:"none", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:14 }}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                }
              </Section>

              {/* Saved Pay Slips */}
              {(() => {
                const savedSlips = Object.entries(payroll)
                  .filter(([mk, monthData]) => monthData[emp.id])
                  .map(([mk, monthData]) => ({ monthKey: mk, ...monthData[emp.id] }))
                  .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
                return (
                  <Section title="📋 Saved Pay Slips">
                    {savedSlips.length === 0
                      ? <div style={{ fontSize:12, color:"var(--text3)" }}>No saved pay slips yet. Slips are saved from the Payroll module.</div>
                      : <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Saved At</th>
                                <th>Net Pay</th>
                                <th>Payments</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {savedSlips.map(slip => {
                                const totalPaid = (slip.payments||[]).reduce((s,p) => s + Number(p.amount||0), 0);
                                const netPay = slip.data?.netPay || 0;
                                const paidPct = netPay > 0 ? Math.round(totalPaid / netPay * 100) : 0;
                                return (
                                  <tr key={slip.monthKey}>
                                    <td style={{ fontWeight:600 }}>{slip.monthKey}</td>
                                    <td style={{ fontSize:11, color:"var(--text3)" }}>{slip.savedAt ? new Date(slip.savedAt).toLocaleDateString() : "—"}</td>
                                    <td className="text-mono" style={{ color:"var(--success)", fontWeight:700 }}>{mvr(netPay)}</td>
                                    <td>
                                      {(slip.payments||[]).length > 0
                                        ? <span className={`badge ${paidPct >= 100 ? "badge-green" : "badge-yellow"}`}>
                                            {mvr(totalPaid)} / {mvr(netPay)} ({paidPct}%)
                                          </span>
                                        : <span className="badge badge-red">Unpaid</span>
                                      }
                                    </td>
                                    <td>
                                      <button className="btn btn-ghost btn-sm" onClick={() => setViewSlip(slip)}>View</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                    }
                  </Section>
                );
              })()}

              {/* Pay slip view modal */}
              {viewSlip && (
                <div className="modal-overlay">
                  <div className="modal" style={{ maxWidth:520 }}>
                    <div className="modal-header">
                      <div className="modal-title">Pay Slip — {viewSlip.monthKey}</div>
                      <button className="modal-close" onClick={() => setViewSlip(null)}>✕</button>
                    </div>
                    <div className="modal-body">
                      <div className="payslip">
                        <div className="payslip-header">
                          <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
                            <img src="/alitho-logo-r.png" alt="Alitho" style={{ height:60, objectFit:"contain" }} />
                          </div>
                          <div style={{ fontWeight:700, fontSize:16 }}>{viewSlip.empName}</div>
                          <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{viewSlip.empId} · {viewSlip.monthKey}</div>
                          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Saved: {viewSlip.savedAt ? new Date(viewSlip.savedAt).toLocaleString() : "—"}</div>
                        </div>
                        <div style={{ padding:"12px 0" }}>
                          {viewSlip.data && [
                            ["Basic Earned",       viewSlip.data.basicEarned],
                            ["Attendance Allow.",  viewSlip.data.attendanceAllow],
                            ["Food Allowance",     viewSlip.data.foodAllow],
                            ["Tea Allowance",      viewSlip.data.teaAllow],
                            ["Phone Allowance",    viewSlip.data.phoneAllow],
                            ["Accommodation",      viewSlip.data.accommodationAllow],
                            ["OT (General)",       viewSlip.data.genOTAmount],
                            ["OT (Concrete)",      viewSlip.data.concreteOTAmount],
                            ["OT (Cement)",        viewSlip.data.cementOTAmount],
                            ...(viewSlip.data.bonusAmount > 0 ? [[viewSlip.data.bonusName||"Bonus", viewSlip.data.bonusAmount]] : []),
                          ].filter(r => r[1] > 0).map(([l,v]) => (
                            <div key={l} className="payslip-row">
                              <div>{l}</div>
                              <div className="amount" style={{ color:"var(--success)" }}>{mvr(v)}</div>
                            </div>
                          ))}
                          <div className="payslip-row total">
                            <div>Gross Earnings</div>
                            <div className="amount" style={{ color:"var(--success)" }}>{mvr(viewSlip.data?.grossEarnings||0)}</div>
                          </div>
                          {viewSlip.data && [
                            ["Late Deduction",   viewSlip.data.lateDeduct],
                            ["Utility",          viewSlip.data.utilityDeduct],
                            ["Advance",          viewSlip.data.advanceDeduct],
                            ["Loan Installment", viewSlip.data.loanDeduct],
                          ].filter(r => r[1] > 0).map(([l,v]) => (
                            <div key={l} className="payslip-row deduct">
                              <div>{l}</div>
                              <div className="amount">- {mvr(v)}</div>
                            </div>
                          ))}
                          <div className="payslip-row total" style={{ background:"rgba(16,185,129,0.1)", fontSize:16 }}>
                            <div style={{ fontWeight:800 }}>NET PAY</div>
                            <div className="amount" style={{ color:"var(--success)", fontSize:18 }}>{mvr(viewSlip.data?.netPay||0)}</div>
                          </div>
                          {(viewSlip.payments||[]).length > 0 && (
                            <div style={{ padding:"10px 20px" }}>
                              <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Payments</div>
                              {viewSlip.payments.map(pmt => (
                                <div key={pmt.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                    <span className="badge badge-blue" style={{ fontSize:10 }}>{pmt.type}</span>
                                    <span style={{ color:"var(--text3)", fontSize:11 }}>{pmt.date}</span>
                                    {pmt.note && <span style={{ color:"var(--text3)", fontSize:11 }}>{pmt.note}</span>}
                                  </div>
                                  <span className="text-mono" style={{ color:"var(--success)", fontWeight:600 }}>{mvr(pmt.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn btn-ghost" onClick={() => setViewSlip(null)}>Close</button>
                      <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="alert alert-info">
                💡 Full salary slips and payroll calculations are available in the <strong>Payroll</strong> module.
              </div>
            </>
          }
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: PROMOTIONS
          ════════════════════════════════════════════════════════ */}
      {tab === "Promotions" && (
        <div>
          {isManager && (
            <div style={{ marginBottom:16 }}>
              <button className="btn btn-primary" onClick={() => setShowAddPromo(p => !p)}>
                {showAddPromo ? "✕ Cancel" : "+ Add Promotion / Increment"}
              </button>
            </div>
          )}

          {showAddPromo && isManager && (
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-header"><div className="card-title">New Promotion / Increment</div></div>
              <div className="card-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group" style={{ gridColumn:"1/-1" }}>
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" value={promoForm.date} onChange={e => setPromoForm(p => ({...p, date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">From Designation</label>
                    <input className="form-input" value={promoForm.fromDesignation} onChange={e => setPromoForm(p => ({...p, fromDesignation:e.target.value}))} placeholder="Previous designation" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Designation *</label>
                    <input className="form-input" value={promoForm.toDesignation} onChange={e => setPromoForm(p => ({...p, toDesignation:e.target.value}))} placeholder="New designation" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">From Basic Salary (MVR)</label>
                    <input className="form-input" type="number" value={promoForm.fromSalary} onChange={e => setPromoForm(p => ({...p, fromSalary:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Basic Salary (MVR)</label>
                    <input className="form-input" type="number" value={promoForm.toSalary} onChange={e => setPromoForm(p => ({...p, toSalary:e.target.value}))} />
                  </div>
                </div>

                {/* Allowance changes */}
                <div style={{ marginTop:16, marginBottom:4 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
                    Allowance Changes
                  </div>
                  {promoForm.allowanceChanges.length > 0 && (
                    <div style={{ marginBottom:8 }}>
                      {promoForm.allowanceChanges.map((ac, idx) => (
                        <div key={idx} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                          <input className="form-input" style={{ flex:"2 1 140px" }}
                            value={ac.name} placeholder="Allowance name (e.g. Phone Allowance)"
                            onChange={e => setPromoForm(p => { const a=[...p.allowanceChanges]; a[idx]={...a[idx],name:e.target.value}; return {...p,allowanceChanges:a}; })} />
                          <input className="form-input" style={{ flex:"1 1 90px" }} type="number"
                            value={ac.fromAmount} placeholder="From (MVR)"
                            onChange={e => setPromoForm(p => { const a=[...p.allowanceChanges]; a[idx]={...a[idx],fromAmount:e.target.value}; return {...p,allowanceChanges:a}; })} />
                          <span style={{ color:"var(--text3)", fontSize:13 }}>→</span>
                          <input className="form-input" style={{ flex:"1 1 90px" }} type="number"
                            value={ac.toAmount} placeholder="To (MVR)"
                            onChange={e => setPromoForm(p => { const a=[...p.allowanceChanges]; a[idx]={...a[idx],toAmount:e.target.value}; return {...p,allowanceChanges:a}; })} />
                          <button onClick={() => setPromoForm(p => ({...p, allowanceChanges: p.allowanceChanges.filter((_,i)=>i!==idx)}))}
                            style={{ background:"none", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:16, padding:"0 4px" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => setPromoForm(p => ({...p, allowanceChanges: [...p.allowanceChanges, {name:"",fromAmount:"",toAmount:""}]}))}>
                    + Add Allowance Change
                  </button>
                </div>

                <div className="form-group" style={{ marginTop:12 }}>
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={promoForm.note} onChange={e => setPromoForm(p => ({...p, note:e.target.value}))} placeholder="e.g. Annual increment, Promoted to site supervisor" />
                </div>
                <div style={{ marginTop:14 }}>
                  <button className="btn btn-primary" disabled={!promoForm.toDesignation} onClick={addPromotion}>Save Promotion</button>
                </div>
              </div>
            </div>
          )}

          {(emp.promotions||[]).length === 0
            ? <div className="empty-state"><div className="icon">🏆</div><p>No promotions or increments recorded yet.</p></div>
            : <div className="card">
                <div className="card-header"><div className="card-title">Promotion History</div></div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>From</th><th>To</th><th>Basic Salary</th><th>Allowance Changes</th><th>Notes</th>{isManager&&<th></th>}</tr>
                    </thead>
                    <tbody>
                      {[...(emp.promotions||[])].sort((a,b) => b.date.localeCompare(a.date)).map(p => (
                        <tr key={p.id}>
                          <td className="text-mono">{p.date}</td>
                          <td style={{ color:"var(--text3)" }}>{p.fromDesignation||"—"}</td>
                          <td style={{ fontWeight:700, color:"var(--accent)" }}>{p.toDesignation}</td>
                          <td className="text-mono" style={{ whiteSpace:"nowrap" }}>
                            {p.fromSalary ? mvr(p.fromSalary) : "—"}
                            {(p.fromSalary && p.toSalary) && <span style={{ color:"var(--text3)", margin:"0 4px" }}>→</span>}
                            {p.toSalary ? <span style={{ color:"var(--accent)" }}>{mvr(p.toSalary)}</span> : ""}
                          </td>
                          <td style={{ fontSize:12 }}>
                            {(p.allowanceChanges||[]).length > 0
                              ? <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {p.allowanceChanges.map((ac,i) => (
                                    <div key={i} style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                                      <span style={{ fontWeight:600, color:"var(--text2)" }}>{ac.name}</span>
                                      {(ac.fromAmount||ac.toAmount) && (
                                        <span style={{ fontFamily:"var(--mono)", color:"var(--text3)", fontSize:11 }}>
                                          {ac.fromAmount ? mvr(ac.fromAmount) : "—"} → <span style={{ color:"var(--accent)" }}>{ac.toAmount ? mvr(ac.toAmount) : "—"}</span>
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              : <span style={{ color:"var(--text3)" }}>—</span>
                            }
                          </td>
                          <td style={{ color:"var(--text3)", fontSize:12 }}>{p.note||"—"}</td>
                          {isManager && <td>
                            <button onClick={() => deletePromo(p.id)} style={{ background:"none", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:14 }}>✕</button>
                          </td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          }
        </div>
      )}
    </div>
  );
}
