import { useState, useMemo } from "react";
import { getSalaryForMonth, isEmpActiveOnDate, EMP_STATUS_META } from "../constants/employees";
import { getDaysInMonth, mvr, isFriday } from "../utils/helpers";
import { getXLSX } from "../utils/excel";

export default function StatisticsPage({ employees, sites, attendance, ot, rosters, deductions }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tab, setTab]     = useState("salary"); // salary | ot | attendance | headcount
  const [siteFilter, setSiteFilter] = useState(""); // "" = all

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthKey = `${year}-${String(month+1).padStart(2,"0")}`;
  const totalDays = getDaysInMonth(year, month);
  const globalRoster = rosters[monthKey] || {};

  // ── salary helpers (same logic as calcPayroll but site-aware) ──
  // Daily salary expense for one employee on one day, attributed to the attendance site
  // Returns { siteId, basic, attAllow, food, phone, accom, tea }
  const getDailySalaryExpense = (emp, dk) => {
    const sal = getSalaryForMonth(emp, year, month);
    const dailyBasic    = sal.basicSalary    / (totalDays || 1);
    const dailyAtt      = sal.attendanceAllowance / (totalDays || 1);
    const dailyFood     = sal.foodAllowance  / (totalDays || 1);
    const dailyPhone    = sal.phoneAllowance / (totalDays || 1);
    const dailyAccom    = sal.accommodationAllowance / (totalDays || 1);

    // Find attendance record — note which site
    const dayData = attendance[dk] || {};
    let foundSite = null;
    let rec = null;
    for (const sid of Object.keys(dayData)) {
      if (dayData[sid]?.[emp.id]) { foundSite = sid; rec = dayData[sid][emp.id]; break; }
    }
    if (!rec) return null;

    const status = rec.status;
    let basic = 0, attAllow = 0;
    if (status === "P")      { basic = dailyBasic;       attAllow = dailyAtt; }
    else if (status === "H") { basic = dailyBasic * 0.5; attAllow = dailyAtt * 0.5; }
    else if (status === "L") { basic = dailyBasic; }
    // A, S → 0 basic, 0 attAllow

    const rType = globalRoster[emp.id]?.[(+dk.slice(-2))] || (isFriday(year, month, +dk.slice(-2)) ? "H" : "W");
    if (rType === "H") { basic = dailyBasic; attAllow = dailyAtt; } // holiday from roster

    const tea = status === "P" ? 10 : 0;

    return { siteId: foundSite, basic, attAllow, food: dailyFood, phone: dailyPhone, accom: dailyAccom, tea };
  };

  // Build site-wise salary expense summary for the month
  const salarySiteSummary = useMemo(() => {
    const empSet = Object.keys(globalRoster);
    const siteMap = {}; // siteId → { basic, attAllow, food, phone, accom, tea, total }
    const empDetails = {}; // empId → { name, empId, siteId→{...} }
    const noSiteKey = "__nosit__";

    employees.filter(e => empSet.includes(e.id)).forEach(emp => {
      for (let d = 1; d <= totalDays; d++) {
        const dk = `${monthKey}-${String(d).padStart(2,"00")}`;
        if (!isEmpActiveOnDate(emp, dk)) continue;
        const rType = globalRoster[emp.id]?.[d] || (isFriday(year, month, d) ? "H" : "W");

        // Food/phone/accom are active-day-based (not site-based) — attribute to a dummy "company" row
        // But per requirement: daily salary → site of attendance; OT → OT site
        const exp = getDailySalaryExpense(emp, dk);
        const sid = exp?.siteId || (rType === "H" || rType === "O" ? noSiteKey : noSiteKey);

        if (!siteMap[sid]) siteMap[sid] = { basic:0, attAllow:0, food:0, phone:0, accom:0, tea:0, headcount:new Set() };
        if (exp) {
          siteMap[sid].basic    += exp.basic;
          siteMap[sid].attAllow += exp.attAllow;
          siteMap[sid].food     += exp.food;
          siteMap[sid].phone    += exp.phone;
          siteMap[sid].accom    += exp.accom;
          siteMap[sid].tea      += exp.tea;
          siteMap[sid].headcount.add(emp.id);
        }

        // Employee detail row
        if (!empDetails[emp.id]) empDetails[emp.id] = { name:emp.name, empId:emp.empId, sites:{} };
        if (exp) {
          if (!empDetails[emp.id].sites[sid]) empDetails[emp.id].sites[sid] = { basic:0, attAllow:0, food:0, phone:0, accom:0, tea:0 };
          const s = empDetails[emp.id].sites[sid];
          s.basic    += exp.basic;
          s.attAllow += exp.attAllow;
          s.food     += exp.food;
          s.phone    += exp.phone;
          s.accom    += exp.accom;
          s.tea      += exp.tea;
        }
      }
    });

    // Convert headcount sets to counts
    Object.values(siteMap).forEach(s => { s.headcount = s.headcount.size; });
    return { siteMap, empDetails, noSiteKey };
  }, [employees, globalRoster, attendance, monthKey, totalDays, year, month]);

  // OT site summary
  const otSiteSummary = useMemo(() => {
    const siteMap = {};
    const empRows = [];
    const empSet = Object.keys(globalRoster);

    employees.filter(e => empSet.includes(e.id)).forEach(emp => {
      const empRow = { name:emp.name, empId:emp.empId, sites:{} };
      for (let d = 1; d <= totalDays; d++) {
        const dk = `${monthKey}-${String(d).padStart(2,"00")}`;
        const otDay = ot?.[dk] || {};
        Object.entries(otDay).forEach(([sid, empMap]) => {
          const rec = empMap[emp.id];
          if (!rec) return;
          const genAmt      = (rec.genOT      || 0) * (Number(emp.otRate)     || 20);
          const concreteAmt = (rec.concreteOT || 0) * (Number(emp.concreteOT) || 200);
          const cementAmt   = (rec.cementOT   || 0) * (Number(emp.cementOT)   || 100);
          const total = genAmt + concreteAmt + cementAmt;
          if (total === 0) return;

          if (!siteMap[sid]) siteMap[sid] = { genOT:0, genAmt:0, concreteOT:0, concreteAmt:0, cementOT:0, cementAmt:0, total:0, headcount:new Set() };
          siteMap[sid].genOT      += rec.genOT || 0;
          siteMap[sid].genAmt     += genAmt;
          siteMap[sid].concreteOT += rec.concreteOT || 0;
          siteMap[sid].concreteAmt+= concreteAmt;
          siteMap[sid].cementOT   += rec.cementOT || 0;
          siteMap[sid].cementAmt  += cementAmt;
          siteMap[sid].total      += total;
          siteMap[sid].headcount.add(emp.id);

          if (!empRow.sites[sid]) empRow.sites[sid] = { genOT:0, genAmt:0, concreteOT:0, concreteAmt:0, cementOT:0, cementAmt:0, total:0 };
          const es = empRow.sites[sid];
          es.genOT      += rec.genOT || 0;
          es.genAmt     += genAmt;
          es.concreteOT += rec.concreteOT || 0;
          es.concreteAmt+= concreteAmt;
          es.cementOT   += rec.cementOT || 0;
          es.cementAmt  += cementAmt;
          es.total      += total;
        });
      }
      if (Object.keys(empRow.sites).length > 0) empRows.push(empRow);
    });

    Object.values(siteMap).forEach(s => { s.headcount = s.headcount.size; });
    return { siteMap, empRows };
  }, [employees, globalRoster, ot, monthKey, totalDays]);

  // Attendance summary site-wise
  const attSiteSummary = useMemo(() => {
    const siteMap = {};
    for (let d = 1; d <= totalDays; d++) {
      const dk = `${monthKey}-${String(d).padStart(2,"00")}`;
      const dayData = attendance[dk] || {};
      Object.entries(dayData).forEach(([sid, empMap]) => {
        if (!siteMap[sid]) siteMap[sid] = { P:0, A:0, H:0, S:0, L:0, total:0, days:new Set(), headcount:new Set() };
        Object.entries(empMap).forEach(([eid, rec]) => {
          if (siteMap[sid][rec.status] !== undefined) siteMap[sid][rec.status]++;
          siteMap[sid].total++;
          siteMap[sid].days.add(d);
          siteMap[sid].headcount.add(eid);
        });
      });
    }
    Object.values(siteMap).forEach(s => { s.activeDays = s.days.size; s.headcount = s.headcount.size; delete s.days; });
    return siteMap;
  }, [attendance, monthKey, totalDays]);

  // Grand totals helpers
  const sumFields = (map, ...fields) => Object.values(map).reduce((tot, s) => { fields.forEach(f => { tot[f] = (tot[f]||0) + (s[f]||0); }); return tot; }, {});

  const siteName = (sid) => {
    if (sid === (salarySiteSummary.noSiteKey)) return "Non-site (Holiday/Off)";
    return sites.find(s=>s.id===sid)?.name || sid;
  };

  // Excel download for salary report
  const downloadSalaryReport = async () => {
    const XLSX = await getXLSX();
    const { siteMap } = salarySiteSummary;
    const headers = ["Site","Employees","Basic (MVR)","Att. Allow (MVR)","Food (MVR)","Phone (MVR)","Accom (MVR)","Tea (MVR)","Total (MVR)"];
    const rows = Object.entries(siteMap).map(([sid,s]) => [
      siteName(sid), s.headcount,
      +s.basic.toFixed(2), +s.attAllow.toFixed(2), +s.food.toFixed(2), +s.phone.toFixed(2), +s.accom.toFixed(2), +s.tea.toFixed(2),
      +(s.basic+s.attAllow+s.food+s.phone+s.accom+s.tea).toFixed(2)
    ]);
    const grand = rows.reduce((t,r)=>{ r.forEach((v,i)=>{ if(i>1) t[i]=(t[i]||0)+v; }); return t; }, ["TOTAL","",0,0,0,0,0,0,0]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[`Salary Expenses by Site — ${months[month]} ${year}`],[],headers,...rows,[],grand]);
    ws["!cols"]=[{wch:24},{wch:10},{wch:14},{wch:14},{wch:12},{wch:12},{wch:12},{wch:10},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws, "Salary by Site");
    XLSX.writeFile(wb, `SalaryBySite_${months[month]}_${year}.xlsx`);
  };

  const downloadOTReport = async () => {
    const XLSX = await getXLSX();
    const { siteMap } = otSiteSummary;
    const headers = ["Site","Employees","Gen OT Hrs","Gen OT (MVR)","Concrete Units","Concrete (MVR)","Cement Units","Cement (MVR)","Total OT (MVR)"];
    const rows = Object.entries(siteMap).map(([sid,s]) => [
      siteName(sid), s.headcount, +s.genOT.toFixed(1), +s.genAmt.toFixed(2), s.concreteOT, +s.concreteAmt.toFixed(2), s.cementOT, +s.cementAmt.toFixed(2), +s.total.toFixed(2)
    ]);
    const grand = rows.reduce((t,r)=>{ r.forEach((v,i)=>{ if(i>1) t[i]=(t[i]||0)+v; }); return t; }, ["TOTAL","",0,0,0,0,0,0,0]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[`OT Expenses by Site — ${months[month]} ${year}`],[],headers,...rows,[],grand]);
    ws["!cols"]=[{wch:24},{wch:10},{wch:12},{wch:14},{wch:14},{wch:14},{wch:12},{wch:12},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws, "OT by Site");
    XLSX.writeFile(wb, `OTBySite_${months[month]}_${year}.xlsx`);
  };

  const TABS = [
    { id:"salary",     label:"💰 Salary by Site" },
    { id:"ot",         label:"⏱ OT by Site" },
    { id:"attendance", label:"📋 Attendance by Site" },
    { id:"headcount",  label:"👷 Headcount" },
  ];

  const filteredSites = siteFilter ? [siteFilter] : sites.map(s=>s.id);

  return (
    <div>
      {/* Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="gap-3" style={{ flexWrap:"wrap" }}>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e=>setMonth(+e.target.value)}>
                {months.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={year} onChange={e=>setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Site</label>
              <select className="form-select" value={siteFilter} onChange={e=>setSiteFilter(e.target.value)}>
                <option value="">All Sites</option>
                {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${tab===t.id?"#3b82f6":"var(--border)"}`, background: tab===t.id?"rgba(59,130,246,0.15)":"var(--surface2)", color: tab===t.id?"#3b82f6":"var(--text3)", fontFamily:"var(--font)", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: SALARY BY SITE ── */}
      {tab === "salary" && (() => {
        const { siteMap } = salarySiteSummary;
        const shownSites = Object.keys(siteMap).filter(sid => !siteFilter || sid === siteFilter);
        const grandBasic = shownSites.reduce((s,sid)=>s+(siteMap[sid]?.basic||0),0);
        const grandTotal = shownSites.reduce((s,sid)=>s+(siteMap[sid]?.basic||0)+(siteMap[sid]?.attAllow||0)+(siteMap[sid]?.food||0)+(siteMap[sid]?.phone||0)+(siteMap[sid]?.accom||0)+(siteMap[sid]?.tea||0),0);

        return (
          <div>
            {/* Summary cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:16 }}>
              {[
                ["💰 Total Salary Cost", grandTotal, "#10b981"],
                ["🏗 Sites", shownSites.length, "#3b82f6"],
                ["👷 Employees", new Set(shownSites.flatMap(sid=>[...Array(siteMap[sid]?.headcount||0)])).size, "#8b5cf6"],
              ].map(([l,v,c])=>(
                <div key={l} className="stat-card">
                  <div className="stat-label">{l}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:c, fontFamily:"var(--mono)" }}>{typeof v==="number"&&v>100?`MVR ${v.toFixed(2)}`:v}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Salary Expenses by Site — {months[month]} {year}</div>
                <button className="btn btn-success btn-sm" onClick={downloadSalaryReport}>⬇ Download Excel</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Site</th><th>Staff</th><th>Basic</th><th>Att. Allow</th><th>Food</th><th>Phone</th><th>Accom.</th><th>Tea</th><th style={{ color:"#10b981" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownSites.length === 0
                      ? <tr><td colSpan={9}><div className="empty-state"><p>No salary data for this period.</p></div></td></tr>
                      : shownSites.map(sid => {
                          const s = siteMap[sid];
                          const rowTotal = (s.basic+s.attAllow+s.food+s.phone+s.accom+s.tea);
                          const pct = grandTotal > 0 ? Math.round((rowTotal/grandTotal)*100) : 0;
                          return (
                            <tr key={sid}>
                              <td style={{ fontWeight:600 }}>{siteName(sid)}</td>
                              <td><span className="badge badge-blue">{s.headcount}</span></td>
                              <td className="text-mono">{mvr(s.basic)}</td>
                              <td className="text-mono">{mvr(s.attAllow)}</td>
                              <td className="text-mono">{mvr(s.food)}</td>
                              <td className="text-mono">{mvr(s.phone)}</td>
                              <td className="text-mono">{mvr(s.accom)}</td>
                              <td className="text-mono">{mvr(s.tea)}</td>
                              <td>
                                <div className="text-mono" style={{ color:"#10b981", fontWeight:700 }}>{mvr(rowTotal)}</div>
                                <div style={{ height:4, background:"var(--surface3)", borderRadius:4, marginTop:4, overflow:"hidden", minWidth:60 }}>
                                  <div style={{ width:`${pct}%`, height:"100%", background:"#10b981", borderRadius:4 }} />
                                </div>
                                <div style={{ fontSize:9, color:"var(--text3)", marginTop:2 }}>{pct}% of total</div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                  {shownSites.length > 0 && (
                    <tfoot>
                      <tr style={{ background:"rgba(59,130,246,0.08)", fontWeight:700 }}>
                        <td>GRAND TOTAL</td>
                        <td></td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.basic||0),0))}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.attAllow||0),0))}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.food||0),0))}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.phone||0),0))}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.accom||0),0))}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.tea||0),0))}</td>
                        <td className="text-mono" style={{ color:"#10b981", fontSize:14 }}>{mvr(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Per-employee breakdown */}
            {!siteFilter && shownSites.length > 0 && (
              <div className="card" style={{ marginTop:16 }}>
                <div className="card-header"><div className="card-title">Per-Employee Breakdown</div></div>
                <div className="table-wrap">
                  <table style={{ fontSize:12 }}>
                    <thead>
                      <tr><th>Employee</th><th>ID</th><th>Site</th><th>Basic</th><th>Att.</th><th>Food</th><th>Phone</th><th>Accom.</th><th>Tea</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {Object.values(salarySiteSummary.empDetails).flatMap(e =>
                        Object.entries(e.sites).map(([sid, s]) => {
                          const rowTotal = s.basic+s.attAllow+s.food+s.phone+s.accom+s.tea;
                          return (
                            <tr key={`${e.empId}-${sid}`}>
                              <td style={{ fontWeight:600 }}>{e.name}</td>
                              <td className="text-mono" style={{ color:"var(--accent)" }}>{e.empId}</td>
                              <td style={{ fontSize:11, color:"var(--text3)" }}>{siteName(sid)}</td>
                              <td className="text-mono">{mvr(s.basic)}</td>
                              <td className="text-mono">{mvr(s.attAllow)}</td>
                              <td className="text-mono">{mvr(s.food)}</td>
                              <td className="text-mono">{mvr(s.phone)}</td>
                              <td className="text-mono">{mvr(s.accom)}</td>
                              <td className="text-mono">{mvr(s.tea)}</td>
                              <td className="text-mono" style={{ fontWeight:700, color:"#10b981" }}>{mvr(rowTotal)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TAB: OT BY SITE ── */}
      {tab === "ot" && (() => {
        const { siteMap, empRows } = otSiteSummary;
        const shownSites = Object.keys(siteMap).filter(sid => !siteFilter || sid === siteFilter);
        const grandTotal = shownSites.reduce((s,sid)=>s+(siteMap[sid]?.total||0),0);

        return (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:16 }}>
              {[
                ["⏱ Total OT Cost", `MVR ${grandTotal.toFixed(2)}`, "#06b6d4"],
                ["Gen OT Hrs", shownSites.reduce((s,sid)=>s+(siteMap[sid]?.genOT||0),0).toFixed(1), "#3b82f6"],
                ["Concrete Units", shownSites.reduce((s,sid)=>s+(siteMap[sid]?.concreteOT||0),0), "#8b5cf6"],
                ["Cement Units", shownSites.reduce((s,sid)=>s+(siteMap[sid]?.cementOT||0),0), "#f59e0b"],
              ].map(([l,v,c])=>(
                <div key={l} className="stat-card">
                  <div className="stat-label">{l}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:c, fontFamily:"var(--mono)" }}>{v}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">OT Expenses by Site — {months[month]} {year}</div>
                <button className="btn btn-success btn-sm" onClick={downloadOTReport}>⬇ Download Excel</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Site</th><th>Staff</th><th>Gen OT Hrs</th><th>Gen OT</th><th>Concrete</th><th>Concrete Amt</th><th>Cement</th><th>Cement Amt</th><th style={{ color:"#06b6d4" }}>Total OT</th></tr>
                  </thead>
                  <tbody>
                    {shownSites.length === 0
                      ? <tr><td colSpan={9}><div className="empty-state"><p>No OT data for this period.</p></div></td></tr>
                      : shownSites.map(sid => {
                          const s = siteMap[sid];
                          const pct = grandTotal > 0 ? Math.round((s.total/grandTotal)*100) : 0;
                          return (
                            <tr key={sid}>
                              <td style={{ fontWeight:600 }}>{siteName(sid)}</td>
                              <td><span className="badge badge-blue">{s.headcount}</span></td>
                              <td className="text-mono">{s.genOT.toFixed(1)}</td>
                              <td className="text-mono">{mvr(s.genAmt)}</td>
                              <td className="text-mono">{s.concreteOT}</td>
                              <td className="text-mono">{mvr(s.concreteAmt)}</td>
                              <td className="text-mono">{s.cementOT}</td>
                              <td className="text-mono">{mvr(s.cementAmt)}</td>
                              <td>
                                <div className="text-mono" style={{ color:"#06b6d4", fontWeight:700 }}>{mvr(s.total)}</div>
                                <div style={{ height:4, background:"var(--surface3)", borderRadius:4, marginTop:4, overflow:"hidden" }}>
                                  <div style={{ width:`${pct}%`, height:"100%", background:"#06b6d4", borderRadius:4 }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                  {shownSites.length > 0 && (
                    <tfoot>
                      <tr style={{ background:"rgba(6,182,212,0.08)", fontWeight:700 }}>
                        <td>GRAND TOTAL</td><td></td>
                        <td className="text-mono">{shownSites.reduce((s,sid)=>s+(siteMap[sid]?.genOT||0),0).toFixed(1)}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.genAmt||0),0))}</td>
                        <td className="text-mono">{shownSites.reduce((s,sid)=>s+(siteMap[sid]?.concreteOT||0),0)}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.concreteAmt||0),0))}</td>
                        <td className="text-mono">{shownSites.reduce((s,sid)=>s+(siteMap[sid]?.cementOT||0),0)}</td>
                        <td className="text-mono">{mvr(shownSites.reduce((s,sid)=>s+(siteMap[sid]?.cementAmt||0),0))}</td>
                        <td className="text-mono" style={{ color:"#06b6d4", fontSize:14 }}>{mvr(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Per-employee OT breakdown */}
            {empRows.length > 0 && (
              <div className="card" style={{ marginTop:16 }}>
                <div className="card-header"><div className="card-title">Per-Employee OT Detail</div></div>
                <div className="table-wrap">
                  <table style={{ fontSize:12 }}>
                    <thead><tr><th>Employee</th><th>ID</th><th>OT Site</th><th>Gen OT</th><th>Gen Amt</th><th>Concrete</th><th>Concrete Amt</th><th>Cement</th><th>Cement Amt</th><th>Total</th></tr></thead>
                    <tbody>
                      {empRows.filter(e=>!siteFilter||e.sites[siteFilter]).flatMap(e=>
                        Object.entries(e.sites).filter(([sid])=>!siteFilter||sid===siteFilter).map(([sid,s])=>(
                          <tr key={`${e.empId}-${sid}`}>
                            <td style={{ fontWeight:600 }}>{e.name}</td>
                            <td className="text-mono" style={{ color:"var(--accent)" }}>{e.empId}</td>
                            <td style={{ fontSize:11, color:"var(--text3)" }}>{siteName(sid)}</td>
                            <td className="text-mono">{s.genOT.toFixed(1)}</td>
                            <td className="text-mono">{mvr(s.genAmt)}</td>
                            <td className="text-mono">{s.concreteOT}</td>
                            <td className="text-mono">{mvr(s.concreteAmt)}</td>
                            <td className="text-mono">{s.cementOT}</td>
                            <td className="text-mono">{mvr(s.cementAmt)}</td>
                            <td className="text-mono" style={{ fontWeight:700, color:"#06b6d4" }}>{mvr(s.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TAB: ATTENDANCE BY SITE ── */}
      {tab === "attendance" && (() => {
        const shownSites = Object.keys(attSiteSummary).filter(sid=>!siteFilter||sid===siteFilter);
        const grandTotal = shownSites.reduce((s,sid)=>s+(attSiteSummary[sid]?.total||0),0);

        return (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Attendance Summary by Site — {months[month]} {year}</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Site</th><th>Staff</th><th>Active Days</th><th style={{ color:"#10b981" }}>Present</th><th style={{ color:"#ef4444" }}>Absent</th><th style={{ color:"#f59e0b" }}>Half</th><th style={{ color:"#8b5cf6" }}>Sick</th><th style={{ color:"#94a3b8" }}>Leave</th><th>Total Entries</th><th>Att. Rate</th></tr>
                </thead>
                <tbody>
                  {shownSites.length === 0
                    ? <tr><td colSpan={10}><div className="empty-state"><p>No attendance data for this period.</p></div></td></tr>
                    : shownSites.map(sid => {
                        const s = attSiteSummary[sid];
                        const rate = s.total > 0 ? Math.round((s.P / s.total) * 100) : 0;
                        return (
                          <tr key={sid}>
                            <td style={{ fontWeight:600 }}>{siteName(sid)}</td>
                            <td><span className="badge badge-blue">{s.headcount}</span></td>
                            <td className="text-mono">{s.activeDays}</td>
                            <td><span className="badge badge-green">{s.P}</span></td>
                            <td><span className="badge badge-red">{s.A}</span></td>
                            <td><span className="badge badge-yellow">{s.H}</span></td>
                            <td><span className="badge badge-purple">{s.S||0}</span></td>
                            <td><span className="badge badge-gray">{s.L}</span></td>
                            <td className="text-mono">{s.total}</td>
                            <td>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ width:60, height:6, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
                                  <div style={{ width:`${rate}%`, height:"100%", background: rate>80?"#10b981":rate>60?"#f59e0b":"#ef4444", borderRadius:3 }} />
                                </div>
                                <span style={{ fontSize:11, fontWeight:700 }}>{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── TAB: HEADCOUNT ── */}
      {tab === "headcount" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:16 }}>
            {Object.entries(EMP_STATUS_META).map(([k,v])=>(
              <div key={k} className="stat-card" style={{ borderLeft:`3px solid ${v.color}` }}>
                <div className="stat-label">{v.icon} {v.label}</div>
                <div style={{ fontSize:28, fontWeight:800, color:v.color, fontFamily:"var(--mono)" }}>
                  {employees.filter(e=>(e.empStatus||"active")===k).length}
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Employee Headcount Report — {months[month]} {year}</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>ID</th><th>Designation</th><th>Status</th><th>Status Since</th><th>Basic Salary</th><th>In Roster</th></tr></thead>
                <tbody>
                  {employees.map(e=>{
                    const meta = EMP_STATUS_META[e.empStatus||"active"]||{};
                    const inRoster = !!globalRoster[e.id];
                    const sal = getSalaryForMonth(e, year, month);
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight:600 }}>{e.name}</td>
                        <td className="text-mono" style={{ color:"var(--accent)" }}>{e.empId}</td>
                        <td>{e.designation||"—"}</td>
                        <td><span className={`badge ${meta.badge}`}>{meta.icon} {meta.label}</span></td>
                        <td style={{ fontSize:11, color:"var(--text3)" }}>{e.statusDate||"—"}</td>
                        <td className="text-mono">{mvr(sal.basicSalary)}</td>
                        <td>{inRoster ? <span className="badge badge-green">✓</span> : <span className="badge badge-gray">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
