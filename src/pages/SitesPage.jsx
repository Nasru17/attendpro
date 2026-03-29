import { useState } from "react";
import { genId } from "../utils/helpers";

const STATUS_META = {
  "site-prep":  { label: "Site Prep",  badge: "badge-blue",   color: "#3b82f6" },
  "active":     { label: "Active",     badge: "badge-green",  color: "#10b981" },
  "onhold":     { label: "On Hold",    badge: "badge-yellow", color: "#f59e0b" },
  "retention":  { label: "Retention",  badge: "badge-purple", color: "#8b5cf6" },
  "completed":  { label: "Completed",  badge: "badge-gray",   color: "#94a3b8" },
};

const EMPTY_FORM = { name: "", location: "", companyId: "", status: "active" };

export default function SitesPage({ sites, setSites, toast, companies = [] }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [filter,  setFilter]  = useState("all");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); };

  const save = () => {
    if (!form.name.trim()) return toast("Site name required", "error");
    if (editing) {
      setSites(p => p.map(s => s.id === editing ? { ...s, ...form } : s));
      toast("Site updated", "success");
    } else {
      setSites(p => [...p, { id: genId(), ...form }]);
      toast("Site added", "success");
    }
    resetForm();
  };

  const startEdit = (s) => {
    setEditing(s.id);
    setForm({
      name:      s.name       || "",
      location:  s.location   || "",
      companyId: s.companyId  || "",
      status:    s.status     || "active",
    });
  };

  const deleteSite = (id) => {
    setSites(p => p.filter(s => s.id !== id));
    toast("Site deleted", "success");
  };

  const getCompanyName = (cid) => companies.find(c => c.id === cid)?.name || null;

  const filtered = filter === "all"
    ? sites
    : sites.filter(s => (s.status || "active") === filter);

  return (
    <div>
      {/* Add / Edit form */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">{editing ? "✏️ Edit Site" : "➕ Add Work Site"}</div>
        </div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Site Name *</label>
              <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Site A - Malé" />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Notes</label>
              <input className="form-input" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Address or description" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <select className="form-select" value={form.companyId} onChange={e => set("companyId", e.target.value)}>
                <option value="">— Unassigned —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {companies.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                  Add companies in the Permits module to assign sites.
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Project Status</label>
              <select className="form-select" value={form.status} onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 gap-2">
            <button className="btn btn-primary" onClick={save}>{editing ? "Update Site" : "Add Site"}</button>
            {editing && <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </div>
      </div>

      {/* Header + filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>{filtered.length} of {sites.length} site{sites.length !== 1 ? "s" : ""}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["all", "All"], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? "btn-primary" : "btn-ghost"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Site Name</th><th>Location</th><th>Company</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="icon">🏗️</div><p>No sites found</p></div></td></tr>
              ) : filtered.map(s => {
                const meta   = STATUS_META[s.status || "active"] || STATUS_META.active;
                const coName = s.companyId ? getCompanyName(s.companyId) : null;
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: "var(--text2)" }}>{s.location || "—"}</td>
                    <td>
                      {coName
                        ? <span className="badge badge-blue" style={{ fontSize: 11 }}>🏢 {coName}</span>
                        : <span style={{ color: "var(--text3)", fontSize: 12 }}>Unassigned</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </td>
                    <td>
                      <div className="gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSite(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
