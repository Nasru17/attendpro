import { useState } from "react";
import { genId } from "../utils/helpers";

const EMPTY_QUOTA = {
  companyId: "",
  siteId: "",
  quotaNumber: "",
  feePaid: "",
  expiryDate: "",
  quotaDesignation: "",
  status: "available",
  assignedEmployeeId: null,
  assignedCandidateId: null,
};

// ── Assign employee modal ─────────────────────────────────────
function AssignModal({ quota, employees, quotas, onAssign, onClose }) {
  const [search, setSearch] = useState("");

  // Only expat employees without a quota already
  const assignedEmpIds = new Set(
    quotas.filter(q => q.assignedEmployeeId).map(q => q.assignedEmployeeId)
  );
  const eligible = employees.filter(
    emp =>
      emp.isExpat === true &&
      !assignedEmpIds.has(emp.id) &&
      (emp.empStatus === "active" || !emp.empStatus) &&
      (
        !search.trim() ||
        (emp.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (emp.empId || "").toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div className="card-header">
          <div className="card-title">Assign EMS Employee — Quota #{quota.quotaNumber}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="card-body" style={{ flex: 1, overflow: "auto" }}>
          <input
            className="form-input"
            placeholder="Search by name or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {eligible.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👤</div>
              <p>No eligible expat employees found.</p>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>
                Employees must be marked as Expat and not already have a quota assigned.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {eligible.map(emp => (
                <div key={emp.id}
                  className="card"
                  style={{ cursor: "pointer", padding: "12px 16px", borderLeft: "3px solid #3b82f6" }}
                  onClick={() => onAssign(emp.id)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{emp.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {emp.empId && <span>ID: {emp.empId} · </span>}
                    {emp.designation && <span>{emp.designation} · </span>}
                    <span style={{ color: "#3b82f6" }}>Expat</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// QUOTA PAGE
// ════════════════════════════════════════════════════════════════
export default function QuotaPage({ quotas, setQuotas, companies, sites, employees, toast }) {
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState({ ...EMPTY_QUOTA });
  const [filterCompany,  setFilterCompany]  = useState("");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [assignTarget,   setAssignTarget]   = useState(null); // quota being assigned

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Sites filtered to selected company
  const filteredSites = form.companyId
    ? sites.filter(s => s.companyId === form.companyId)
    : sites;

  const saveQuota = () => {
    if (!form.quotaNumber.trim()) { toast("Quota number is required", "error"); return; }
    if (!form.companyId)          { toast("Company is required", "error"); return; }
    const newQuota = { id: genId(), ...form };
    setQuotas(p => [...p, newQuota]);
    toast("Quota added", "success");
    setShowForm(false);
    setForm({ ...EMPTY_QUOTA });
  };

  const deleteQuota = (quota) => {
    if (quota.status !== "available") { toast("Can only delete available quotas", "error"); return; }
    if (!window.confirm(`Delete quota #${quota.quotaNumber}?`)) return;
    setQuotas(p => p.filter(q => q.id !== quota.id));
    toast("Quota deleted", "success");
  };

  const assignEmployee = (employeeId) => {
    setQuotas(p => p.map(q =>
      q.id === assignTarget.id
        ? { ...q, status: "assigned", assignedEmployeeId: employeeId }
        : q
    ));
    toast("Employee assigned to quota", "success");
    setAssignTarget(null);
  };

  const unassignEmployee = (quota) => {
    if (!window.confirm("Unassign employee from this quota?")) return;
    setQuotas(p => p.map(q =>
      q.id === quota.id
        ? { ...q, status: "available", assignedEmployeeId: null }
        : q
    ));
    toast("Employee unassigned", "success");
  };

  // Helpers to get names
  const companyName = (id) => companies.find(c => c.id === id)?.name || id || "—";
  const siteName    = (id) => sites.find(s => s.id === id)?.name || "—";
  const empName     = (id) => employees.find(e => e.id === id)?.name || id || "—";

  // Filtered list
  const visible = quotas.filter(q => {
    if (filterCompany && q.companyId !== filterCompany) return false;
    if (filterStatus !== "all" && q.status !== filterStatus) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>🎯 Quota Management</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {quotas.length} quota{quotas.length !== 1 ? "s" : ""} total ·{" "}
            {quotas.filter(q => q.status === "available").length} available
          </div>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Quota</button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">➕ Add New Quota</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setForm({ ...EMPTY_QUOTA }); }}>✕ Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-grid form-grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Company *</label>
                <select className="form-input" value={form.companyId} onChange={e => set("companyId", e.target.value)}>
                  <option value="">— Select Company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Site</label>
                <select className="form-input" value={form.siteId} onChange={e => set("siteId", e.target.value)}>
                  <option value="">— Any Site —</option>
                  {filteredSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quota Number *</label>
                <input className="form-input" value={form.quotaNumber} onChange={e => set("quotaNumber", e.target.value)} placeholder="e.g. QT-2024-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Fee Paid (MVR)</label>
                <input className="form-input" type="number" value={form.feePaid} onChange={e => set("feePaid", e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-input" type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Quota Designation</label>
                <input className="form-input" value={form.quotaDesignation} onChange={e => set("quotaDesignation", e.target.value)} placeholder="e.g. Construction Worker" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveQuota}>Save Quota</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="form-input" style={{ width: "auto", minWidth: 160 }} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-input" style={{ width: "auto", minWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
        </select>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="empty-state" style={{ padding: "60px 20px" }}>
          <div className="icon">🎯</div>
          <p>No quotas found.</p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Add a quota to get started.</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Quota No.", "Company", "Site", "Designation", "Fee Paid", "Expiry", "Status", "Assigned To", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text3)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((q, i) => (
                  <tr key={q.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 1 ? "var(--surface2)" : "transparent" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "var(--mono)" }}>{q.quotaNumber}</td>
                    <td style={{ padding: "10px 14px" }}>{companyName(q.companyId)}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text3)" }}>{q.siteId ? siteName(q.siteId) : "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{q.quotaDesignation || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{q.feePaid ? `MVR ${Number(q.feePaid).toLocaleString()}` : "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text3)" }}>{q.expiryDate || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`badge ${q.status === "available" ? "badge-green" : "badge-yellow"}`}>
                        {q.status === "available" ? "Available" : "Assigned"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text2)" }}>
                      {q.assignedEmployeeId ? empName(q.assignedEmployeeId) : q.assignedCandidateId ? "Candidate" : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {q.status === "available" && (
                          <button className="btn btn-primary btn-sm" onClick={() => setAssignTarget(q)}>
                            Assign Employee
                          </button>
                        )}
                        {q.status === "assigned" && q.assignedEmployeeId && (
                          <button className="btn btn-ghost btn-sm" onClick={() => unassignEmployee(q)}>
                            Unassign
                          </button>
                        )}
                        {q.status === "available" && (
                          <button className="btn btn-danger btn-sm" onClick={() => deleteQuota(q)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          quota={assignTarget}
          employees={employees}
          quotas={quotas}
          onAssign={assignEmployee}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
