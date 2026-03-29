import { useState, useMemo } from "react";
import { getXLSX } from "../utils/excel";
import { isEmpActiveOnDate, EMP_STATUS_META } from "../constants/employees";
import { genId } from "../utils/helpers";
import StepBreadcrumb from "../components/StepBreadcrumb";

// Only show sites that are active or in retention — others are not accepting attendance
const ACTIVE_STATUSES = new Set(["active", "retention"]);
function getActiveSites(sites) {
  return sites.filter(s => ACTIVE_STATUSES.has(s.status || "active"));
}

export default function AttendancePage({ employees, sites, attendance, setAttendance, rosters, toast, user }) {
  const isManager = user?.role === "manager";
  const activeSites = getActiveSites(sites);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState("date");
  const [date, setDate] = useState(todayStr);
  const [siteId, setSiteId] = useState("");
  const [localAtt, setLocalAtt] = useState({});
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Bulk fill state
  const [showBulkFill, setShowBulkFill] = useState(false);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth());
  const [bulkSiteId, setBulkSiteId] = useState("");
  const [bulkStatus, setBulkStatus] = useState("P");
  const [bulkEmpIds, setBulkEmpIds] = useState(new Set());
  const [bulkFilling, setBulkFilling] = useState(false);
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const doBulkFill = () => {
    if (!bulkSiteId) return toast("Select a site", "error");
    if (bulkEmpIds.size === 0) return toast("Select at least one employee", "error");
    setBulkFilling(true);

    const mk = `${bulkYear}-${String(bulkMonth + 1).padStart(2, "0")}`;
    const totalDays = new Date(bulkYear, bulkMonth + 1, 0).getDate();
    const roster = rosters[mk] || {};

    setAttendance(prev => {
      const next = { ...prev };
      for (let d = 1; d <= totalDays; d++) {
        const dk = `${mk}-${String(d).padStart(2, "0")}`;
        // For each employee check active on this date and roster type
        const dayEntries = {};
        bulkEmpIds.forEach(empId => {
          const emp = employees.find(e => e.id === empId);
          if (!emp) return;
          if (!isEmpActiveOnDate(emp, dk)) return; // skip locked days
          const rType = roster[empId]?.[d] || (new Date(bulkYear, bulkMonth, d).getDay() === 5 ? "H" : "W");
          if (rType === "H" || rType === "O") return; // skip holidays and off days
          // Don't overwrite existing attendance
          if (prev[dk]?.[bulkSiteId]?.[empId]) return;
          dayEntries[empId] = { status: bulkStatus, minutesLate: 0 };
        });
        if (Object.keys(dayEntries).length > 0) {
          next[dk] = {
            ...(next[dk] || {}),
            [bulkSiteId]: { ...(next[dk]?.[bulkSiteId] || {}), ...dayEntries }
          };
        }
      }
      return next;
    });

    setBulkFilling(false);
    setShowBulkFill(false);
    toast(`Bulk filled ${MONTH_NAMES[bulkMonth]} ${bulkYear} — ${bulkEmpIds.size} employees as ${bulkStatus}`, "success");
    setBulkEmpIds(new Set());
  };

  // Bulk fill modal employees — roster emps for selected bulk month
  const bulkMk = `${bulkYear}-${String(bulkMonth + 1).padStart(2, "0")}`;
  const bulkRoster = rosters[bulkMk] || {};
  const bulkAvailEmps = employees.filter(e => Object.keys(bulkRoster).includes(e.id));

  const BulkFillModal = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div className="modal-title">⚡ Bulk Fill Attendance</div>
          <button className="modal-close" onClick={() => setShowBulkFill(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            ℹ Fills all work days in the selected month as the chosen status. Holidays, off days, and already-entered days are skipped.
          </div>
          <div className="form-grid form-grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={bulkMonth} onChange={e => { setBulkMonth(+e.target.value); setBulkEmpIds(new Set()); }}>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={bulkYear} onChange={e => { setBulkYear(+e.target.value); setBulkEmpIds(new Set()); }}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Site</label>
              <select className="form-select" value={bulkSiteId} onChange={e => setBulkSiteId(e.target.value)}>
                <option value="">Select site...</option>
                {activeSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fill Status</label>
              <select className="form-select" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                <option value="P">P — Present</option>
                <option value="A">A — Absent</option>
                <option value="H">H — Half Day</option>
                <option value="S">S — Sick</option>
                <option value="L">L — Leave</option>
              </select>
            </div>
          </div>

          {Object.keys(bulkRoster).length === 0
            ? <div className="alert alert-warning">⚠ No roster for {MONTH_NAMES[bulkMonth]} {bulkYear}. Set up the roster first.</div>
            : <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Select Employees ({bulkEmpIds.size} selected)
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setBulkEmpIds(new Set(bulkAvailEmps.map(e => e.id)))}>Select All</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setBulkEmpIds(new Set())}>Clear</button>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                {bulkAvailEmps.map(e => {
                  const isSelected = bulkEmpIds.has(e.id);
                  const st = e.empStatus || "active";
                  const stMeta = EMP_STATUS_META[st];
                  return (
                    <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isSelected ? "rgba(59,130,246,0.06)" : "transparent" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => setBulkEmpIds(p => { const n = new Set(p); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })} style={{ width: 16, height: 16, accentColor: "#3b82f6" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{e.empId}{e.designation ? ` · ${e.designation}` : ""}</div>
                      </div>
                      <span className={`badge ${stMeta.badge}`} style={{ fontSize: 9 }}>{stMeta.icon} {stMeta.label}</span>
                    </label>
                  );
                })}
              </div>
            </>
          }
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setShowBulkFill(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={bulkFilling || bulkEmpIds.size === 0 || !bulkSiteId || Object.keys(bulkRoster).length === 0}
            onClick={doBulkFill}>
            {bulkFilling ? "Filling..." : `⚡ Fill ${MONTH_NAMES[bulkMonth]} ${bulkYear}`}
          </button>
        </div>
      </div>
    </div>
  );

  const dateObj = new Date(date + "T00:00:00");
  const day = dateObj.getDate(), mo = dateObj.getMonth(), yr = dateObj.getFullYear();
  const monthKey = `${yr}-${String(mo + 1).padStart(2, "0")}`;
  const roster = rosters[monthKey] || {};
  const allRosterEmps = employees.filter(e => Object.keys(roster).includes(e.id) && isEmpActiveOnDate(e, date));

  const takenOnDate = useMemo(() => {
    const taken = new Set();
    Object.entries(attendance[date] || {}).forEach(([sid, empMap]) => {
      if (sid === siteId) return;
      Object.keys(empMap).forEach(eid => taken.add(eid));
    });
    return taken;
  }, [attendance, date, siteId]);

  const availableEmps = allRosterEmps.filter(e => !takenOnDate.has(e.id));
  const selectedIds = Object.keys(localAtt);

  const deleteAttendance = (dateStr, sid) => {
    if (!confirm(`Delete all attendance for ${sites.find(s=>s.id===sid)?.name || sid} on ${dateStr}? This cannot be undone.`)) return;
    setAttendance(p => {
      const next = { ...p };
      if (next[dateStr]) {
        const dayNext = { ...next[dateStr] };
        delete dayNext[sid];
        if (Object.keys(dayNext).length === 0) delete next[dateStr];
        else next[dateStr] = dayNext;
      }
      return next;
    });
    toast("Attendance deleted", "success");
  };

  const reset = () => { setStep("date"); setSiteId(""); setLocalAtt({}); setSaved(false); setFilterStatus("ALL"); };

  const goToStaff = (sid) => {
    setSiteId(sid);
    const existing = (attendance[date] || {})[sid] || {};
    if (Object.keys(existing).length > 0) {
      setLocalAtt(JSON.parse(JSON.stringify(existing)));
      setSaved(false); setStep("attendance");
    } else {
      setLocalAtt({}); setSaved(false); setStep("staff");
    }
  };

  const toggleEmp = (empId) => {
    setLocalAtt(p => {
      const next = { ...p };
      if (next[empId]) { delete next[empId]; }
      else {
        const rType = roster[empId]?.[day] || "W";
        const defaultStatus = rType === "H" ? "H" : rType === "L" ? "L" : rType === "O" ? "O" : "P";
        next[empId] = { status: defaultStatus, minutesLate: 0 };
      }
      return next;
    });
  };

  const selectAll = () => {
    const next = {};
    availableEmps.forEach(e => {
      const rType = roster[e.id]?.[day] || "W";
      const ds = rType === "H" ? "H" : rType === "L" ? "L" : rType === "O" ? "O" : "P";
      next[e.id] = localAtt[e.id] || { status: ds, minutesLate: 0 };
    });
    setLocalAtt(next);
  };

  const setField = (empId, field, val) => { setLocalAtt(p => ({ ...p, [empId]: { ...p[empId], [field]: val } })); setSaved(false); };
  const markAllPresent = () => { setLocalAtt(p => { const n = {...p}; Object.keys(n).forEach(id => { n[id] = {...n[id], status: "P"}; }); return n; }); setSaved(false); };
  const saveAtt = () => { setAttendance(p => ({ ...p, [date]: { ...(p[date] || {}), [siteId]: localAtt } })); setSaved(true); toast("Attendance saved!", "success"); };

  // Excel import state
  const [showImport, setShowImport] = useState(false);
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [importMonth, setImportMonth] = useState(new Date().getMonth());
  const [importSiteId, setImportSiteId] = useState("");
  const [importStatus, setImportStatus] = useState("idle"); // idle | parsing | preview | importing | done
  const [importPreview, setImportPreview] = useState([]); // [{ empId, empName, days: {1: "P", ...} }]
  const [importErrors, setImportErrors] = useState([]);

  // Download blank template
  const downloadTemplate = async () => {
    const XLSX = await getXLSX();
    const mk = `${importYear}-${String(importMonth + 1).padStart(2, "0")}`;
    const totalDays = new Date(importYear, importMonth + 1, 0).getDate();
    const roster = rosters[mk] || {};
    const rosterEmps = employees.filter(e => Object.keys(roster).includes(e.id));
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    if (rosterEmps.length === 0) { toast("No employees in roster for this month", "error"); return; }

    const headers = ["Emp ID", "Employee Name", ...Array.from({ length: totalDays }, (_, i) => {
      const d = i + 1;
      const dn = dayNames[new Date(importYear, importMonth, d).getDay()];
      return `${d}\n${dn}`;
    })];

    const rows = rosterEmps.map(e => {
      const row = [e.empId, e.name];
      for (let d = 1; d <= totalDays; d++) {
        const rType = roster[e.id]?.[d] || (new Date(importYear, importMonth, d).getDay() === 5 ? "H" : "W");
        // Pre-fill holidays and off days, leave work days blank for user to fill
        row.push(rType === "H" ? "PH" : rType === "O" ? "O" : "");
      }
      return row;
    });

    const instructions = [
      ["ATTENDANCE IMPORT TEMPLATE"],
      [`Month: ${MONTH_NAMES[importMonth]} ${importYear}`],
      [""],
      ["Status codes: P = Present, A = Absent, H = Half Day, S = Sick, L = Leave, PH = Public Holiday (do not change), O = Off Day (do not change)"],
      ["IMPORTANT: Do NOT change Emp ID column. Do NOT add or remove columns."],
      ["Fill in status codes for work days only. Leave blank cells will be ignored during import."],
      [""],
    ];

    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr["!cols"] = [{ wch: 120 }];
    wsInstr["A1"].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } } };
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

    // Attendance sheet
    const wsData = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsData["!cols"] = [{ wch: 10 }, { wch: 22 }, ...Array(totalDays).fill({ wch: 5 })];

    // Style header row
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!wsData[addr]) wsData[addr] = { t: "z", v: "" };
      const isFri = c >= 2 && new Date(importYear, importMonth, c - 1).getDay() === 5;
      wsData[addr].s = {
        font: { bold: true, sz: 9, color: { rgb: isFri ? "C00000" : "FFFFFF" } },
        fill: { fgColor: { rgb: "2D5986" } },
        alignment: { horizontal: "center", wrapText: true }
      };
    }
    // Style PH and O cells
    rows.forEach((row, ri) => {
      row.forEach((val, ci) => {
        if (ci < 2) return;
        const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!wsData[addr]) wsData[addr] = { t: "z", v: "" };
        let bg = ri % 2 === 0 ? "F5F8FC" : "FFFFFF";
        if (val === "PH") bg = "CFEEFF";
        if (val === "O")  bg = "E8E8E8";
        wsData[addr].s = { fill: { fgColor: { rgb: bg } }, font: { sz: 9 }, alignment: { horizontal: "center" } };
      });
    });

    XLSX.utils.book_append_sheet(wb, wsData, `${MONTH_NAMES[importMonth]} ${importYear}`);
    XLSX.writeFile(wb, `Attendance_Template_${MONTH_NAMES[importMonth]}_${importYear}.xlsx`);
    toast("Template downloaded!", "success");
  };

  // Parse uploaded Excel file
  const parseImportFile = async (file) => {
    if (!file) return;
    setImportStatus("parsing");
    setImportErrors([]);
    setImportPreview([]);
    try {
      const XLSX = await getXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = `${MONTH_NAMES[importMonth]} ${importYear}`;
      const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
      if (!ws) { setImportErrors(["Could not find sheet. Make sure you're uploading the correct template."]); setImportStatus("idle"); return; }

      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) { setImportErrors(["Template appears empty."]); setImportStatus("idle"); return; }

      const totalDays = new Date(importYear, importMonth + 1, 0).getDate();
      const VALID = new Set(["P","A","H","S","L","PH","O",""]);
      const errors = [];
      const preview = [];

      // rows[0] = headers, rows[1+] = employee data
      for (let ri = 1; ri < rows.length; ri++) {
        const row = rows[ri];
        const empId = String(row[0] || "").trim();
        const empName = String(row[1] || "").trim();
        if (!empId) continue;

        const emp = employees.find(e => e.empId === empId);
        if (!emp) { errors.push(`Row ${ri + 1}: Emp ID "${empId}" not found`); continue; }

        const days = {};
        for (let d = 1; d <= totalDays; d++) {
          const val = String(row[d + 1] || "").trim().toUpperCase();
          if (!VALID.has(val)) { errors.push(`${empName} day ${d}: invalid status "${val}"`); continue; }
          if (val && val !== "PH" && val !== "O") days[d] = val; // only import actual attendance
        }
        preview.push({ empId: emp.id, empName: emp.name, days });
      }

      setImportPreview(preview);
      setImportErrors(errors);
      setImportStatus("preview");
    } catch (e) {
      setImportErrors([`Error reading file: ${e.message}`]);
      setImportStatus("idle");
    }
  };

  // Apply imported data
  const applyImport = () => {
    if (!importSiteId) { toast("Select a site to import into", "error"); return; }
    setImportStatus("importing");
    const mk = `${importYear}-${String(importMonth + 1).padStart(2, "0")}`;
    const totalDays = new Date(importYear, importMonth + 1, 0).getDate();

    setAttendance(prev => {
      const next = { ...prev };
      importPreview.forEach(({ empId, days }) => {
        Object.entries(days).forEach(([d, status]) => {
          const dk = `${mk}-${String(d).padStart(2, "0")}`;
          next[dk] = { ...(next[dk] || {}), [importSiteId]: { ...(next[dk]?.[importSiteId] || {}), [empId]: { status, minutesLate: 0 } } };
        });
      });
      return next;
    });

    setTimeout(() => {
      setImportStatus("done");
      toast(`Imported attendance for ${importPreview.length} employees!`, "success");
    }, 300);
  };

  const ImportModal = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">📥 Import Attendance from Excel</div>
          <button className="modal-close" onClick={() => { setShowImport(false); setImportStatus("idle"); setImportPreview([]); setImportErrors([]); }}>✕</button>
        </div>
        <div className="modal-body">

          {/* Step 1: Config */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Month</label>
                <select className="form-select" value={importMonth} onChange={e => { setImportMonth(+e.target.value); setImportStatus("idle"); setImportPreview([]); }}>
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-select" value={importYear} onChange={e => { setImportYear(+e.target.value); setImportStatus("idle"); setImportPreview([]); }}>
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Site</label>
                <select className="form-select" value={importSiteId} onChange={e => setImportSiteId(e.target.value)}>
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Download template */}
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Step 1 — Download Template</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>Fill in P/A/H/S/L for each employee's working days</div>
              </div>
              <button className="btn btn-success btn-sm" onClick={downloadTemplate}>⬇ Download Template</button>
            </div>

            {/* Upload file */}
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Step 2 — Upload Filled Template</div>
              <input type="file" accept=".xlsx,.xls" onChange={e => parseImportFile(e.target.files?.[0])}
                style={{ fontSize: 13, color: "var(--text)", width: "100%" }} />
            </div>

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="alert alert-warning" style={{ maxHeight: 120, overflowY: "auto" }}>
                {importErrors.map((e, i) => <div key={i} style={{ fontSize: 12 }}>⚠ {e}</div>)}
              </div>
            )}

            {/* Preview */}
            {importStatus === "preview" && importPreview.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Preview — {importPreview.length} employees · {importPreview.reduce((s, e) => s + Object.keys(e.days).length, 0)} attendance records
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                  {importPreview.map(e => {
                    const counts = {};
                    Object.values(e.days).forEach(s => { counts[s] = (counts[s] || 0) + 1; });
                    return (
                      <div key={e.empId} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.empName}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(counts).map(([s, n]) => (
                            <span key={s} className={`badge ${s==="P"?"badge-green":s==="A"?"badge-red":s==="H"?"badge-yellow":s==="S"?"badge-purple":"badge-gray"}`} style={{ fontSize: 10 }}>{s}:{n}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {importStatus === "done" && (
              <div className="alert alert-info">✅ Import complete! Attendance saved for {importPreview.length} employees in {MONTH_NAMES[importMonth]} {importYear}.</div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => { setShowImport(false); setImportStatus("idle"); setImportPreview([]); setImportErrors([]); }}>
            {importStatus === "done" ? "Close" : "Cancel"}
          </button>
          {importStatus === "preview" && importPreview.length > 0 && (
            <button className="btn btn-primary" disabled={!importSiteId} onClick={applyImport}>
              📥 Import {importPreview.length} Employees into {sites.find(s=>s.id===importSiteId)?.name || "..."}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const STATUS_META = {
    P: { label: "Present",  color: "#10b981", bg: "rgba(16,185,129,0.15)" },
    A: { label: "Absent",   color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
    H: { label: "Half Day", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
    S: { label: "Sick",     color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
    L: { label: "Leave",    color: "#94a3b8", bg: "rgba(100,116,139,0.15)" },
    O: { label: "Off",      color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
  };
  const ROSTER_BADGE = { W:"badge-blue", H:"badge-yellow", L:"badge-purple", O:"badge-green" };
  const dayName = dateObj.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const siteName = sites.find(s => s.id === siteId)?.name || "";
  const STEPS = ["date","site","staff","attendance"];

  // ── STEP 1: Date ──
  if (step === "date") return (
    <div>
      {showBulkFill && <BulkFillModal />}
      {showImport && <ImportModal />}
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-header">
          <div className="card-title">Step 1 — Select Date</div>
          <div className="gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>📥 Import Excel</button>
            <button className="btn btn-warning btn-sm" style={{ color: "#000" }} onClick={() => setShowBulkFill(true)}>⚡ Bulk Fill</button>
          </div>
        </div>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Attendance Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>{dayName}</div>
          </div>
          {Object.keys(roster).length === 0 && <div className="alert alert-warning" style={{ marginBottom: 16 }}>⚠ No roster for {monthKey}. Set up Duty Roster first.</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={Object.keys(roster).length === 0} onClick={() => setStep("site")}>
            Next → Select Site
          </button>
        </div>
      </div>
      {Object.keys((attendance[date] || {})).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Already entered on {date}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(attendance[date]).map(([sid, empMap]) => {
              const s = sites.find(x => x.id === sid);
              const pCount = Object.values(empMap).filter(a => a.status === "P").length;
              return (
                <div key={sid} className="card">
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ cursor: "pointer", flex: 1 }} onClick={() => { setStep("site"); goToStaff(sid); }}>
                      <div style={{ fontWeight: 700 }}>{s?.name || sid}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>{Object.keys(empMap).length} staff · {pCount} present</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="badge badge-green">✓ Saved</span>
                      {isManager && (
                        <button className="btn btn-danger btn-sm" onClick={ev => { ev.stopPropagation(); deleteAttendance(date, sid); }}
                          style={{ fontSize: 11, padding: "4px 10px" }}>🗑 Delete</button>
                      )}
                      <span style={{ color: "var(--text3)", fontSize: 18, cursor: "pointer" }} onClick={() => { setStep("site"); goToStaff(sid); }}>›</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── STEP 2: Site ──
  if (step === "site") return (
    <div>
      <StepBreadcrumb steps={STEPS} labels={["Date","Site","Staff","Attendance"]} current={step} onGoTo={i => { if(i===0) reset(); }} />
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="card-header"><div className="card-title">Step 2 — Select Site</div><button className="btn btn-ghost btn-sm" onClick={reset}>← Back</button></div>
        <div className="card-body">
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>{dayName}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sites.map(s => {
              const existingCount = Object.keys((attendance[date] || {})[s.id] || {}).length;
              return (
                <div key={s.id}
                  style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, transition: "border-color 0.15s" }}
                  onMouseEnter={ev => ev.currentTarget.style.borderColor="#3b82f6"}
                  onMouseLeave={ev => ev.currentTarget.style.borderColor="var(--border)"}>
                  <div style={{ cursor: "pointer", flex: 1 }} onClick={() => goToStaff(s.id)}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    {s.location && <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.location}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {existingCount > 0
                      ? <span className="badge badge-green" style={{ cursor: "pointer" }} onClick={() => goToStaff(s.id)}>✓ {existingCount} entered</span>
                      : <span className="badge badge-gray" style={{ cursor: "pointer" }} onClick={() => goToStaff(s.id)}>Not entered</span>}
                    {isManager && existingCount > 0 && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAttendance(date, s.id)}
                        style={{ fontSize: 11, padding: "4px 10px" }}>🗑 Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
            {sites.length === 0 && <div className="alert alert-warning">No sites added yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ── STEP 3: Staff Picker ──
  if (step === "staff") return (
    <div>
      <StepBreadcrumb steps={STEPS} labels={["Date","Site","Staff","Attendance"]} current={step} onGoTo={i => { if(i===0) reset(); else if(i===1) setStep("site"); }} />
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Step 3 — Select Staff for {siteName}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{dayName}</div></div>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep("site")}>← Back</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {availableEmps.length === 0
            ? <div className="empty-state"><div className="icon">👷</div><p>All roster employees are assigned to other sites today.</p></div>
            : <>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  {selectedIds.length} of {availableEmps.length} selected
                  {takenOnDate.size > 0 && <span style={{ color: "var(--warning)", marginLeft: 8 }}>· {takenOnDate.size} at other sites</span>}
                </div>
                <div className="gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={selectAll}>Select All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setLocalAtt({})}>Clear</button>
                </div>
              </div>
              <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
                {availableEmps.map(e => {
                  const isSelected = !!localAtt[e.id];
                  const rType = roster[e.id]?.[day] || "W";
                  return (
                    <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isSelected ? "rgba(59,130,246,0.05)" : "transparent" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleEmp(e.id)} style={{ width: 18, height: 18, accentColor: "#3b82f6", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{e.empId}{e.designation ? ` · ${e.designation}` : ""}</div>
                      </div>
                      <span className={`badge ${ROSTER_BADGE[rType] || "badge-blue"}`}>R:{rType}</span>
                    </label>
                  );
                })}
              </div>
            </>
          }
        </div>
        {availableEmps.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setStep("site")}>Cancel</button>
            <button className="btn btn-primary" disabled={selectedIds.length === 0} onClick={() => setStep("attendance")}>
              Continue with {selectedIds.length} Staff →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── STEP 4: Mark Attendance (status + late only — NO OT) ──
  const attEmps = employees.filter(e => selectedIds.includes(e.id));
  const counts = { P:0, A:0, H:0, S:0, L:0, O:0 };
  attEmps.forEach(e => { const s = localAtt[e.id]?.status || "P"; counts[s] = (counts[s]||0)+1; });
  const filtered = attEmps.filter(e => filterStatus === "ALL" || localAtt[e.id]?.status === filterStatus);

  return (
    <div>
      <StepBreadcrumb steps={STEPS} labels={["Date","Site","Staff","Attendance"]} current={step} onGoTo={i => { if(i===0) reset(); else if(i===1){setStep("site");} else if(i===2) setStep("staff"); }} />

      <div style={{ background: "linear-gradient(135deg,#1a2a4a,#111827)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🏗 {siteName}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{dayName} · {attEmps.length} employees</div>
            <div style={{ fontSize: 11, color: "#06b6d4", marginTop: 4 }}>⏱ OT is entered separately under "OT Entry"</div>
          </div>
          <div className="gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setStep("staff")}>← Edit Staff</button>
            <button className="btn btn-ghost btn-sm" onClick={markAllPresent}>✓ All Present</button>
            <button className="btn btn-success btn-sm" onClick={saveAtt}>{saved ? "✓ Saved" : "💾 Save"}</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {Object.entries(STATUS_META).map(([code, meta]) => (
            <div key={code} onClick={() => setFilterStatus(f => f===code?"ALL":code)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 700, background: filterStatus===code ? meta.bg : "rgba(255,255,255,0.04)", color: filterStatus===code ? meta.color : "var(--text3)", border: `1px solid ${filterStatus===code ? meta.color : "transparent"}`, transition: "all 0.12s" }}>
              <span style={{ fontSize: 14, color: meta.color, fontFamily: "var(--mono)", fontWeight: 700 }}>{counts[code]||0}</span>{meta.label}
            </div>
          ))}
          {filterStatus !== "ALL" && <div onClick={() => setFilterStatus("ALL")} style={{ padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontSize: 11, color: "var(--text3)", border: "1px solid var(--border)", display: "flex", alignItems: "center" }}>✕ All</div>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(e => {
          const att = localAtt[e.id] || { status: "P", minutesLate: 0 };
          const meta = STATUS_META[att.status] || STATUS_META.P;
          const rType = roster[e.id]?.[day] || "W";
          const hasLate = att.minutesLate > 0;
          return (
            <div key={e.id} style={{ background: "var(--surface)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", borderLeft: `4px solid ${meta.color}` }}>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: meta.bg, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {e.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>{e.empId}</span>
                    {e.designation && <span style={{ fontSize: 10, color: "var(--text3)" }}>· {e.designation}</span>}
                    <span className={`badge ${ROSTER_BADGE[rType]||"badge-blue"}`} style={{ fontSize: 9 }}>R:{rType}</span>
                    {hasLate && <span className="badge badge-red" style={{ fontSize: 9 }}>Late {att.minutesLate}m</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_META).map(([code, m]) => (
                    <button key={code} onClick={() => setField(e.id, "status", code)}
                      style={{ padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 800, border: `2px solid ${att.status===code ? m.color : "var(--border)"}`, background: att.status===code ? m.bg : "var(--surface2)", color: att.status===code ? m.color : "var(--text3)", cursor: "pointer", transition: "all 0.1s", fontFamily: "var(--font)", minWidth: 38 }}>
                      {code}
                    </button>
                  ))}
                </div>
              </div>
              {/* Minutes Late row */}
              <div style={{ padding: "8px 14px 10px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>⏰ Mins Late:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setField(e.id, "minutesLate", Math.max(0, (att.minutesLate||0) - 5))}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface3)", color: "var(--text)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <input type="number" min="0" step="1" value={att.minutesLate||0}
                    onChange={x => setField(e.id, "minutesLate", Math.max(0, parseInt(x.target.value)||0))}
                    style={{ width: 56, background: "var(--surface3)", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 6, padding: "4px 6px", fontSize: 15, fontFamily: "var(--mono)", fontWeight: 800, textAlign: "center" }} />
                  <button onClick={() => setField(e.id, "minutesLate", (att.minutesLate||0) + 5)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface3)", color: "var(--text)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>mins</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 500 }}>
        {!saved
          ? <button className="btn btn-success" onClick={saveAtt} style={{ boxShadow: "0 4px 20px rgba(16,185,129,0.4)", padding: "12px 32px", fontSize: 14, borderRadius: 50 }}>💾 Save {siteName} Attendance</button>
          : <div style={{ display: "flex", gap: 10 }}>
              <span className="badge badge-green" style={{ padding: "10px 18px", fontSize: 12 }}>✓ Saved</span>
              <button className="btn btn-primary" onClick={() => { setSaved(false); setStep("site"); setLocalAtt({}); setSiteId(""); }} style={{ borderRadius: 50, padding: "10px 20px" }}>+ Add Another Site</button>
            </div>
        }
      </div>
      <div style={{ height: 70 }} />
    </div>
  );
}
