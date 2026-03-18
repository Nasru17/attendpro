import { useState } from "react";
import { EMP_STATUS_META, EMPTY_EMP } from "../constants/employees";
import { mvr, genId } from "../utils/helpers";
import EmployeeProfile from "./EmployeeProfile";

export function EmployeeModal({ emp, onSave, onClose }) {
  const [form, setForm] = useState(emp ? { ...emp, salaryHistory: emp.salaryHistory || [] } : { ...EMPTY_EMP });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Salary history helpers
  const [newHistEntry, setNewHistEntry] = useState({
    effectiveDate: "", basicSalary: "", attendanceAllowance: "",
    accommodationAllowance: "", foodAllowance: "", phoneAllowance: ""
  });
  const [showAddHist, setShowAddHist] = useState(false);

  const addHistEntry = () => {
    if (!newHistEntry.effectiveDate) return alert("Effective date is required");
    const entry = {
      effectiveDate:           newHistEntry.effectiveDate,
      basicSalary:             newHistEntry.basicSalary            || form.basicSalary,
      attendanceAllowance:     newHistEntry.attendanceAllowance    || form.attendanceAllowance,
      accommodationAllowance:  newHistEntry.accommodationAllowance || form.accommodationAllowance,
      foodAllowance:           newHistEntry.foodAllowance          || form.foodAllowance,
      phoneAllowance:          newHistEntry.phoneAllowance         || form.phoneAllowance,
    };
    const updated = [...(form.salaryHistory || []).filter(h => h.effectiveDate !== entry.effectiveDate), entry]
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    setForm(p => ({ ...p, salaryHistory: updated }));
    setNewHistEntry({ effectiveDate: "", basicSalary: "", attendanceAllowance: "", accommodationAllowance: "", foodAllowance: "", phoneAllowance: "" });
    setShowAddHist(false);
  };

  const removeHistEntry = (date) => {
    setForm(p => ({ ...p, salaryHistory: (p.salaryHistory || []).filter(h => h.effectiveDate !== date) }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{emp ? "Edit Employee" : "Add Employee"}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">Personal Info</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Employee Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Employee ID *</label>
                <input className="form-input" value={form.empId} onChange={e => set("empId", e.target.value)} placeholder="EMP001" />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Mason" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input className="form-input" type="date" value={form.joinDate} onChange={e => set("joinDate", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Salary Details</div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Basic Salary (MVR)</label>
                <input className="form-input" type="number" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Attendance Allowance</label>
                <input className="form-input" type="number" value={form.attendanceAllowance} onChange={e => set("attendanceAllowance", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Accommodation Allow.</label>
                <input className="form-input" type="number" value={form.accommodationAllowance} onChange={e => set("accommodationAllowance", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Food Allowance/Month</label>
                <input className="form-input" type="number" value={form.foodAllowance} onChange={e => set("foodAllowance", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Allowance/Month</label>
                <input className="form-input" type="number" value={form.phoneAllowance} onChange={e => set("phoneAllowance", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">OT Rates (System Defaults)</div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">General OT (MVR/hr)</label>
                <input className="form-input" type="number" value={form.otRate} onChange={e => set("otRate", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Concrete OT (MVR/each)</label>
                <input className="form-input" type="number" value={form.concreteOT} onChange={e => set("concreteOT", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cement OT (MVR/each)</label>
                <input className="form-input" type="number" value={form.cementOT} onChange={e => set("cementOT", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Employment Status</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.empStatus || "active"} onChange={e => set("empStatus", e.target.value)}>
                  {Object.entries(EMP_STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status Date</label>
                <input className="form-input" type="date" value={form.statusDate || ""} onChange={e => set("statusDate", e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.statusNote || ""} onChange={e => set("statusNote", e.target.value)} placeholder="e.g. Returned to home country, expected back 01 May" />
              </div>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Salary History</span>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setShowAddHist(p => !p)}>
                {showAddHist ? "✕ Cancel" : "+ Add Entry"}
              </button>
            </div>

            {/* Add new history entry form */}
            {showAddHist && (
              <div style={{ background: "var(--surface3)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>New Salary Entry</div>
                <div className="form-grid form-grid-2" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Effective Date *</label>
                    <input className="form-input" type="date" value={newHistEntry.effectiveDate} onChange={e => setNewHistEntry(p => ({ ...p, effectiveDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Basic Salary</label>
                    <input className="form-input" type="number" placeholder={form.basicSalary || "0"} value={newHistEntry.basicSalary} onChange={e => setNewHistEntry(p => ({ ...p, basicSalary: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attendance Allow.</label>
                    <input className="form-input" type="number" placeholder={form.attendanceAllowance || "0"} value={newHistEntry.attendanceAllowance} onChange={e => setNewHistEntry(p => ({ ...p, attendanceAllowance: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accommodation Allow.</label>
                    <input className="form-input" type="number" placeholder={form.accommodationAllowance || "0"} value={newHistEntry.accommodationAllowance} onChange={e => setNewHistEntry(p => ({ ...p, accommodationAllowance: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Food Allow.</label>
                    <input className="form-input" type="number" placeholder={form.foodAllowance || "0"} value={newHistEntry.foodAllowance} onChange={e => setNewHistEntry(p => ({ ...p, foodAllowance: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Allow.</label>
                    <input className="form-input" type="number" placeholder={form.phoneAllowance || "0"} value={newHistEntry.phoneAllowance} onChange={e => setNewHistEntry(p => ({ ...p, phoneAllowance: e.target.value }))} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>Leave blank fields to copy current salary values.</div>
                <button className="btn btn-primary btn-sm" onClick={addHistEntry}>Save Entry</button>
              </div>
            )}

            {/* History list */}
            {(form.salaryHistory || []).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)", padding: "10px 0" }}>No salary history. Current salary fields are used for all payroll calculations.</div>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface3)" }}>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}>Effective</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}>Basic</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}>Att.</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}>Accom.</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}>Food</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}>Phone</th>
                      <th style={{ padding: "7px 4px", textAlign: "center", fontWeight: 700, color: "var(--text3)", fontSize: 11 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.salaryHistory || []).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)).map((h, i) => (
                      <tr key={h.effectiveDate} style={{ borderTop: "1px solid var(--border)", background: i === 0 ? "rgba(59,130,246,0.06)" : "transparent" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: i === 0 ? "var(--accent)" : "var(--text)" }}>{h.effectiveDate}{i === 0 && <span style={{ fontSize: 9, marginLeft: 4, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>latest</span>}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--mono)" }}>{h.basicSalary}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--mono)" }}>{h.attendanceAllowance}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--mono)" }}>{h.accommodationAllowance}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--mono)" }}>{h.foodAllowance}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--mono)" }}>{h.phoneAllowance}</td>
                        <td style={{ padding: "7px 6px", textAlign: "center" }}>
                          <button onClick={() => removeHistEntry(h.effectiveDate)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 13 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
              💡 Payroll uses the salary entry whose effective date is on or before the month being calculated. Add a new entry when a salary increment takes effect.
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!form.name || !form.empId) return alert("Name and ID are required");
            onSave({ ...form, id: emp?.id || genId() });
          }}>Save Employee</button>
        </div>
      </div>
    </div>
  );
}

export function QuickStatusModal({ emp, onSave, onClose }) {
  const [newStatus, setNewStatus] = useState(emp.empStatus || "active");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(emp.statusNote || "");

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Change Status — {emp.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {Object.entries(EMP_STATUS_META).map(([k, v]) => (
              <div key={k} onClick={() => setNewStatus(k)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${newStatus === k ? v.color : "var(--border)"}`,
                  background: newStatus === k ? `${v.color}18` : "var(--surface2)", transition: "all 0.12s" }}>
                <span style={{ fontSize: 20 }}>{v.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: newStatus === k ? v.color : "var(--text)", fontSize: 14 }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {k === "active" && "Employee is working normally"}
                    {k === "leave" && "Temporary leave — will return"}
                    {k === "fled" && "Employee has absconded / run away"}
                    {k === "resigned" && "Employee has formally resigned"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Effective Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Expected back 1 May, Resigned via email..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(newStatus, date, note)}>Save Status</button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage({ employees, setEmployees, toast, user, attendance, rosters, ot, sites, deductions }) {
  const isManager = user?.role === "manager";
  const [selectedEmp, setSelectedEmp] = useState(null); // employee obj | null
  const [modal, setModal]             = useState(null);  // "new" | null (add only)
  const [filter, setFilter]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // If a profile is open, render it instead of the list
  if (selectedEmp) {
    const liveEmp = employees.find(e => e.id === selectedEmp.id) || selectedEmp;
    return (
      <EmployeeProfile
        emp={liveEmp}
        user={user}
        attendance={attendance}
        rosters={rosters}
        ot={ot}
        sites={sites}
        deductions={deductions}
        onSave={updated => {
          setEmployees(p => p.map(e => e.id === updated.id ? updated : e));
          setSelectedEmp(updated);
          toast("Employee updated", "success");
        }}
        onBack={() => setSelectedEmp(null)}
      />
    );
  }

  // ── Employee list ──
  const filtered = employees.filter(e => {
    const matchText = e.name.toLowerCase().includes(filter.toLowerCase()) || e.empId.toLowerCase().includes(filter.toLowerCase());
    const matchStatus = statusFilter === "all" || (e.empStatus || "active") === statusFilter;
    return matchText && matchStatus;
  });

  const counts = { all: employees.length };
  Object.keys(EMP_STATUS_META).forEach(s => {
    counts[s] = employees.filter(e => (e.empStatus || "active") === s).length;
  });

  return (
    <div>
      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All", "badge-blue"], ...Object.entries(EMP_STATUS_META).map(([k,v]) => [k, v.label, v.badge])].map(([k, label]) => (
          <div key={k} onClick={() => setStatusFilter(k)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: statusFilter === k ? "rgba(59,130,246,0.15)" : "var(--surface2)",
              border: `1px solid ${statusFilter === k ? "#3b82f6" : "var(--border)"}`,
              color: statusFilter === k ? "#3b82f6" : "var(--text3)", transition: "all 0.12s" }}>
            {label} <span style={{ background: "var(--surface3)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{counts[k] || 0}</span>
          </div>
        ))}
      </div>

      <div className="flex-between mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input className="form-input" style={{ width: 240 }} placeholder="Search name / ID..." value={filter} onChange={e => setFilter(e.target.value)} />
          {!isManager && <span className="badge badge-blue" style={{ fontSize: 11 }}>👁 View Only</span>}
        </div>
        {isManager && <button className="btn btn-primary" onClick={() => setModal("new")}>+ Add Employee</button>}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emp ID</th><th>Name</th><th>Designation</th><th>Phone</th>
                {isManager && <th>Basic Salary</th>}
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isManager ? 7 : 6}><div className="empty-state"><div className="icon">👷</div><p>No employees found</p></div></td></tr>
              ) : filtered.map(e => {
                const st = e.empStatus || "active";
                const meta = EMP_STATUS_META[st] || EMP_STATUS_META.active;
                return (
                  <tr key={e.id} style={{ cursor: isManager ? "pointer" : "default" }}
                    onClick={() => isManager && setSelectedEmp(e)}
                    onMouseEnter={ev => { if (isManager) ev.currentTarget.style.background = "rgba(59,130,246,0.05)"; }}
                    onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                    <td className="text-mono" style={{ color: "var(--accent)" }}>{e.empId}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Mini avatar */}
                        <div style={{ width:30, height:30, borderRadius:"50%", background:`${meta.color}22`, color:meta.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>
                          {(e.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{e.name}</div>
                          {e.nationality && <div style={{ fontSize:10, color:"var(--text3)" }}>{e.nationality}{e.isExpat ? " · 🌍 Expat" : ""}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{e.designation || "—"}</td>
                    <td>{e.phone || "—"}</td>
                    {isManager && <td className="text-mono">{mvr(e.basicSalary)}</td>}
                    <td>
                      <span className={`badge ${meta.badge}`}>{meta.icon} {meta.label}</span>
                      {e.statusDate && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>Since {e.statusDate}</div>}
                    </td>
                    <td style={{ color: "var(--text3)", fontSize: 18 }}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee modal — creation only */}
      {modal === "new" && isManager && (
        <EmployeeModal
          emp={null}
          onSave={emp => {
            setEmployees(p => [...p, emp]);
            toast("Employee added", "success");
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
