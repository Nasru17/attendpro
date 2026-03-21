import { useState } from "react";
import { genId } from "../utils/helpers";

const EMPTY_REQ = {
  designation: "",
  workType: "",
  basicSalary: "",
  basicCurrency: "MVR",
  attendanceSalary: "",
  attendanceCurrency: "MVR",
  foodAllowance: "",
  workplace: "",
  jobDescription: "",
  workingHours: "",
  workStatus: "permanent",
  contractDuration: "",
};

// ── Inline requirement form ───────────────────────────────────
function ReqForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_REQ, ...initial });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.designation.trim()) { alert("Designation is required."); return; }
    onSave(form);
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div className="card-title">{initial?.id ? "✏️ Edit Requirement" : "➕ Add Requirement"}</div>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕ Cancel</button>
      </div>
      <div className="card-body">
        <div className="form-grid form-grid-2" style={{ marginBottom: 14 }}>

          <div className="form-group">
            <label className="form-label">Designation *</label>
            <input className="form-input" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Civil Engineer" />
          </div>

          <div className="form-group">
            <label className="form-label">Work Type</label>
            <input className="form-input" value={form.workType} onChange={e => set("workType", e.target.value)} placeholder="e.g. Full-time, Part-time" />
          </div>

          {/* Basic Salary with currency */}
          <div className="form-group">
            <label className="form-label">Basic Salary</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" type="number" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} placeholder="0.00" style={{ flex: 1 }} />
              <select className="form-input" value={form.basicCurrency} onChange={e => set("basicCurrency", e.target.value)} style={{ width: 80 }}>
                <option value="MVR">MVR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Attendance Salary with currency */}
          <div className="form-group">
            <label className="form-label">Attendance Allowance</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" type="number" value={form.attendanceSalary} onChange={e => set("attendanceSalary", e.target.value)} placeholder="0.00" style={{ flex: 1 }} />
              <select className="form-input" value={form.attendanceCurrency} onChange={e => set("attendanceCurrency", e.target.value)} style={{ width: 80 }}>
                <option value="MVR">MVR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Food Allowance (MVR)</label>
            <input className="form-input" type="number" value={form.foodAllowance} onChange={e => set("foodAllowance", e.target.value)} placeholder="0.00" />
          </div>

          <div className="form-group">
            <label className="form-label">Workplace</label>
            <input className="form-input" value={form.workplace} onChange={e => set("workplace", e.target.value)} placeholder="e.g. Malé, Construction Site A" />
          </div>

          <div className="form-group">
            <label className="form-label">Working Hours</label>
            <input className="form-input" value={form.workingHours} onChange={e => set("workingHours", e.target.value)} placeholder="e.g. 8 hours/day, 6 days/week" />
          </div>

          <div className="form-group">
            <label className="form-label">Contract Type</label>
            <select className="form-input" value={form.workStatus} onChange={e => set("workStatus", e.target.value)}>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          {form.workStatus === "contract" && (
            <div className="form-group">
              <label className="form-label">Contract Duration</label>
              <input className="form-input" value={form.contractDuration} onChange={e => set("contractDuration", e.target.value)} placeholder="e.g. 1 year, 6 months" />
            </div>
          )}

          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Job Description</label>
            <textarea
              className="form-input"
              rows={4}
              value={form.jobDescription}
              onChange={e => set("jobDescription", e.target.value)}
              placeholder="Describe the job role, responsibilities, and requirements…"
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>Save Requirement</button>
      </div>
    </div>
  );
}

// ── Requirement card ──────────────────────────────────────────
function ReqCard({ req, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ borderLeft: "4px solid #8b5cf6", marginBottom: 12 }}>
      <div className="card-body" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{req.designation}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {req.workType && <span className="badge badge-gray">{req.workType}</span>}
              <span className={`badge ${req.workStatus === "permanent" ? "badge-green" : "badge-yellow"}`}>
                {req.workStatus === "permanent" ? "Permanent" : `Contract${req.contractDuration ? ` — ${req.contractDuration}` : ""}`}
              </span>
              {req.workplace && (
                <span style={{ fontSize: 11, color: "var(--text3)" }}>📍 {req.workplace}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text2)", flexWrap: "wrap" }}>
              {req.basicSalary && (
                <span>💰 Basic: <strong>{req.basicSalary} {req.basicCurrency}</strong></span>
              )}
              {req.attendanceSalary && (
                <span>✓ Attendance: <strong>{req.attendanceSalary} {req.attendanceCurrency}</strong></span>
              )}
              {req.foodAllowance && (
                <span>🍽 Food: <strong>MVR {req.foodAllowance}</strong></span>
              )}
              {req.workingHours && (
                <span>⏰ {req.workingHours}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(p => !p)}>
              {expanded ? "▲ Less" : "▼ More"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(req)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(req.id)}>Delete</button>
          </div>
        </div>

        {expanded && req.jobDescription && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--text2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {req.jobDescription}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// REQUIREMENTS PAGE
// ════════════════════════════════════════════════════════════════
export default function RequirementsPage({ requirements, setRequirements, toast }) {
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null); // req being edited

  const saveReq = (form) => {
    if (editItem?.id) {
      setRequirements(p => p.map(r => r.id === editItem.id ? { ...r, ...form } : r));
      toast("Requirement updated", "success");
      setEditItem(null);
    } else {
      setRequirements(p => [...p, { id: genId(), createdAt: new Date().toISOString().slice(0, 10), ...form }]);
      toast("Requirement added", "success");
      setShowForm(false);
    }
  };

  const deleteReq = (id) => {
    if (!window.confirm("Delete this requirement?")) return;
    setRequirements(p => p.filter(r => r.id !== id));
    toast("Requirement deleted", "success");
  };

  const startEdit = (req) => {
    setShowForm(false);
    setEditItem(req);
  };

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>📋 Job Requirements</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {requirements.length} requirement{requirements.length !== 1 ? "s" : ""} defined
          </div>
        </div>
        {!showForm && !editItem && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Requirement</button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <ReqForm
          initial={{}}
          onSave={saveReq}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form */}
      {editItem && (
        <ReqForm
          initial={editItem}
          onSave={saveReq}
          onCancel={() => setEditItem(null)}
        />
      )}

      {/* List */}
      {requirements.length === 0 ? (
        <div className="empty-state" style={{ padding: "60px 20px" }}>
          <div className="icon">📋</div>
          <p>No job requirements defined.</p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Add a requirement to start accepting applicants.</p>
        </div>
      ) : (
        <div>
          {requirements.map(req => (
            editItem?.id === req.id ? null : (
              <ReqCard key={req.id} req={req} onEdit={startEdit} onDelete={deleteReq} />
            )
          ))}
        </div>
      )}
    </div>
  );
}
