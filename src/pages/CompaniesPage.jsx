import { useState } from "react";
import { genId } from "../utils/helpers";

const TABS_PROFILE = ["Details", "Document Templates"];

const EMPTY_COMPANY = {
  name: "", registrationNo: "", gstNo: "",
  phone: "", email: "", website: "",
  address: "", city: "", country: "Maldives",
  headerText: "", footerText: "",
};

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

// ── Inline field ──────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════
// COMPANY PROFILE
// ════════════════════════════════════════════════════════════════
function CompanyProfile({ company, onSave, onBack }) {
  const [tab, setTab]         = useState("Details");
  const [form, setForm]       = useState({ ...company });
  const [editing, setEditing] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const saveSection = () => { onSave({ ...form }); setEditing(null); };
  const cancelEdit  = () => { setForm({ ...company }); setEditing(null); };

  const initials = (name) =>
    (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>
        ← All Companies
      </button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 14, flexShrink: 0,
              background: "#3b82f618", color: "#3b82f6",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, border: "2px solid #3b82f644",
            }}>{initials(company.name)}</div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{company.name}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
                {company.registrationNo && <span>Reg: <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{company.registrationNo}</span></span>}
                {company.gstNo          && <span>GST: <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{company.gstNo}</span></span>}
                {company.city           && <span>📍 {company.city}{company.country ? `, ${company.country}` : ""}</span>}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {company.phone   && <span style={{ fontSize: 12, color: "var(--text3)" }}>📞 {company.phone}</span>}
                {company.email   && <span style={{ fontSize: 12, color: "var(--text3)" }}>✉ {company.email}</span>}
                {company.website && <span style={{ fontSize: 12, color: "var(--text3)" }}>🌐 {company.website}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, overflowX: "auto", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS_PROFILE.map(t => (
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

      {/* ── DETAILS TAB ── */}
      {tab === "Details" && (
        <div>
          {/* General */}
          <Section title="🏢 Company Information"
            action={editing === "general"
              ? <div className="gap-2">
                  <button className="btn btn-primary btn-sm" onClick={saveSection}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("general")}>Edit</button>
            }>
            <div className="form-grid form-grid-2">
              <Field label="Company Name *" value={form.name} editing={editing === "general"}>
                <input className="form-input" value={form.name||""} onChange={e => set("name", e.target.value)} placeholder="e.g. Alitho Construction Pvt Ltd" />
              </Field>
              <Field label="Registration Number" value={form.registrationNo} editing={editing === "general"}>
                <input className="form-input" value={form.registrationNo||""} onChange={e => set("registrationNo", e.target.value)} placeholder="Company registration no." />
              </Field>
              <Field label="GST Number" value={form.gstNo} editing={editing === "general"}>
                <input className="form-input" value={form.gstNo||""} onChange={e => set("gstNo", e.target.value)} placeholder="GST / VAT registration no." />
              </Field>
              <Field label="Website" value={form.website} editing={editing === "general"}>
                <input className="form-input" value={form.website||""} onChange={e => set("website", e.target.value)} placeholder="www.example.com" />
              </Field>
            </div>
          </Section>

          {/* Contact */}
          <Section title="📞 Contact Details"
            action={editing === "contact"
              ? <div className="gap-2">
                  <button className="btn btn-primary btn-sm" onClick={saveSection}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("contact")}>Edit</button>
            }>
            <div className="form-grid form-grid-2">
              <Field label="Phone" value={form.phone} editing={editing === "contact"}>
                <input className="form-input" value={form.phone||""} onChange={e => set("phone", e.target.value)} placeholder="+960 xxx xxxx" />
              </Field>
              <Field label="Email" value={form.email} editing={editing === "contact"}>
                <input className="form-input" type="email" value={form.email||""} onChange={e => set("email", e.target.value)} placeholder="info@company.com" />
              </Field>
            </div>
          </Section>

          {/* Address */}
          <Section title="📍 Address"
            action={editing === "address"
              ? <div className="gap-2">
                  <button className="btn btn-primary btn-sm" onClick={saveSection}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("address")}>Edit</button>
            }>
            <div className="form-grid form-grid-2">
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Street Address</label>
                {editing === "address"
                  ? <input className="form-input" value={form.address||""} onChange={e => set("address", e.target.value)} placeholder="Street / building / floor" />
                  : <div style={{ padding: "9px 0", fontSize: 13, color: form.address ? "var(--text)" : "var(--text3)" }}>{form.address || "—"}</div>
                }
              </div>
              <Field label="City / Atoll" value={form.city} editing={editing === "address"}>
                <input className="form-input" value={form.city||""} onChange={e => set("city", e.target.value)} placeholder="e.g. Malé" />
              </Field>
              <Field label="Country" value={form.country} editing={editing === "address"}>
                <input className="form-input" value={form.country||""} onChange={e => set("country", e.target.value)} placeholder="e.g. Maldives" />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── DOCUMENT TEMPLATES TAB ── */}
      {tab === "Document Templates" && (
        <div>
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            💡 These templates are used when generating <strong>offer letters, experience letters,</strong> and other company documents. Write the header and footer text exactly as it should appear — include company name, address, and any branding text.
          </div>

          {/* Header */}
          <Section title="📄 Document Header"
            action={editing === "header"
              ? <div className="gap-2">
                  <button className="btn btn-primary btn-sm" onClick={saveSection}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("header")}>Edit</button>
            }>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
              Appears at the <strong>top</strong> of every generated document. Include company name, address, registration number, and contact info.
            </div>
            {editing === "header" ? (
              <textarea
                className="form-input"
                rows={6}
                value={form.headerText||""}
                onChange={e => set("headerText", e.target.value)}
                placeholder={`Example:\n${company.name || "Company Name"}\nRegistration No: ${company.registrationNo || "XXXXXX"}\n${company.address || "Address line"}, ${company.city || "City"}, ${company.country || "Maldives"}\nTel: ${company.phone || "+960 xxx xxxx"} | Email: ${company.email || "info@company.com"}`}
                style={{ fontFamily: "var(--mono)", fontSize: 12, resize: "vertical" }}
              />
            ) : (
              <div style={{
                background: "var(--surface2)", borderRadius: 8, padding: "14px 16px",
                fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", lineHeight: 1.7,
                whiteSpace: "pre-wrap", minHeight: 80, border: "1px solid var(--border)"
              }}>
                {form.headerText || <span style={{ color: "var(--text3)" }}>No header template set. Click Edit to add one.</span>}
              </div>
            )}
          </Section>

          {/* Footer */}
          <Section title="📋 Document Footer"
            action={editing === "footer"
              ? <div className="gap-2">
                  <button className="btn btn-primary btn-sm" onClick={saveSection}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setEditing("footer")}>Edit</button>
            }>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
              Appears at the <strong>bottom</strong> of every generated document. Include authorised signatory name/title, signature placeholder, and any disclaimers.
            </div>
            {editing === "footer" ? (
              <textarea
                className="form-input"
                rows={6}
                value={form.footerText||""}
                onChange={e => set("footerText", e.target.value)}
                placeholder={`Example:\nAuthorised by,\n\n_______________________\n[Name]\nHR Manager / Director\n${company.name || "Company Name"}`}
                style={{ fontFamily: "var(--mono)", fontSize: 12, resize: "vertical" }}
              />
            ) : (
              <div style={{
                background: "var(--surface2)", borderRadius: 8, padding: "14px 16px",
                fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", lineHeight: 1.7,
                whiteSpace: "pre-wrap", minHeight: 80, border: "1px solid var(--border)"
              }}>
                {form.footerText || <span style={{ color: "var(--text3)" }}>No footer template set. Click Edit to add one.</span>}
              </div>
            )}
          </Section>

          {/* Preview */}
          {(company.headerText || company.footerText) && (
            <Section title="👁 Document Preview">
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ background: "var(--surface2)", padding: "16px 20px", borderBottom: "2px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Header</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {company.headerText || <span style={{ color: "var(--text3)" }}>—</span>}
                  </div>
                </div>
                {/* Document body placeholder */}
                <div style={{ padding: "20px", background: "var(--surface3)" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic", textAlign: "center" }}>
                    [ Document content — offer letter body, experience letter body, etc. ]
                  </div>
                </div>
                {/* Footer */}
                <div style={{ background: "var(--surface2)", padding: "16px 20px", borderTop: "2px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Footer</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {company.footerText || <span style={{ color: "var(--text3)" }}>—</span>}
                  </div>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPANIES PAGE (list)
// ════════════════════════════════════════════════════════════════
export default function CompaniesPage({ companies, setCompanies, toast }) {
  const [selected, setSelected]   = useState(null);
  const [showAdd,  setShowAdd]    = useState(false);
  const [addForm,  setAddForm]    = useState({ ...EMPTY_COMPANY });
  const [addErr,   setAddErr]     = useState("");

  // When a company is selected, show its profile
  if (selected) {
    return (
      <CompanyProfile
        company={selected}
        onSave={updated => {
          setCompanies(p => p.map(c => c.id === updated.id ? updated : c));
          setSelected(updated);
          toast("Company updated", "success");
        }}
        onBack={() => setSelected(null)}
      />
    );
  }

  const addCompany = () => {
    if (!addForm.name.trim()) { setAddErr("Company name is required."); return; }
    const newCo = { id: genId(), ...addForm };
    setCompanies(p => [...p, newCo]);
    toast("Company added", "success");
    setShowAdd(false);
    setAddForm({ ...EMPTY_COMPANY });
    setAddErr("");
  };

  const deleteCompany = (id) => {
    setCompanies(p => p.filter(c => c.id !== id));
    toast("Company removed", "success");
  };

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Add Company form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">➕ Add New Company</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setAddErr(""); setAddForm({ ...EMPTY_COMPANY }); }}>✕ Cancel</button>
          </div>
          <div className="card-body">
            {addErr && <div className="alert alert-danger" style={{ marginBottom: 12 }}><span>⚠</span><div>{addErr}</div></div>}
            <div className="form-grid form-grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Company Name *</label>
                <input className="form-input" value={addForm.name} onChange={e => setAddForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Alitho Construction Pvt Ltd" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input className="form-input" value={addForm.registrationNo} onChange={e => setAddForm(p => ({...p, registrationNo: e.target.value}))} placeholder="Company registration no." />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-input" value={addForm.gstNo} onChange={e => setAddForm(p => ({...p, gstNo: e.target.value}))} placeholder="GST / VAT registration no." />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={addForm.phone} onChange={e => setAddForm(p => ({...p, phone: e.target.value}))} placeholder="+960 xxx xxxx" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={addForm.email} onChange={e => setAddForm(p => ({...p, email: e.target.value}))} placeholder="info@company.com" />
              </div>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={addForm.address} onChange={e => setAddForm(p => ({...p, address: e.target.value}))} placeholder="Street / building" />
              </div>
              <div className="form-group">
                <label className="form-label">City / Atoll</label>
                <input className="form-input" value={addForm.city} onChange={e => setAddForm(p => ({...p, city: e.target.value}))} placeholder="e.g. Malé" />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" value={addForm.country} onChange={e => setAddForm(p => ({...p, country: e.target.value}))} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addCompany}>Save Company</button>
          </div>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>🏢 Companies</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{companies.length} compan{companies.length !== 1 ? "ies" : "y"} registered</div>
        </div>
        {!showAdd && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Company</button>
        )}
      </div>

      {/* Company cards grid */}
      {companies.length === 0 ? (
        <div className="empty-state" style={{ padding: "60px 20px" }}>
          <div className="icon">🏢</div>
          <p>No companies added yet.</p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>Add a company to start managing permits, documents, and sites under it.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {companies.map(co => (
            <div key={co.id}
              className="card"
              style={{ cursor: "pointer", transition: "transform 0.13s, box-shadow 0.13s", overflow: "hidden", borderLeft: "4px solid #3b82f6" }}
              onClick={() => setSelected(co)}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.32)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div className="card-body" style={{ padding: "18px 20px" }}>
                {/* Avatar + name */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: "#3b82f618", color: "#3b82f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 800, border: "1.5px solid #3b82f633",
                  }}>
                    {(co.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{co.name}</div>
                    {co.registrationNo && (
                      <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>Reg: {co.registrationNo}</div>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
                  {co.gstNo    && <span>GST: <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{co.gstNo}</span></span>}
                  {co.phone    && <span>📞 {co.phone}</span>}
                  {co.email    && <span>✉ {co.email}</span>}
                  {(co.city || co.country) && <span>📍 {[co.city, co.country].filter(Boolean).join(", ")}</span>}
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {co.headerText && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Header</span>}
                  {co.footerText && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Footer</span>}
                  {!co.headerText && !co.footerText && <span className="badge badge-gray" style={{ fontSize: 10 }}>No templates</span>}
                </div>

                {/* Footer row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>View Profile →</div>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: 10, padding: "3px 10px" }}
                    onClick={e => { e.stopPropagation(); if (window.confirm(`Delete ${co.name}?`)) deleteCompany(co.id); }}
                  >Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
