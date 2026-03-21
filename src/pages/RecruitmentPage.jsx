import { useState, useRef } from "react";
import { genId } from "../utils/helpers";

// ── Today's date string ───────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  if (!d) return "—";
  return d;
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status, arrivalStatus }) {
  if (arrivalStatus === "arrived")   return <span className="badge badge-green">Arrived</span>;
  if (arrivalStatus === "cancelled") return <span className="badge badge-red">Cancelled</span>;
  if (status === "accepted")  return <span className="badge badge-green">Accepted</span>;
  if (status === "rejected")  return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-yellow">Pending</span>;
}

// ── File uploader helper ──────────────────────────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ name: file.name, data: e.target.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Single image upload ───────────────────────────────────────
function ImageUpload({ label, value, onChange }) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {value ? (
        <div>
          <img src={value} alt={label} style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 6, border: "1px solid var(--border)", objectFit: "contain", display: "block", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => ref.current.click()}>Replace</button>
            <button className="btn btn-danger btn-sm" onClick={() => onChange("")}>Remove</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => ref.current.click()}>Upload Image</button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

// ── Multi-file upload ─────────────────────────────────────────
function MultiFileUpload({ label, files, onAdd, onDelete }) {
  const ref = useRef();
  const handleFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    const results = await Promise.all(list.map(readFileAsBase64));
    onAdd(results);
    e.target.value = "";
  };
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {files.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 12, padding: "6px 10px", background: "var(--surface2)", borderRadius: 6 }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {f.name}</span>
              <a href={f.data} download={f.name} style={{ color: "var(--accent)", textDecoration: "none" }} target="_blank" rel="noreferrer">View</a>
              <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => onDelete(i)}>✕</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>No files uploaded</div>
      )}
      <button className="btn btn-ghost btn-sm" onClick={() => ref.current.click()}>+ Add Files</button>
      <input ref={ref} type="file" multiple style={{ display: "none" }} onChange={handleFiles} />
    </div>
  );
}

