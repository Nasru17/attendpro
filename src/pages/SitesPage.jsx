import { useState } from "react";
import { genId } from "../utils/helpers";

export default function SitesPage({ sites, setSites, toast, companies = [] }) {
  const [name,      setName]      = useState("");
  const [location,  setLocation]  = useState("");
  const [companyId, setCompanyId] = useState("");
  const [editing,   setEditing]   = useState(null);

  const resetForm = () => { setName(""); setLocation(""); setCompanyId(""); setEditing(null); };

  const addSite = () => {
    if (!name.trim()) return toast("Site name required", "error");
    if (editing) {
      setSites(p => p.map(s => s.id === editing ? { ...s, name, location, companyId } : s));
      toast("Site updated", "success");
    } else {
      setSites(p => [...p, { id: genId(), name, location, companyId }]);
      toast("Site added", "success");
    }
    resetForm();
  };

  const startEdit = (s) => {
    setEditing(s.id);
    setName(s.name);
    setLocation(s.location || "");
    setCompanyId(s.companyId || "");
  };

  const getCompanyName = (cid) => companies.find(c => c.id === cid)?.name || null;

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header"><div className="card-title">{editing ? "Edit Site" : "Add Work Site"}</div></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Site Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Site A - Malé" />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Notes</label>
              <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Address or description" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <select className="form-select" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                <option value="">— Unassigned —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {companies.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                  Add companies in the Permits module to assign sites to a company.
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 gap-2">
            <button className="btn btn-primary" onClick={addSite}>{editing ? "Update" : "Add Site"}</button>
            {editing && <button className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Sites ({sites.length})</div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Site Name</th><th>Location</th><th>Company</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><div className="icon">🏗️</div><p>No sites added</p></div></td></tr>
              ) : sites.map(s => {
                const coName = s.companyId ? getCompanyName(s.companyId) : null;
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.location || "—"}</td>
                    <td>
                      {coName
                        ? <span className="badge badge-blue" style={{ fontSize: 11 }}>🏢 {coName}</span>
                        : <span style={{ color: "var(--text3)", fontSize: 12 }}>Unassigned</span>
                      }
                    </td>
                    <td>
                      <div className="gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setSites(p => p.filter(x => x.id !== s.id)); toast("Site deleted", "success"); }}>Delete</button>
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
