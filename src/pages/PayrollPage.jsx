import { useState } from "react";
import { getSalaryForMonth, isEmpActiveOnDate, EMP_STATUS_META } from "../constants/employees";
import { getDaysInMonth, fmt, mvr, genId, isFriday } from "../utils/helpers";
import { downloadPayrollExcel } from "../utils/excel";

export default function PayrollPage({ employees, sites, attendance, ot, rosters, deductions, toast }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [siteId, setSiteId] = useState("");
  const [selected, setSelected] = useState(null);
  const [phoneAllowances, setPhoneAllowances] = useState({});

  // Bonus/extra allowance — { [empId]: { name, amount } }
  const [bonuses, setBonuses] = useState({});
  // Bulk bonus UI
  const [bulkBonus, setBulkBonus] = useState({ name: "", amount: "" });
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [showBulkBonus, setShowBulkBonus] = useState(false);

  const [viewMode, setViewMode] = useState("actual"); // "actual" | "projected"

  const monthsClean = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthKey = `${year}-${String(month+1).padStart(2,"0")}`;
  const totalDays = getDaysInMonth(year, month);

  // Is this the current month?
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  // How many days to calculate up to:
  // actual mode + current month → only up to today's date
  // projected mode or past/future month → full month
  const calcUpTo = (mode) => {
    if (mode === "actual" && isCurrentMonth) return today.getDate();
    return totalDays;
  };

  // Global roster (no site) — all employees in this month's roster
  const globalRoster = rosters[monthKey] || {};
  const siteEmps = employees.filter(e => Object.keys(globalRoster).includes(e.id));

  // Count active days up to a given day number
  const getActiveDaysUpTo = (emp, upTo) => {
    const st = emp.empStatus || "active";
    if (st === "active") return upTo;
    if (!emp.statusDate) return 0;
    const statusD = new Date(emp.statusDate + "T00:00:00");
    const monthStart = new Date(year, month, 1);
    const lastDay = new Date(year, month, upTo);
    if (statusD <= monthStart) return 0;
    if (statusD > lastDay) return upTo;
    return statusD.getDate() - 1;
  };

  const calcPayroll = (emp, mode = viewMode) => {
    const empRoster = globalRoster[emp.id] || {};
    const upTo = calcUpTo(mode);
    const activeDays = getActiveDaysUpTo(emp, upTo);

    let presentDays = 0, absentDays = 0, halfDays = 0, sickDays = 0, leaveDays = 0;
    let holidayDays = 0, offDays = 0, enteredWorkDays = 0;
    let genOT = 0, concreteOT = 0, cementOT = 0, minutesLate = 0;
    let holidayOTBelow = 0, holidayOTFull = 0;

    for (let d = 1; d <= upTo; d++) {
      const dk = `${monthKey}-${String(d).padStart(2,"00")}`;
      const activeOnDay = isEmpActiveOnDate(emp, dk);
      if (!activeOnDay) continue;

      // Roster type — live from roster
      const rType = empRoster[d] || (isFriday(year, month, d) ? "H" : "W");

      // OT record
      const otDayData = (ot || {})[dk] || {};
      let otRec = null;
      for (const sid of Object.keys(otDayData)) {
        if (otDayData[sid]?.[emp.id]) { otRec = otDayData[sid][emp.id]; break; }
      }

      if (rType === "H") {
        // Holiday from roster — always counts (no attendance needed)
        holidayDays++;
        if (otRec && (otRec.genOT || 0) > 0) {
          const hrs = otRec.genOT || 0;
          if (hrs >= 9.5) holidayOTFull++;
          else holidayOTBelow += hrs;
        }
      } else if (rType === "O") {
        // Off day from roster — counts as off, no pay
        offDays++;
      } else {
        // Work day — ONLY count if attendance was actually entered
        const dayData = attendance[dk] || {};
        let a = null;
        for (const sid of Object.keys(dayData)) {
          if (dayData[sid]?.[emp.id]) { a = dayData[sid][emp.id]; break; }
        }

        if (a) {
          // Attendance entered — count it
          enteredWorkDays++;
          if (a.status === "P") presentDays++;
          else if (a.status === "A") absentDays++;
          else if (a.status === "H") halfDays++;
          else if (a.status === "S") { sickDays++; } // sick tracked separately
          else if (a.status === "L") {
            // Fix 3: Days 1-30 of leave → leaveDays (basic only)
            // Day 31+ of consecutive leave → absentDays (no basic, no allowances)
            if (emp.empStatus === "leave" && emp.statusDate) {
              const leaveStart = new Date(emp.statusDate + "T00:00:00");
              const thisDay    = new Date(dk + "T00:00:00");
              const daysDiff   = Math.floor((thisDay - leaveStart) / (1000 * 60 * 60 * 24));
              if (daysDiff >= 30) {
                absentDays++; // treated as absent after 30 consecutive leave days
              } else {
                leaveDays++;
              }
            } else {
              leaveDays++;
            }
          }
          minutesLate += a.minutesLate || 0;
        } else if (mode === "projected") {
          // Projected mode — assume present for days not yet entered
          presentDays++;
          enteredWorkDays++;
        }
        // actual mode + no attendance = skip day entirely (not counted)

        if (otRec) {
          genOT += otRec.genOT || 0;
          concreteOT += otRec.concreteOT || 0;
          cementOT += otRec.cementOT || 0;
        }
      }
    }

    // Fix 1: Look up salary from history for the month being calculated
    const salaryRec        = getSalaryForMonth(emp, year, month);
    const basicSalary      = salaryRec.basicSalary;
    const attendanceAllow_ = salaryRec.attendanceAllowance;
    const foodAllow_       = salaryRec.foodAllowance;
    const phoneAllow_      = Number(phoneAllowances[emp.id] ?? salaryRec.phoneAllowance) || 0;
    const accommodationAllow_ = salaryRec.accommodationAllowance;

    // Daily rates — always based on total days in month
    const dailyBasic    = basicSalary      / (totalDays || 1);
    const dailyAttAllow = attendanceAllow_  / (totalDays || 1);
    const dailyFood     = foodAllow_        / (totalDays || 1);
    const dailyPhone    = phoneAllow_       / (totalDays || 1);
    const dailyAccom    = accommodationAllow_ / (totalDays || 1);

    // Basic salary breakdown
    // sick = no basic (like absent), half = half basic, leave = basic only, absent = no basic
    const basicForWork    = dailyBasic * (presentDays + halfDays * 0.5); // present full + half at 50%
    const basicForLeave   = dailyBasic * leaveDays;                       // leave = basic only
    const basicForHoliday = dailyBasic * holidayDays;                     // holidays = basic
    // absent + sick days = no basic
    const basicEarned     = basicForWork + basicForLeave + basicForHoliday;

    // Attendance allowance:
    // - Present (full day) → full daily att allowance
    // - Half day → half daily att allowance
    // - Holiday → full daily att allowance
    // - Sick, Absent, Leave, Off → NO attendance allowance
    const attAllowEarned  = dailyAttAllow * (presentDays + halfDays * 0.5 + holidayDays);

    // Holiday OT
    const holidayAllowBelow = holidayOTBelow * 30;
    const holidayAllowFull  = holidayOTFull  * (attendanceAllow_ * 1.5);
    const holidayAllow      = holidayAllowBelow + holidayAllowFull;

    // Late deduction
    const lateDeduct = minutesLate * (dailyBasic / (8 * 60));

    // OT
    const genOTAmount      = genOT      * (Number(emp.otRate)     || 20);
    const concreteOTAmount = concreteOT * (Number(emp.concreteOT) || 200);
    const cementOTAmount   = cementOT   * (Number(emp.cementOT)   || 100);

    // Food, phone, accommodation:
    // Paid as full monthly amount as long as employee is active.
    // If status changed mid-month, pro-rate by activeDays / totalDays only.
    // NOT affected by present/absent/leave/sick — only by active status.
    const foodAllow        = +(dailyFood  * activeDays).toFixed(2);
    const phoneAllow       = +(dailyPhone * activeDays).toFixed(2);
    const accommodationAllow = +(dailyAccom * activeDays).toFixed(2);

    // Tea — present days only
    const teaAllow = presentDays * 10;

    // Bonus
    const bonusRec    = bonuses[emp.id] || {};
    const bonusAmount = Number(bonusRec.amount) || 0;
    const bonusName   = bonusRec.name || "";

    // Deductions — full amounts always
    const ded = deductions[emp.id] || {};
    const utilityDeduct = Number(ded.utility) || 0;
    const advanceDeduct = Number(ded.advance) || 0;
    const loanDeduct    = Number(ded.loanInstallment) || 0;

    const grossEarnings   = basicEarned + attAllowEarned + holidayAllow + genOTAmount + concreteOTAmount + cementOTAmount + foodAllow + teaAllow + phoneAllow + accommodationAllow + bonusAmount;
    const totalDeductions = lateDeduct + utilityDeduct + advanceDeduct + loanDeduct;
    const netPay          = grossEarnings - totalDeductions;

    return {
      presentDays, absentDays, halfDays, sickDays, leaveDays, holidayDays, offDays,
      enteredWorkDays, activeDays, upTo,
      genOT, concreteOT, cementOT, minutesLate,
      holidayOTBelow, holidayOTFull, holidayAllowBelow, holidayAllowFull,
      basicEarned, basicForWork, basicForLeave, basicForHoliday,
      attendanceAllow: attAllowEarned, holidayAllow,
      genOTAmount, concreteOTAmount, cementOTAmount,
      foodAllow, teaAllow, phoneAllow, accommodationAllow,
      bonusAmount, bonusName,
      lateDeduct, utilityDeduct, advanceDeduct, loanDeduct,
      grossEarnings, totalDeductions, netPay,
      dailyBasic, dailyFood, dailyPhone, dailyAttAllow, dailyAccom
    };
  };

  const applyBulkBonus = () => {
    if (!bulkBonus.name || !bulkBonus.amount) return toast("Enter bonus name and amount", "error");
    const next = { ...bonuses };
    bulkSelected.forEach(id => { next[id] = { name: bulkBonus.name, amount: +bulkBonus.amount }; });
    setBonuses(next);
    setShowBulkBonus(false);
    setBulkBonus({ name: "", amount: "" });
    setBulkSelected(new Set());
    toast(`Bonus applied to ${bulkSelected.size} employees`, "success");
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-body">
          <div className="gap-3" style={{ flexWrap: "wrap" }}>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
                {monthsClean.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Filter by Site</label>
              <select className="form-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">All Sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end" }}>
              <label className="form-label">&nbsp;</label>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                <button onClick={() => setViewMode("actual")} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "var(--font)", background: viewMode === "actual" ? "#3b82f6" : "var(--surface2)", color: viewMode === "actual" ? "#fff" : "var(--text3)", transition: "all 0.15s" }}>
                  📋 Actual {isCurrentMonth && viewMode === "actual" ? `(1–${today.getDate()})` : ""}
                </button>
                <button onClick={() => setViewMode("projected")} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", borderLeft: "1px solid var(--border)", fontFamily: "var(--font)", background: viewMode === "projected" ? "#8b5cf6" : "var(--surface2)", color: viewMode === "projected" ? "#fff" : "var(--text3)", transition: "all 0.15s" }}>
                  🔮 Full Month
                </button>
              </div>
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end" }}>
              <label className="form-label">&nbsp;</label>
              <button className="btn btn-warning btn-sm" style={{ color: "#000" }} onClick={() => setShowBulkBonus(true)}>🎁 Add Bonus / Allowance</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Bonus Modal */}
      {showBulkBonus && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">🎁 Add Bonus / Extra Allowance</div>
              <button className="modal-close" onClick={() => setShowBulkBonus(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Allowance Name</label>
                  <input className="form-input" value={bulkBonus.name} onChange={e => setBulkBonus(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ramadan Allowance, Bonus" />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (MVR)</label>
                  <input className="form-input" type="number" value={bulkBonus.amount} onChange={e => setBulkBonus(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Select Employees ({bulkSelected.size} selected)
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setBulkSelected(new Set(siteEmps.map(e => e.id)))}>Select All</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setBulkSelected(new Set())}>Clear</button>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                {siteEmps.map(e => {
                  const isSelected = bulkSelected.has(e.id);
                  const existingBonus = bonuses[e.id];
                  return (
                    <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isSelected ? "rgba(245,158,11,0.07)" : "transparent" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => setBulkSelected(p => { const n = new Set(p); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })} style={{ width: 16, height: 16, accentColor: "#f59e0b" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{e.empId}</div>
                      </div>
                      {existingBonus && <span className="badge badge-yellow" style={{ fontSize: 9 }}>{existingBonus.name}: MVR {existingBonus.amount}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowBulkBonus(false)}>Cancel</button>
              <button className="btn btn-warning" style={{ color: "#000" }} disabled={bulkSelected.size === 0} onClick={applyBulkBonus}>
                Apply to {bulkSelected.size} Employee{bulkSelected.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <div>
            <div className="card-title">Payroll Summary — {monthsClean[month]} {year}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
              {viewMode === "actual"
                ? isCurrentMonth
                  ? `📋 Actual — showing salary based on attendance entered so far (1–${today.getDate()} ${monthsClean[month]})`
                  : `📋 Actual — based on attendance entered for ${monthsClean[month]} ${year}`
                : `🔮 Full Month Projection — assumes present for all remaining days`}
            </div>
          </div>
          <button className="btn btn-success btn-sm" onClick={() => downloadPayrollExcel({ employees: siteEmps, months: monthsClean, month, year, calcPayroll })}>
            ⬇ Download Excel
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Employee</th><th>ID</th><th>Active Days</th><th>Present</th><th>Absent</th><th>Basic Earned</th><th>OT Total</th><th>Allowances</th><th>Bonus</th><th>Deductions</th><th>Net Pay</th><th></th></tr>
            </thead>
            <tbody>
              {siteEmps.length === 0 ? (
                <tr><td colSpan={12}><div className="empty-state"><p>No employees in roster for {monthsClean[month]} {year}</p></div></td></tr>
              ) : siteEmps.map(e => {
                const p = calcPayroll(e);
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td className="text-mono" style={{ color: "var(--accent)" }}>{e.empId}</td>
                    <td><span className="badge badge-blue">{p.activeDays}/{totalDays}</span></td>
                    <td><span className="badge badge-green">{p.presentDays}</span></td>
                    <td><span className="badge badge-red">{p.absentDays}</span></td>
                    <td className="text-mono">{mvr(p.basicEarned)}</td>
                    <td className="text-mono">{mvr(p.genOTAmount + p.concreteOTAmount + p.cementOTAmount)}</td>
                    <td className="text-mono">{mvr(p.attendanceAllow + p.foodAllow + p.teaAllow + p.phoneAllow + p.accommodationAllow)}</td>
                    <td className="text-mono">{p.bonusAmount > 0 ? <span className="badge badge-yellow">{mvr(p.bonusAmount)}</span> : "—"}</td>
                    <td className="text-mono" style={{ color: "var(--danger)" }}>{mvr(p.totalDeductions)}</td>
                    <td className="text-mono" style={{ color: "var(--success)", fontWeight: 700 }}>{mvr(p.netPay)}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => setSelected(e)}>Slip</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (() => {
        const p = calcPayroll(selected);
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 580 }}>
              <div className="modal-header">
                <div className="modal-title">Pay Slip — {monthsClean[month]} {year}</div>
                <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <div className="payslip">
                  <div className="payslip-header">
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{selected.empId} | {selected.designation || "—"}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      {monthsClean[month]} {year} · {viewMode === "actual" ? `Actual (1–${p.upTo})` : "Full Month Projection"}
                      {" · "}Active {p.activeDays} days
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                      {[["Present",p.presentDays,"#10b981"],["Absent",p.absentDays,"#ef4444"],["Half Day",p.halfDays,"#f59e0b"],["Sick",p.sickDays,"#8b5cf6"],["Leave",p.leaveDays,"#94a3b8"],["Holiday",p.holidayDays,"#06b6d4"],["Off",p.offDays,"#64748b"]].map(([l,v,c]) => v > 0 ? (
                        <div key={l} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: "var(--mono)" }}>{v}</div>
                          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  {(() => {
                    const salaryRec = getSalaryForMonth(selected, year, month);
                    const histEntry = (selected.salaryHistory || [])
                      .filter(h => h.effectiveDate <= `${year}-${String(month+1).padStart(2,"0")}-01`)
                      .sort((a,b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
                    return histEntry ? (
                      <div style={{ padding: "6px 20px", background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.15)", fontSize: 11, color: "#93c5fd", display: "flex", alignItems: "center", gap: 6 }}>
                        📅 Salary from history entry effective <strong>{histEntry.effectiveDate}</strong> — Basic: MVR {salaryRec.basicSalary}
                      </div>
                    ) : null;
                  })()}
                  <div style={{ padding: "12px 0" }}>
                    <div style={{ padding: "4px 20px 8px", fontSize: 10, fontWeight: 700, color: "#06b6d4", letterSpacing: 1, textTransform: "uppercase" }}>Earnings</div>
                    {[
                      ["Basic Salary (Work Days)", p.basicForWork, `${p.presentDays}P + ${p.halfDays}×½ days × ${mvr(p.dailyBasic)}/day`],
                      ["Basic Salary (Leave Days)", p.basicForLeave, `${p.leaveDays} days × ${mvr(p.dailyBasic)}/day`],
                      ["Basic Salary (Holidays)", p.basicForHoliday, `${p.holidayDays} days × ${mvr(p.dailyBasic)}/day`],
                      ["Attendance Allowance", p.attendanceAllow, `${p.presentDays}P + ${p.halfDays}×½ + ${p.holidayDays}H days × ${mvr(p.dailyAttAllow)}/day`],
                      ...(p.holidayAllowBelow > 0 ? [["Holiday OT (< 9.5 hrs)", p.holidayAllowBelow, `${p.holidayOTBelow.toFixed(1)} hrs × MVR30`]] : []),
                      ...(p.holidayAllowFull  > 0 ? [["Holiday OT (≥ 9.5 hrs)", p.holidayAllowFull,  `${p.holidayOTFull} day(s) × 1.5× attendance`]] : []),
                      ["General OT", p.genOTAmount, `${p.genOT} hrs`],
                      ["Concrete OT", p.concreteOTAmount, `${p.concreteOT} units`],
                      ["Cement OT", p.cementOTAmount, `${p.cementOT} units`],
                      ["Accommodation Allowance", p.accommodationAllow, `${p.activeDays} active days × ${mvr(p.dailyAccom)}/day`],
                      ["Food Allowance", p.foodAllow, `${p.activeDays} active days × ${mvr(p.dailyFood)}/day`],
                      ["Tea Allowance", p.teaAllow, `${p.presentDays} present days × MVR10`],
                      ["Phone Allowance", p.phoneAllow, `${p.activeDays} active days × ${mvr(p.dailyPhone)}/day`],
                      ...(p.bonusAmount > 0 ? [[p.bonusName || "Bonus", p.bonusAmount]] : []),
                    ].filter(r => r[1] > 0).map(([l, v, note]) => (
                      <div key={l} className="payslip-row">
                        <div>{l}{note ? <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>({note})</span> : ""}</div>
                        <div className="amount" style={{ color: "var(--success)" }}>{mvr(v)}</div>
                      </div>
                    ))}

                    <div className="payslip-row total">
                      <div>Gross Earnings</div>
                      <div className="amount" style={{ color: "var(--success)" }}>{mvr(p.grossEarnings)}</div>
                    </div>

                    <div style={{ padding: "4px 20px 8px", fontSize: 10, fontWeight: 700, color: "#ef4444", letterSpacing: 1, textTransform: "uppercase", marginTop: 8 }}>Deductions</div>
                    {[
                      ["Late Deduction", p.lateDeduct, `${p.minutesLate} mins`],
                      ["Utility", p.utilityDeduct],
                      ["Advance", p.advanceDeduct],
                      ["Loan Installment", p.loanDeduct],
                    ].filter(r => r[1] > 0).map(([l, v, note]) => (
                      <div key={l} className="payslip-row deduct">
                        <div>{l}{note ? <span style={{ fontSize: 10, marginLeft: 6 }}>({note})</span> : ""}</div>
                        <div className="amount">- {mvr(v)}</div>
                      </div>
                    ))}

                    <div className="payslip-row total" style={{ background: "rgba(16,185,129,0.1)", fontSize: 16 }}>
                      <div style={{ fontWeight: 800 }}>NET PAY</div>
                      <div className="amount" style={{ color: "var(--success)", fontSize: 18 }}>{mvr(p.netPay)}</div>
                    </div>

                    {/* Per-employee overrides */}
                    <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>Manual Overrides</div>
                      <div className="form-grid form-grid-2">
                        <div className="form-group">
                          <label className="form-label">Phone Allowance (MVR)</label>
                          <input className="form-input" type="number" value={phoneAllowances[selected.id] ?? (selected.phoneAllowance || 0)}
                            onChange={e => setPhoneAllowances(prev => ({ ...prev, [selected.id]: +e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{bonuses[selected.id]?.name || "Bonus"} Name</label>
                          <input className="form-input" value={bonuses[selected.id]?.name || ""}
                            onChange={e => setBonuses(p => ({ ...p, [selected.id]: { ...p[selected.id], name: e.target.value } }))}
                            placeholder="e.g. Ramadan Allowance" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Bonus Amount (MVR)</label>
                          <input className="form-input" type="number" value={bonuses[selected.id]?.amount || 0}
                            onChange={e => setBonuses(p => ({ ...p, [selected.id]: { ...p[selected.id], amount: +e.target.value } }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { toast("Pay slip saved!", "success"); setSelected(null); }}>Confirm & Save</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