// ── Appointment letter generator ──────────────────────────────
function generateLetterHtml(applicant, req, company) {
  const todayStr = today();
  const headerImg = company?.headerImage
    ? `<img src="${company.headerImage}" alt="Header" style="width:100%;display:block;margin-bottom:24px;" />`
    : "";
  const footerImg = company?.footerImage
    ? `<img src="${company.footerImage}" alt="Footer" style="width:100%;display:block;margin-top:40px;" />`
    : "";

  const contractLine = req.workStatus === "contract" && req.contractDuration
    ? `${req.workStatus.toUpperCase()} (${req.contractDuration})`
    : req.workStatus
    ? req.workStatus.toUpperCase()
    : "";

  const jobDesc = (req.jobDescription || "").replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 0; }
  .letter-wrap { max-width: 800px; margin: 0 auto; padding: 40px; }
  h2 { text-align: center; text-decoration: underline; letter-spacing: 1px; margin: 24px 0; }
  p { margin: 8px 0; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 7px 12px; border: 1px solid #ccc; font-size: 14px; }
  td:first-child { font-weight: bold; width: 240px; }
  .date-line { text-align: right; margin-bottom: 24px; color: #444; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .letter-wrap { padding: 24px; }
  }
</style>
</head>
<body>
<div class="letter-wrap">
  ${headerImg}
  <div class="date-line">Date: ${todayStr}</div>
  <p>To,<br/><strong>${applicant.fullName}</strong></p>
  <p>Dear ${applicant.fullName},</p>
  <h2>LETTER OF APPOINTMENT</h2>
  <p>We are pleased to offer you the position of <strong>${req.designation || ""}</strong> with effect from ${todayStr}.</p>
  <p>Your terms of employment are as follows:</p>
  <table>
    <tr><td>DESIGNATION</td><td>${req.designation || ""}</td></tr>
    <tr><td>WORK TYPE</td><td>${req.workType || ""}</td></tr>
    <tr><td>BASIC SALARY</td><td>${req.basicSalary || ""} ${req.basicCurrency || ""}</td></tr>
    <tr><td>ATTENDANCE ALLOWANCE</td><td>${req.attendanceSalary || ""} ${req.attendanceCurrency || ""}</td></tr>
    <tr><td>FOOD ALLOWANCE</td><td>MVR ${req.foodAllowance || ""}</td></tr>
    <tr><td>WORK PLACE</td><td>${req.workplace || ""}</td></tr>
    <tr><td>WORKING HOURS</td><td>${req.workingHours || ""}</td></tr>
    <tr><td>CONTRACT TYPE</td><td>${contractLine}</td></tr>
  </table>
  ${jobDesc ? `<p>${jobDesc}</p>` : ""}
  <p style="margin-top:32px;">Please sign and return a copy of this letter as confirmation of your acceptance.</p>
  <div style="margin-top:48px; display:flex; justify-content:space-between;">
    <div style="text-align:center;"><div style="border-top:1px solid #999; width:200px; margin-bottom:6px;"></div><div style="font-size:12px; color:#666;">Authorized Signature</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #999; width:200px; margin-bottom:6px;"></div><div style="font-size:12px; color:#666;">Employee Signature &amp; Date</div></div>
  </div>
  ${footerImg}
</div>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════
// ADD APPLICANT FORM
// ════════════════════════════════════════════════════════════════
const EMPTY_APPLICANT = {
  fullName: "", passportNo: "", nidNo: "", dob: "", maritalStatus: "Single",
  address: "", phone: "", whatsapp: "", email: "", qualification: "",
  requirementId: "", isExpat: false,
  emergencyContactName: "", emergencyContactNo: "", emergencyRelation: "",
  agentName: "", agentNumber: "",
  ppPic: "", ppCopy: "",
  experienceLetters: [], qualificationCerts: [], otherDocs: [],
  status: "pending", quotaId: null, appointmentLetter: "",
  arrivalStatus: null, emsEmployeeId: null, createdAt: "",
};

function AddApplicantForm({ requirements, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_APPLICANT, createdAt: today() });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.fullName.trim()) { alert("Full name is required."); return; }
    onSave({ id: genId(), ...form });
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div className="card-title">➕ Add New Applicant</div>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕ Cancel</button>
      </div>
      <div className="card-body">

        {/* Section 1: Personal Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--accent)" }}>Personal Information</div>
          <div className="form-grid form-grid-2">
            <div className="form-group" style={{ gridColumn: "1/-1" }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Full legal name" />
            </div>
            <div className="form-group">
              <label className="form-label">Passport No.</label>
              <input className="form-input" value={form.passportNo} onChange={e => set("passportNo", e.target.value)} placeholder="Passport number (for expats)" />
            </div>
            <div className="form-group">
              <label className="form-label">NID No.</label>
              <input className="form-input" value={form.nidNo} onChange={e => set("nidNo", e.target.value)} placeholder="National ID (for locals)" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-input" type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Marital Status</label>
              <select className="form-input" value={form.maritalStatus} onChange={e => set("maritalStatus", e.target.value)}>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1/-1" }}>
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Home address" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+960 xxx xxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="+960 xxx xxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input className="form-input" value={form.qualification} onChange={e => set("qualification", e.target.value)} placeholder="e.g. BSc Civil Engineering" />
            </div>
          </div>
        </div>

        {/* Section 2: Job Application */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--accent)" }}>Job Application</div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Requirement / Position</label>
              <select className="form-input" value={form.requirementId} onChange={e => set("requirementId", e.target.value)}>
                <option value="">— Select Requirement —</option>
                {requirements.map(r => <option key={r.id} value={r.id}>{r.designation}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text2)" }}>
                <input type="checkbox" checked={form.isExpat} onChange={e => set("isExpat", e.target.checked)} />
                Expat (foreign national)
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--accent)" }}>Emergency Contact</div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input className="form-input" value={form.emergencyContactName} onChange={e => set("emergencyContactName", e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input className="form-input" value={form.emergencyContactNo} onChange={e => set("emergencyContactNo", e.target.value)} placeholder="+960 xxx xxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">Relation</label>
              <input className="form-input" value={form.emergencyRelation} onChange={e => set("emergencyRelation", e.target.value)} placeholder="e.g. Father, Spouse" />
            </div>
          </div>
        </div>

        {/* Section 4: Agent Info — expat only */}
        {form.isExpat && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--accent)" }}>Agent Information</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input className="form-input" value={form.agentName} onChange={e => set("agentName", e.target.value)} placeholder="Recruitment agent name" />
              </div>
              <div className="form-group">
                <label className="form-label">Agent Number</label>
                <input className="form-input" value={form.agentNumber} onChange={e => set("agentNumber", e.target.value)} placeholder="+xxx xxx xxxx" />
              </div>
            </div>
          </div>
        )}

        {/* Document Uploads */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--accent)" }}>Documents</div>
          <div className="form-grid form-grid-2">
            <ImageUpload label="PP Photo" value={form.ppPic} onChange={v => set("ppPic", v)} />
            <ImageUpload label="PP Copy" value={form.ppCopy} onChange={v => set("ppCopy", v)} />
            <MultiFileUpload
              label="Experience Letters"
              files={form.experienceLetters}
              onAdd={arr => set("experienceLetters", [...form.experienceLetters, ...arr])}
              onDelete={i => set("experienceLetters", form.experienceLetters.filter((_, idx) => idx !== i))}
            />
            <MultiFileUpload
              label="Qualification Certificates"
              files={form.qualificationCerts}
              onAdd={arr => set("qualificationCerts", [...form.qualificationCerts, ...arr])}
              onDelete={i => set("qualificationCerts", form.qualificationCerts.filter((_, idx) => idx !== i))}
            />
            <MultiFileUpload
              label="Other Documents"
              files={form.otherDocs}
              onAdd={arr => set("otherDocs", [...form.otherDocs, ...arr])}
              onDelete={i => set("otherDocs", form.otherDocs.filter((_, idx) => idx !== i))}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>Save Applicant</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// APPLICANT PROFILE
