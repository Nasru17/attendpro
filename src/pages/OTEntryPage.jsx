import { useState, useMemo } from "react";
import { isEmpActiveOnDate } from "../constants/employees";
import { genId, getDayName, getDaysInMonth, isFriday } from "../utils/helpers";
import StepBreadcrumb from "../components/StepBreadcrumb";
import OTStepper from "../components/OTStepper";

export default function OTEntryPage({ employees, sites, attendance, ot, setOt, rosters, toast }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState("date");
  const [date, setDate] = useState(todayStr);
  const [siteId, setSiteId] = useState("");
  const [localOt, setLocalOt] = useState({});
  const [saved, setSaved] = useState(false);

  const dateObj = new Date(date + "T00:00:00");
  const dayName = dateObj.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const siteName = sites.find(s => s.id === siteId)?.name || "";

  // Employees who worked today (Present or Half Day) in any site's attendance
  const workedToday = useMemo(() => {
    const ids = new Set();
    Object.values(attendance[date] || {}).forEach(siteMap => {
      Object.entries(siteMap).forEach(([eid, a]) => {
        if (a.status === "P" || a.status === "H") ids.add(eid);
      });
    });
    return ids;
  }, [attendance, date]);

  // Employees eligible for OT = those who worked on this date AND were active on this date
  const eligibleEmps = employees.filter(e => workedToday.has(e.id) && isEmpActiveOnDate(e, date));

  // Employees already assigned OT at another site today
  const otTakenElsewhere = useMemo(() => {
    const taken = new Set();
    Object.entries(ot[date] || {}).forEach(([sid, empMap]) => {
      if (sid === siteId) return;
      Object.keys(empMap).forEach(eid => taken.add(eid));
    });
    return taken;
  }, [ot, date, siteId]);

  const availableForOT = eligibleEmps.filter(e => !otTakenElsewhere.has(e.id));
  const selectedIds = Object.keys(localOt);

  const reset = () => { setStep("date"); setSiteId(""); setLocalOt({}); setSaved(false); };

  const goToStaff = (sid) => {
    setSiteId(sid);
    const existing = (ot[date] || {})[sid] || {};
    if (Object.keys(existing).length > 0) {
      setLocalOt(JSON.parse(JSON.stringify(existing)));
      setSaved(false); setStep("ot");
    } else {
      setLocalOt({}); setSaved(false); setStep("staff");
    }
  };

  const toggleEmp = (empId) => {
    setLocalOt(p => {
      const next = { ...p };
      if (next[empId]) delete next[empId];
      else next[empId] = { genOT: 0, concreteOT: 0, cementOT: 0 };
      return next;
    });
  };

  const setOtField = (empId, field, val) => { setLocalOt(p => ({ ...p, [empId]: { ...p[empId], [field]: val } })); setSaved(false); };
  const saveOt = () => { setOt(p => ({ ...p, [date]: { ...(p[date] || {}), [siteId]: localOt } })); setSaved(true); toast("OT saved!", "success"); };

  const STEPS = ["date","site","staff","ot"];

  // Helper: find which site an employee attended today
  const getAttSite = (empId) => {
    const dayData = attendance[date] || {};
    for (const [sid, siteMap] of Object.entries(dayData)) {
      if (siteMap[empId]) return sites.find(s => s.id === sid)?.name || sid;
    }
    return "—";
  };

  // ── STEP 1: Date ──
  if (step === "date") return (
    <div>
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="card-header"><div className="card-title">Step 1 — Select Date</div></div>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">OT Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>{dayName}</div>
          </div>
          {eligibleEmps.length === 0
            ? <div className="alert alert-warning" style={{ marginBottom: 16 }}>⚠ No attendance entered for {date} yet. Enter attendance first.</div>
            : <div className="alert alert-info" style={{ marginBottom: 16 }}>ℹ {eligibleEmps.length} employees worked today and are eligible for OT.</div>
          }
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={eligibleEmps.length === 0} onClick={() => setStep("site")}>
            Next → Select OT Site
          </button>
        </div>
      </div>
      {Object.keys((ot[date] || {})).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>OT already entered on {date}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(ot[date]).map(([sid, empMap]) => {
              const s = sites.find(x => x.id === sid);
              const empCount = Object.keys(empMap).length;
              return (
                <div key={sid} className="card" style={{ cursor: "pointer" }} onClick={() => goToStaff(sid)}>
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><div style={{ fontWeight: 700 }}>{s?.name || sid}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{empCount} employees with OT</div></div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="badge badge-yellow">⏱ OT Saved</span>
                      <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
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

  // ── STEP 2: OT Site ──
  if (step === "site") return (
    <div>
      <StepBreadcrumb steps={STEPS} labels={["Date","OT Site","Staff","Enter OT"]} current={step} onGoTo={i => { if(i===0) reset(); }} />
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Step 2 — Select OT Site</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>The site where OT work was performed (can differ from attendance site)</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={reset}>← Back</button>
        </div>
        <div className="card-body">
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>{dayName}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sites.map(s => {
              const existingCount = Object.keys((ot[date] || {})[s.id] || {}).length;
              return (
                <div key={s.id} onClick={() => goToStaff(s.id)}
                  style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color 0.15s" }}
                  onMouseEnter={ev => ev.currentTarget.style.borderColor="#f59e0b"}
                  onMouseLeave={ev => ev.currentTarget.style.borderColor="var(--border)"}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    {s.location && <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.location}</div>}
                  </div>
                  {existingCount > 0 ? <span className="badge badge-yellow">⏱ {existingCount} OT entries</span> : <span className="badge badge-gray">No OT yet</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ── STEP 3: Staff Picker for OT ──
  if (step === "staff") return (
    <div>
      <StepBreadcrumb steps={STEPS} labels={["Date","OT Site","Staff","Enter OT"]} current={step} onGoTo={i => { if(i===0) reset(); else if(i===1) setStep("site"); }} />
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Step 3 — Select Staff for OT at {siteName}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Only employees who worked today are shown · Can be from any attendance site</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep("site")}>← Back</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {availableForOT.length === 0
            ? <div className="empty-state"><div className="icon">⏱</div><p>All eligible employees already have OT entered at another site today.</p></div>
            : <>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  {selectedIds.length} selected · {availableForOT.length} eligible
                  {otTakenElsewhere.size > 0 && <span style={{ color: "var(--warning)", marginLeft: 8 }}>· {otTakenElsewhere.size} already have OT elsewhere</span>}
                </div>
                <div className="gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => { const n={}; availableForOT.forEach(e=>{n[e.id]=localOt[e.id]||{genOT:0,concreteOT:0,cementOT:0};}); setLocalOt(n); }}>Select All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setLocalOt({})}>Clear</button>
                </div>
              </div>
              <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
                {availableForOT.map(e => {
                  const isSelected = !!localOt[e.id];
                  const attSite = getAttSite(e.id);
                  return (
                    <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isSelected ? "rgba(245,158,11,0.05)" : "transparent" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleEmp(e.id)} style={{ width: 18, height: 18, accentColor: "#f59e0b", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{e.empId}{e.designation ? ` · ${e.designation}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>Attended at</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#06b6d4" }}>{attSite}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          }
        </div>
        {availableForOT.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setStep("site")}>Cancel</button>
            <button className="btn btn-warning" disabled={selectedIds.length === 0} onClick={() => setStep("ot")} style={{ color: "#000" }}>
              Enter OT for {selectedIds.length} Staff →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── STEP 4: Enter OT amounts ──
  const otEmps = employees.filter(e => selectedIds.includes(e.id));

  return (
    <div>
      <StepBreadcrumb steps={STEPS} labels={["Date","OT Site","Staff","Enter OT"]} current={step} onGoTo={i => { if(i===0) reset(); else if(i===1) setStep("site"); else if(i===2) setStep("staff"); }} />

      <div style={{ background: "linear-gradient(135deg,#1a2a1a,#111827)", border: "1px solid #f59e0b44", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>⏱ OT at {siteName}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{dayName} · {otEmps.length} employees</div>
          </div>
          <div className="gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setStep("staff")}>← Edit Staff</button>
            <button className="btn btn-warning btn-sm" onClick={saveOt} style={{ color: "#000" }}>{saved ? "✓ Saved" : "💾 Save OT"}</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {otEmps.map(e => {
          const rec = localOt[e.id] || { genOT: 0, concreteOT: 0, cementOT: 0 };
          const attSite = getAttSite(e.id);
          const totalOT = (rec.genOT||0) + (rec.concreteOT||0) + (rec.cementOT||0);
          return (
            <div key={e.id} style={{ background: "var(--surface)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", borderLeft: `4px solid #f59e0b` }}>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(245,158,11,0.15)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {e.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>{e.empId}</span>
                    <span style={{ fontSize: 10, color: "#06b6d4" }}>Attended: {attSite}</span>
                    {totalOT > 0 && <span className="badge badge-yellow" style={{ fontSize: 9 }}>OT entered</span>}
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 16px", background: "var(--surface2)", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                  <OTStepper label="General OT" unit="hrs" step={0.5} color="#3b82f6" value={rec.genOT} onChange={v => setOtField(e.id, "genOT", v)} />
                  <OTStepper label="Concrete OT" unit="units" step={1} color="#06b6d4" value={rec.concreteOT} onChange={v => setOtField(e.id, "concreteOT", v)} />
                  <OTStepper label="Cement OT" unit="units" step={1} color="#8b5cf6" value={rec.cementOT} onChange={v => setOtField(e.id, "cementOT", v)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 500 }}>
        {!saved
          ? <button className="btn btn-warning" onClick={saveOt} style={{ boxShadow: "0 4px 20px rgba(245,158,11,0.4)", padding: "12px 32px", fontSize: 14, borderRadius: 50, color: "#000" }}>💾 Save OT for {siteName}</button>
          : <div style={{ display: "flex", gap: 10 }}>
              <span className="badge badge-yellow" style={{ padding: "10px 18px", fontSize: 12 }}>✓ OT Saved</span>
              <button className="btn btn-ghost" onClick={() => { setSaved(false); setStep("site"); setLocalOt({}); setSiteId(""); }} style={{ borderRadius: 50, padding: "10px 20px" }}>+ Add Another Site</button>
            </div>
        }
      </div>
      <div style={{ height: 70 }} />
    </div>
  );
}
