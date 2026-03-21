import { useState, useMemo } from "react";
import { genId } from "../utils/helpers";

const LEAVE_TYPES = ["annual", "sick", "emergency", "other"];
const TYPE_LABEL  = { annual: "Annual", sick: "Sick", emergency: "Emergency", other: "Other" };
const TYPE_COLOR  = { annual: "#06b6d4", sick: "#8b5cf6", emergency: "#ef4444", other: "#94a3b8" };

function calcDays(start, end) {
  if (!start || !end) return 0;
  const d = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  return d > 0 ? d : 0;
}

function StatusBadge({ status }) {
  const map = {
    pending:  { cls: "badge-yellow", label: "Pending" },
    approved: { cls: "badge-green",  label: "Approved" },
    rejected: { cls: "badge-red",    label: "Rejected" },
  };
  const m = map[status] || map.pending;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export default function LeaveManagementPage({ leaves, setLeaves, employees, leaveTimetable, toast, user }) {
  const isManager = user?.role === "manager";
  const today = new Date().toISOString().slice(0, 10);

  // ── Filter state ──
  const [filterEmp,    setFilterEmp]    = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType,   setFilterType]   = useState("all");

  // ── Add form ──
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: "", leaveType: "annual", startDate: today, endDate: today, reason: "",
  });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const formDays = calcDays(form.startDate, form.endDate);

  // ── Expanded row ──
  const [expandedId, setExpandedId] = useState(null);

  // ── Return date inline ──
  const [returningId,   setReturningId]   = useState(null);
  const [returnDate,    setReturnDate]    = useState(today);

  // ── Inline reject note ──
  const [rejectingId,   setRejectingId]   = useState(null);
  const [rejectNote,    setRejectNote]    = useState("");

  // ── Filtered leaves ──
  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name)), [employees]);

  const filtered = useMemo(() => {
    return leaves.filter(l => {
      const matchEmp    = !filterEmp    || l.employeeId === filterEmp;
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      const matchType   = filterType   === "all" || l.leaveType === filterType;
      return matchEmp && matchStatus && matchType;
    }).sort((a, b) => b.requestedAt?.localeCompare(a.requestedAt || "") || 0);
  }, [leaves, filterEmp, filterStatus, filterType]);

  // ── Save new request ──
  const handleSave = () => {
    if (!form.employeeId) return toast("Please select an employee", "error");
    if (!form.startDate || !form.endDate) return toast("Start and end dates are required", "error");
    if (new Date(form.startDate) > new Date(form.endDate)) return toast("Start date must be before end date", "error");
    const emp = employees.find(e => e.id === form.employeeId);
    const newLeave = {
      id:           genId(),
      employeeId:   form.employeeId,
      employeeName: emp?.name || "",
      leaveType:    form.leaveType,
      startDate:    form.startDate,
      endDate:      form.endDate,
      days:         formDays,
      reason:       form.reason,
      status:       "pending",
      requestedAt:  today,
      requestedBy:  user?.name || "",
      reviewNote:   "",
      returnedAt:   null,
    };
    setLeaves(p => [...p, newLeave]);
    toast("Leave request submitted", "success");
    setShowForm(false);
    setForm({ employeeId: "", leaveType: "annual", startDate: today, endDate: today, reason: "" });
  };

  // ── Approve ──
  const handleApprove = (id) => {
    setLeaves(p => p.map(l => l.id === id ? { ...l, status: "approved" } : l));
    toast("Leave request approved", "success");
  };

  // ── Reject ──
  const handleReject = (id) => {
    setLeaves(p => p.map(l => l.id === id ? { ...l, status: "rejected", reviewNote: rejectNote } : l));
    toast("Leave request rejected", "info");
    setRejectingId(null);
    setRejectNote("");
  };

  // ── Mark returned ──
  const handleReturn = (id) => {
    setLeaves(p => p.map(l => l.id === id ? { ...l, returnedAt: returnDate } : l));
    toast("Return date recorded", "success");
    setReturningId(null);
    setReturnDate(today);
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>{filtered.length} request{filtered.length !== 1 ? "s" : ""} found</div>
        <button className="btn btn-primary" onClick={() => setShowForm(p => !p)}>
          {showForm ? "✕ Cancel" : "+ Request Leave"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">New Leave Request</div></div>
          <div className="card-body">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select className="form-select" value={form.employeeId} onChange={e => setF("employeeId", e.target.value)}>
                  <option value="">— Select Employee —</option>
                  {sortedEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={form.leaveType} onChange={e => setF("leaveType", e.target.value)}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="date" value={form.startDate} onChange={e => setF("startDate", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input className="form-input" type="date" value={form.endDate} onChange={e => setF("endDate", e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Reason</label>
                <textarea className="form-input" rows={3} value={form.reason} onChange={e => setF("reason", e.target.value)} placeholder="Optional reason for leave..." style={{ resize: "vertical" }} />
              </div>
            </div>
            {formDays > 0 && (
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 12 }}>
                Duration: {formDays} day{formDays !== 1 ? "s" : ""}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Submit Request</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="form-select" style={{ width: 200 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="">All Employees</option>
          {sortedEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {LEAVE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="icon">🏖</div>
                      <p>No leave requests found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(l => (
                <>
                  <tr
                    key={l.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <td style={{ fontWeight: 600 }}>{l.employeeName}</td>
                    <td>
                      <span style={{ color: TYPE_COLOR[l.leaveType], fontWeight: 700, fontSize: 12 }}>
                        {TYPE_LABEL[l.leaveType] || l.leaveType}
                      </span>
                    </td>
                    <td className="text-mono" style={{ fontSize: 12 }}>{l.startDate}</td>
                    <td className="text-mono" style={{ fontSize: 12 }}>{l.endDate}</td>
                    <td style={{ fontWeight: 700, color: "var(--text2)" }}>{l.days}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {l.status === "approved" && !l.returnedAt && (
                          returningId === l.id ? (
                            <>
                              <input
                                className="form-input"
                                type="date"
                                value={returnDate}
                                onChange={e => setReturnDate(e.target.value)}
                                style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => handleReturn(l.id)}>Confirm</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setReturningId(null)}>✕</button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setReturningId(l.id); setReturnDate(today); }}>
                              Mark Returned
                            </button>
                          )
                        )}
                        {l.status === "approved" && l.returnedAt && (
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>Returned {l.returnedAt}</span>
                        )}
                        {isManager && l.status === "pending" && (
                          rejectingId === l.id ? (
                            <>
                              <input
                                className="form-input"
                                placeholder="Rejection note..."
                                value={rejectNote}
                                onChange={e => setRejectNote(e.target.value)}
                                style={{ width: 180, padding: "4px 8px", fontSize: 12 }}
                              />
                              <button className="btn btn-danger btn-sm" onClick={() => handleReject(l.id)}>Confirm</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setRejectingId(null)}>✕</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-primary btn-sm" style={{ background: "#10b981", borderColor: "#10b981" }} onClick={() => handleApprove(l.id)}>✓</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setRejectingId(l.id); setRejectNote(""); }}>✗</button>
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === l.id && (
                    <tr key={`${l.id}-expanded`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div style={{ background: "var(--surface2)", padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", fontSize: 13 }}>
                            {l.reason && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Reason</div>
                                <div>{l.reason}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Requested By</div>
                              <div>{l.requestedBy || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Requested At</div>
                              <div className="text-mono" style={{ fontSize: 12 }}>{l.requestedAt || "—"}</div>
                            </div>
                            {l.reviewNote && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Review Note</div>
                                <div>{l.reviewNote}</div>
                              </div>
                            )}
                            {l.returnedAt && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Returned At</div>
                                <div className="text-mono" style={{ fontSize: 12 }}>{l.returnedAt}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