// ════════════════════════════════════════════════════════════════
function ApplicantProfile({ applicant: initApplicant, requirements, quotas, setQuotas, companies, employees, setEmployees, onBack, onUpdate, toast }) {
  const [applicant, setApplicant]           = useState({ ...initApplicant });
  const [tab, setTab]                       = useState("Profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm]       = useState({ ...initApplicant });
  const [letterHtml, setLetterHtml]         = useState(initApplicant.appointmentLetter || "");
  const [showLetterPreview, setShowLetterPreview] = useState(false);

  const req     = requirements.find(r => r.id === applicant.requirementId);
  const quota   = quotas.find(q => q.id === applicant.quotaId);
  const company = quota ? companies.find(c => c.id === quota.companyId) : null;

  const update = (changes) => {
    const updated = { ...applicant, ...changes };
    setApplicant(updated);
    onUpdate(updated);
  };

  const setProfile = (k, v) => setProfileForm(p => ({ ...p, [k]: v }));

  const saveProfile = () => {
    update({ ...profileForm });
    setEditingProfile(false);
  };

  // ── Application tab actions ──
  const acceptApplicant    = () => update({ status: "accepted" });
  const rejectApplicant    = () => { if (!window.confirm("Reject this applicant?")) return; update({ status: "rejected" }); };
  const reconsiderApplicant = () => update({ status: "pending" });

  const assignQuota = (quotaId) => {
    setQuotas(prev => prev.map(q =>
      q.id === quotaId ? { ...q, status: "assigned", assignedCandidateId: applicant.id } : q
    ));
    update({ quotaId });
    toast("Quota assigned to applicant", "success");
  };

  const generateLetter = () => {
    if (!req) { toast("No requirement linked to this applicant", "error"); return; }
    const html = generateLetterHtml(applicant, req, company);
    setLetterHtml(html);
    setShowLetterPreview(true);
  };

  const saveLetterToProfile = () => {
    update({ appointmentLetter: letterHtml });
    toast("Appointment letter saved", "success");
  };

  const printLetter = (html) => {
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const markArrived        = () => update({ arrivalStatus: "arrived" });
  const cancelApplication  = () => { if (!window.confirm("Cancel this application?")) return; update({ arrivalStatus: "cancelled" }); };

  const createEmsEmployee = () => {
    const newEmp = {
      id: genId(),
      name: applicant.fullName || "",
      empId: "",
      designation: req?.designation || "",
      phone: applicant.phone || "",
      whatsapp: applicant.whatsapp || "",
      email: applicant.email || "",
      basicSalary: req?.basicSalary || "",
      attendanceAllowance: req?.attendanceSalary || "",
      accommodationAllowance: "",
      foodAllowance: req?.foodAllowance || "",
      phoneAllowance: "",
      otRate: 20, concreteOT: 200, cementOT: 100, teaRate: 10,
      joinDate: today(),
      empStatus: "active",
      statusDate: "", statusNote: "",
      salaryHistory: [], promotions: [],
      nationality: "",
      isExpat: applicant.isExpat || false,
      nidNumber: applicant.nidNo || "",
      passportNumber: applicant.passportNo || "",
      passportExpiry: "",
      agentName: applicant.agentName || "",
      agentContact: applicant.agentNumber || "",
      emergencyContactName: applicant.emergencyContactName || "",
      emergencyContactPhone: applicant.emergencyContactNo || "",
      emergencyContactRelation: applicant.emergencyRelation || "",
      wpNumber: "", wpExpiry: "", wpFeePaid: false, wpFeePaidDate: "",
      visaType: "", visaNumber: "", visaExpiry: "",
      medicalProvider: "", medicalExpiry: "",
      insuranceProvider: "", insurancePolicyNo: "", insuranceExpiry: "",
    };
    setEmployees(prev => [...prev, newEmp]);
    update({ emsEmployeeId: newEmp.id });
    toast("EMS employee profile created", "success");
  };

  const availableQuotas = quotas.filter(q => q.status === "available");
  const TABS = ["Profile", "Documents", "Application"];

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>
        ← All Applicants
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            {applicant.ppPic ? (
              <img src={applicant.ppPic} alt="PP" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#3b82f618", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, border: "2px solid #3b82f633" }}>
                {(applicant.fullName || "?")[0]}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{applicant.fullName}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                {req ? `Applying for: ${req.designation}` : "No requirement linked"}
                {applicant.isExpat && <span style={{ marginLeft: 8, color: "#3b82f6" }}>• Expat</span>}
              </div>
              <StatusBadge status={applicant.status} arrivalStatus={applicant.arrivalStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
            fontSize: 13, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? "var(--accent)" : "var(--text3)",
            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            fontFamily: "var(--font)", transition: "color 0.15s", marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === "Profile" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Personal Information</div>
            {editingProfile
              ? <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveProfile}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setProfileForm({ ...applicant }); setEditingProfile(false); }}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => { setProfileForm({ ...applicant }); setEditingProfile(true); }}>Edit</button>
            }
          </div>
          <div className="card-body">
            {editingProfile ? (
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profileForm.fullName} onChange={e => setProfile("fullName", e.target.value)} />
                </div>
                <div className="form-group"><label className="form-label">Passport No.</label><input className="form-input" value={profileForm.passportNo} onChange={e => setProfile("passportNo", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">NID No.</label><input className="form-input" value={profileForm.nidNo} onChange={e => setProfile("nidNo", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={profileForm.dob} onChange={e => setProfile("dob", e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label">Marital Status</label>
                  <select className="form-input" value={profileForm.maritalStatus} onChange={e => setProfile("maritalStatus", e.target.value)}>
                    <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Address</label><input className="form-input" value={profileForm.address} onChange={e => setProfile("address", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={profileForm.phone} onChange={e => setProfile("phone", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={profileForm.whatsapp} onChange={e => setProfile("whatsapp", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={profileForm.email} onChange={e => setProfile("email", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Qualification</label><input className="form-input" value={profileForm.qualification} onChange={e => setProfile("qualification", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Emergency Contact Name</label><input className="form-input" value={profileForm.emergencyContactName} onChange={e => setProfile("emergencyContactName", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Emergency Phone</label><input className="form-input" value={profileForm.emergencyContactNo} onChange={e => setProfile("emergencyContactNo", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Relation</label><input className="form-input" value={profileForm.emergencyRelation} onChange={e => setProfile("emergencyRelation", e.target.value)} /></div>
                {applicant.isExpat && (
                  <>
                    <div className="form-group"><label className="form-label">Agent Name</label><input className="form-input" value={profileForm.agentName} onChange={e => setProfile("agentName", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Agent Number</label><input className="form-input" value={profileForm.agentNumber} onChange={e => setProfile("agentNumber", e.target.value)} /></div>
                  </>
                )}
              </div>
            ) : (
              <div className="form-grid form-grid-2">
                {[
                  ["Full Name",      applicant.fullName],
                  ["Passport No.",   applicant.passportNo],
                  ["NID No.",        applicant.nidNo],
                  ["Date of Birth",  applicant.dob],
                  ["Marital Status", applicant.maritalStatus],
                  ["Address",        applicant.address],
                  ["Phone",          applicant.phone],
                  ["WhatsApp",       applicant.whatsapp],
                  ["Email",          applicant.email],
                  ["Qualification",  applicant.qualification],
                  ["Emergency Contact", applicant.emergencyContactName],
                  ["Emergency Phone",   applicant.emergencyContactNo],
                  ["Relation",          applicant.emergencyRelation],
                  ...(applicant.isExpat ? [["Agent Name", applicant.agentName], ["Agent Number", applicant.agentNumber]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="form-group">
                    <label className="form-label">{label}</label>
                    <div style={{ padding: "9px 0", fontSize: 13, color: val ? "var(--text)" : "var(--text3)" }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "Documents" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Documents</div></div>
          <div className="card-body">
            <div className="form-grid form-grid-2">
              <ImageUpload label="PP Photo" value={applicant.ppPic} onChange={v => update({ ppPic: v })} />
              <ImageUpload label="PP Copy"  value={applicant.ppCopy} onChange={v => update({ ppCopy: v })} />
              <MultiFileUpload
                label="Experience Letters"
                files={applicant.experienceLetters || []}
                onAdd={arr => update({ experienceLetters: [...(applicant.experienceLetters || []), ...arr] })}
                onDelete={i => update({ experienceLetters: (applicant.experienceLetters || []).filter((_, idx) => idx !== i) })}
              />
              <MultiFileUpload
                label="Qualification Certificates"
                files={applicant.qualificationCerts || []}
                onAdd={arr => update({ qualificationCerts: [...(applicant.qualificationCerts || []), ...arr] })}
                onDelete={i => update({ qualificationCerts: (applicant.qualificationCerts || []).filter((_, idx) => idx !== i) })}
              />
              <MultiFileUpload
                label="Other Documents"
                files={applicant.otherDocs || []}
                onAdd={arr => update({ otherDocs: [...(applicant.otherDocs || []), ...arr] })}
                onDelete={i => update({ otherDocs: (applicant.otherDocs || []).filter((_, idx) => idx !== i) })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATION TAB ── */}
      {tab === "Application" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">Application Status</div></div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <StatusBadge status={applicant.status} arrivalStatus={applicant.arrivalStatus} />
                <span style={{ fontSize: 13, color: "var(--text3)" }}>Applied: {formatDate(applicant.createdAt)}</span>
              </div>

              {/* Pending */}
              {applicant.status === "pending" && !applicant.arrivalStatus && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" style={{ background: "#10b981" }} onClick={acceptApplicant}>✓ Accept</button>
                  <button className="btn btn-danger" onClick={rejectApplicant}>✕ Reject</button>
                </div>
              )}

              {/* Rejected */}
              {applicant.status === "rejected" && (
                <div>
                  <div style={{ background: "#ef444420", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#ef4444" }}>
                    This applicant has been rejected.
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={reconsiderApplicant}>Reconsider (move to pending)</button>
                </div>
              )}

              {/* Accepted — no quota */}
              {applicant.status === "accepted" && !applicant.quotaId && (
                <div>
                  <div className="alert alert-info" style={{ marginBottom: 12 }}>
                    Applicant accepted. Assign a work quota to proceed.
                  </div>
                  {availableQuotas.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--text3)" }}>No available quotas at this time.</div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text2)" }}>Select Available Quota:</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                        {availableQuotas.map(q => {
                          const co = companies.find(c => c.id === q.companyId);
                          return (
                            <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)", gap: 12 }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>#{q.quotaNumber} — {q.quotaDesignation || "—"}</div>
                                <div style={{ fontSize: 11, color: "var(--text3)" }}>{co?.name || "Unknown Company"} · Expiry: {q.expiryDate || "—"}</div>
                              </div>
                              <button className="btn btn-primary btn-sm" onClick={() => assignQuota(q.id)}>Assign</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accepted + quota */}
              {applicant.status === "accepted" && applicant.quotaId && (
                <div>
                  {quota && (
                    <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 16px", marginBottom: 14, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", marginBottom: 4 }}>Assigned Quota</div>
                      <div style={{ fontWeight: 700 }}>#{quota.quotaNumber} — {quota.quotaDesignation || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>{company?.name || "—"} · Expiry: {quota.expiryDate || "—"}</div>
                    </div>
                  )}

                  {/* Letter */}
                  {!applicant.arrivalStatus && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Appointment Letter</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-primary btn-sm" onClick={generateLetter}>
                          {applicant.appointmentLetter ? "Regenerate Letter" : "Generate Letter"}
                        </button>
                        {applicant.appointmentLetter && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setLetterHtml(applicant.appointmentLetter); setShowLetterPreview(true); }}>View Saved Letter</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => printLetter(applicant.appointmentLetter)}>Print</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {showLetterPreview && letterHtml && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Letter Preview</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={saveLetterToProfile}>Save to Profile</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => printLetter(letterHtml)}>Print</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setShowLetterPreview(false)}>✕</button>
                        </div>
                      </div>
                      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                        <iframe
                          title="Appointment Letter"
                          srcDoc={letterHtml}
                          style={{ width: "100%", minHeight: 500, border: "none", background: "#fff" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Arrival actions */}
                  {!applicant.arrivalStatus && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                      <button className="btn btn-primary" style={{ background: "#10b981" }} onClick={markArrived}>✈ Mark as Arrived</button>
                      <button className="btn btn-danger" onClick={cancelApplication}>Cancel Application</button>
                    </div>
                  )}

                  {/* Arrived */}
                  {applicant.arrivalStatus === "arrived" && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", background: "#10b98120", borderRadius: 8, border: "1px solid #10b981" }}>
                        <span style={{ fontSize: 16 }}>✈</span>
                        <span style={{ fontWeight: 700, color: "#10b981" }}>Applicant has arrived</span>
                      </div>
                      {!applicant.emsEmployeeId ? (
                        <button className="btn btn-primary" onClick={createEmsEmployee}>👤 Create EMS Profile</button>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
                          <span style={{ color: "#10b981" }}>✓</span>
                          EMS profile created — Employee ID: <strong style={{ fontFamily: "var(--mono)" }}>{applicant.emsEmployeeId}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cancelled */}
                  {applicant.arrivalStatus === "cancelled" && (
                    <div style={{ padding: "10px 14px", background: "#ef444420", borderRadius: 8, border: "1px solid #ef4444", color: "#ef4444", fontWeight: 700, fontSize: 13 }}>
                      ✕ Application cancelled
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Requirement summary */}
          {req && (
            <div className="card">
              <div className="card-header"><div className="card-title">Linked Requirement</div></div>
              <div className="card-body">
                <div className="form-grid form-grid-2">
                  {[
                    ["Designation",          req.designation],
                    ["Work Type",            req.workType],
                    ["Basic Salary",         req.basicSalary ? `${req.basicSalary} ${req.basicCurrency}` : "—"],
                    ["Attendance Allowance", req.attendanceSalary ? `${req.attendanceSalary} ${req.attendanceCurrency}` : "—"],
                    ["Food Allowance",       req.foodAllowance ? `MVR ${req.foodAllowance}` : "—"],
                    ["Workplace",            req.workplace],
                    ["Working Hours",        req.workingHours],
                    ["Contract Type",        req.workStatus],
                  ].map(([label, val]) => (
                    <div key={label} className="form-group">
                      <label className="form-label">{label}</label>
                      <div style={{ padding: "9px 0", fontSize: 13, color: val ? "var(--text)" : "var(--text3)" }}>{val || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// RECRUITMENT PAGE (main list)
// ════════════════════════════════════════════════════════════════
export default function RecruitmentPage({ applicants, setApplicants, requirements, quotas, setQuotas, companies, employees, setEmployees, toast }) {
  const [selected,     setSelected]     = useState(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReqId,  setFilterReqId]  = useState("");

  if (selected) {
    return (
      <ApplicantProfile
        applicant={selected}
        requirements={requirements}
        quotas={quotas}
        setQuotas={setQuotas}
        companies={companies}
        employees={employees}
        setEmployees={setEmployees}
        onBack={() => setSelected(null)}
        onUpdate={updated => {
          setApplicants(prev => prev.map(a => a.id === updated.id ? updated : a));
          setSelected(updated);
        }}
        toast={toast}
      />
    );
  }

  const addApplicant = (app) => {
    setApplicants(p => [...p, app]);
    toast("Applicant added", "success");
    setShowAddForm(false);
  };

  const getReqDesignation = (reqId) => requirements.find(r => r.id === reqId)?.designation || "—";

  const visible = applicants.filter(a => {
    if (filterReqId && a.requirementId !== filterReqId) return false;
    if (filterStatus === "all")       return true;
    if (filterStatus === "arrived")   return a.arrivalStatus === "arrived";
    if (filterStatus === "cancelled") return a.arrivalStatus === "cancelled";
    return a.status === filterStatus;
  });

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>👤 Applicants</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {applicants.length} applicant{applicants.length !== 1 ? "s" : ""} total
          </div>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>+ Add Applicant</button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddApplicantForm
          requirements={requirements}
          onSave={addApplicant}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="form-input" style={{ width: "auto", minWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="arrived">Arrived</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-input" style={{ width: "auto", minWidth: 180 }} value={filterReqId} onChange={e => setFilterReqId(e.target.value)}>
          <option value="">All Requirements</option>
          {requirements.map(r => <option key={r.id} value={r.id}>{r.designation}</option>)}
        </select>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="empty-state" style={{ padding: "60px 20px" }}>
          <div className="icon">👤</div>
          <p>{applicants.length === 0 ? "No applicants yet." : "No applicants match filters."}</p>
          {applicants.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text3)" }}>Click "+ Add Applicant" to add the first one.</p>
          )}
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Designation", "Expat", "Status", "Date Applied", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text3)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 1 ? "var(--surface2)" : "transparent", cursor: "pointer" }}
                    onClick={() => setSelected(a)}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 700 }}>{a.fullName}</div>
                      {a.passportNo && <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>PP: {a.passportNo}</div>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{getReqDesignation(a.requirementId)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {a.isExpat ? <span className="badge badge-yellow">Expat</span> : <span className="badge badge-gray">Local</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <StatusBadge status={a.status} arrivalStatus={a.arrivalStatus} />
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text3)" }}>{formatDate(a.createdAt)}</td>
                    <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(a)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
