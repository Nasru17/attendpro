import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// EXCEL EXPORT — loads SheetJS from CDN on first use
// ============================================================
let _XLSX = null;
async function getXLSX() {
  if (_XLSX) return _XLSX;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  _XLSX = window.XLSX;
  return _XLSX;
}

function styleCells(ws, range, style) {
  // Apply style to a range string like "A1:Z1"
  const XLSX = _XLSX;
  if (!XLSX) return;
  const ref = XLSX.utils.decode_range(range);
  for (let r = ref.s.r; r <= ref.e.r; r++) {
    for (let c = ref.s.c; c <= ref.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      ws[addr].s = style;
    }
  }
}

async function downloadPayrollExcel({ employees, months, month, year, calcPayroll }) {
  const XLSX = await getXLSX();
  const monthName = months[month];

  // Build rows
  const headers = [
    "Employee", "Emp ID", "Designation",
    "Present", "Absent", "Half Day", "Sick", "Leave", "Holiday",
    "Basic Earned (MVR)",
    "Holiday Allow (MVR)",
    "Attendance Allow (MVR)",
    "Gen OT Hrs", "Gen OT Amount (MVR)",
    "Concrete OT Units", "Concrete OT Amount (MVR)",
    "Cement OT Units", "Cement OT Amount (MVR)",
    "Holiday OT < 9.5h (MVR)", "Holiday OT ≥ 9.5h (MVR)",
    "Food Allow (MVR)", "Tea Allow (MVR)",
    "Phone Allow (MVR)", "Accommodation Allow (MVR)",
    "Late Deduct (MVR)", "Utility Deduct (MVR)",
    "Advance Deduct (MVR)", "Loan Deduct (MVR)",
    "Gross Earnings (MVR)", "Total Deductions (MVR)", "Net Pay (MVR)"
  ];

  const rows = employees.map(e => {
    const p = calcPayroll(e);
    return [
      e.name, e.empId, e.designation || "",
      p.presentDays, p.absentDays, p.halfDays, p.sickDays, p.leaveDays, p.holidayDays,
      +p.basicEarned.toFixed(2),
      +p.holidayAllow.toFixed(2),
      +p.attendanceAllow.toFixed(2),
      +p.genOT, +p.genOTAmount.toFixed(2),
      +p.concreteOT, +p.concreteOTAmount.toFixed(2),
      +p.cementOT, +p.cementOTAmount.toFixed(2),
      +p.holidayAllowBelow.toFixed(2), +p.holidayAllowFull.toFixed(2),
      +p.foodAllow.toFixed(2), +p.teaAllow.toFixed(2),
      +p.phoneAllow.toFixed(2), +p.accommodationAllow.toFixed(2),
      +p.lateDeduct.toFixed(2), +p.utilityDeduct.toFixed(2),
      +p.advanceDeduct.toFixed(2), +p.loanDeduct.toFixed(2),
      +p.grossEarnings.toFixed(2), +p.totalDeductions.toFixed(2), +p.netPay.toFixed(2)
    ];
  });

  // Totals row
  const totals = ["TOTAL", "", ""].concat(
    Array(6).fill(null).map((_, i) => rows.reduce((s, r) => s + (r[3+i]||0), 0)),
    Array(21).fill(null).map((_, i) => +rows.reduce((s, r) => s + (r[9+i]||0), 0).toFixed(2))
  );

  const wsData = [
    [`Payroll Summary — ${monthName} ${year}`],
    [],
    headers,
    ...rows,
    [],
    totals
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    {wch:22},{wch:10},{wch:16},
    {wch:7},{wch:7},{wch:8},{wch:6},{wch:6},{wch:7},
    {wch:16},{wch:16},{wch:16},
    {wch:10},{wch:16},{wch:14},{wch:18},{wch:12},{wch:18},
    {wch:18},{wch:18},
    {wch:14},{wch:14},{wch:14},{wch:18},
    {wch:14},{wch:14},{wch:14},{wch:12},
    {wch:16},{wch:16},{wch:14}
  ];

  // Title style
  ws["A1"] = { v: `Payroll Summary — ${monthName} ${year}`, t: "s",
    s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "left" } } };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

  // Header row style (row index 2 = row 3 in Excel)
  const headerRange = `A3:${XLSX.utils.encode_col(headers.length - 1)}3`;
  styleCells(ws, headerRange, {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
    fill: { fgColor: { rgb: "2D5986" } },
    alignment: { horizontal: "center", wrapText: true },
    border: { bottom: { style: "thin", color: { rgb: "AAAAAA" } } }
  });

  // Data rows — alternate shading
  rows.forEach((_, i) => {
    const rowIdx = 3 + i; // 0-indexed
    const fill = i % 2 === 0 ? "F5F8FC" : "FFFFFF";
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      ws[addr].s = {
        fill: { fgColor: { rgb: fill } },
        font: { sz: 10 },
        alignment: { horizontal: c < 3 ? "left" : "right" },
        border: { bottom: { style: "hair", color: { rgb: "DDDDDD" } } }
      };
    }
    // Net Pay column — highlight
    const netAddr = XLSX.utils.encode_cell({ r: rowIdx, c: headers.length - 1 });
    ws[netAddr].s = { ...ws[netAddr].s,
      font: { bold: true, sz: 10, color: { rgb: "0A5C36" } },
      fill: { fgColor: { rgb: "D4EDDA" } }
    };
  });

  // Totals row style
  const totalsRowIdx = rows.length + 4;
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: totalsRowIdx, c });
    if (!ws[addr]) ws[addr] = { t: "z", v: "" };
    ws[addr].s = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: c < 3 ? "left" : "right" },
      border: { top: { style: "medium", color: { rgb: "AAAAAA" } } }
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
  XLSX.writeFile(wb, `Payroll_${monthName}_${year}.xlsx`);
}

async function downloadAttendanceExcel({ employees, sites, attendance, rosters, months, month, year, siteId }) {
  const XLSX = await getXLSX();
  const monthName = months[month];
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = new Date(year, month + 1, 0).getDate();
  const dayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const roster = rosters[monthKey] || {};

  const empList = employees.filter(e => Object.keys(roster).includes(e.id));

  const getAtt = (empId, d) => {
    const dk = `${monthKey}-${String(d).padStart(2,"0")}`;
    const dayData = attendance[dk] || {};
    if (siteId) return dayData[siteId]?.[empId];
    for (const sid of Object.keys(dayData)) {
      if (dayData[sid]?.[empId]) return dayData[sid][empId];
    }
    return undefined;
  };

  const siteName = siteId ? (sites.find(s => s.id === siteId)?.name || siteId) : "All Sites";

  // Day headers row — weekday abbreviations
  const dayRow1 = ["Employee", "Emp ID", ...Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return dayNames[new Date(year, month, d).getDay()];
  }), "P", "A", "H", "S", "L", "Total"];

  const dayRow2 = ["", "", ...Array.from({ length: days }, (_, i) => i + 1), "", "", "", "", "", ""];

  const STATUS_COLORS = {
    P: "C6EFCE", A: "FFC7CE", H: "FFEB9C",
    S: "E2CFFF", L: "D9D9D9", O: "CFEEFF", "": "FFFFFF"
  };

  const dataRows = empList.map(e => {
    let P=0,A=0,H=0,S=0,L=0;
    const cells = Array.from({ length: days }, (_, i) => {
      const a = getAtt(e.id, i + 1);
      const rType = roster[e.id]?.[i+1] || (new Date(year,month,i+1).getDay()===5?"H":"W");
      if (rType === "H") return "PH"; // public holiday
      const st = a?.status || "";
      if (st === "P") P++;
      else if (st === "A") A++;
      else if (st === "H") H++;
      else if (st === "S") S++;
      else if (st === "L") L++;
      return st;
    });
    return [e.name, e.empId, ...cells, P, A, H, S, L, P+H];
  });

  const wsData = [
    [`Attendance Summary — ${monthName} ${year} — ${siteName}`],
    [],
    dayRow1,
    dayRow2,
    ...dataRows
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const totalCols = 2 + days + 6;

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, { wch: 10 },
    ...Array(days).fill({ wch: 4 }),
    { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 6 }
  ];

  // Freeze first 2 columns
  ws["!freeze"] = { xSplit: 2, ySplit: 4 };

  // Title
  ws["A1"] = { v: `Attendance Summary — ${monthName} ${year} — ${siteName}`, t: "s",
    s: { font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } } } };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

  // Header rows style
  for (let ri = 2; ri <= 3; ri++) {
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: ri, c });
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      const isFriday = ri === 2 && c >= 2 && c < 2 + days &&
        new Date(year, month, c - 1).getDay() === 5;
      ws[addr].s = {
        font: { bold: true, sz: 9, color: { rgb: isFriday ? "C00000" : "FFFFFF" } },
        fill: { fgColor: { rgb: ri === 2 ? "2D5986" : "3A6EA5" } },
        alignment: { horizontal: "center" },
        border: { bottom: { style: "thin", color: { rgb: "AAAAAA" } } }
      };
    }
  }

  // Data rows — color-code each status cell
  dataRows.forEach((row, ri) => {
    const excelRow = 4 + ri;
    row.forEach((val, ci) => {
      const addr = XLSX.utils.encode_cell({ r: excelRow, c: ci });
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      let bgColor = ri % 2 === 0 ? "F5F8FC" : "FFFFFF";
      if (ci >= 2 && ci < 2 + days) {
        bgColor = STATUS_COLORS[val] || STATUS_COLORS[""];
      }
      if (ci >= 2 + days) bgColor = "EFF3FB"; // totals columns
      ws[addr].s = {
        fill: { fgColor: { rgb: bgColor } },
        font: { sz: 9, bold: ci >= 2 + days },
        alignment: { horizontal: ci < 2 ? "left" : "center" },
        border: {
          right: { style: "hair", color: { rgb: "CCCCCC" } },
          bottom: { style: "hair", color: { rgb: "CCCCCC" } }
        }
      };
    });
  });

  // Legend sheet
  const legendData = [
    ["Status Legend", "Color"],
    ["P — Present", "Green"],
    ["A — Absent", "Red"],
    ["H — Half Day", "Yellow"],
    ["S — Sick", "Purple"],
    ["L — Leave", "Grey"],
    ["PH — Public Holiday", "Blue"],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(legendData);
  ws2["!cols"] = [{ wch: 20 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.utils.book_append_sheet(wb, ws2, "Legend");
  XLSX.writeFile(wb, `Attendance_${monthName}_${year}.xlsx`);
}


const KEYS = {
  employees: "att:employees",
  sites: "att:sites",
  attendance: "att:attendance",
  rosters: "att:rosters",
  deductions: "att:deductions",
  payroll: "att:payroll",
  ot: "att:ot",
};

// ============================================================
// SUPABASE STORAGE
// ============================================================
const SUPABASE_URL = "https://zsnbpdcecdkadrfdhouq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbmJwZGNlY2RrYWRyZmRob3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjk1NzgsImV4cCI6MjA4ODkwNTU3OH0.1RcfhcSXY4UrU3jD-7dybjPx3bP9RMtKczsFBKJK9Rc";
const SB_HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

async function load(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attendpro_store?key=eq.${key}&select=value`, { headers: SB_HEADERS });
    const rows = await res.json();
    return rows?.[0]?.value ?? null;
  } catch { return null; }
}

async function save(key, val) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/attendpro_store`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value: val, updated_at: new Date().toISOString() })
    });
  } catch {}
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function genId() { return Math.random().toString(36).slice(2, 10); }
function fmt(n) { return Number(n || 0).toFixed(2); }
function mvr(n) { return `MVR ${fmt(n)}`; }

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getDayName(year, month, day) {
  return new Date(year, month, day).toLocaleDateString("en", { weekday: "short" });
}
function isFriday(year, month, day) {
  return new Date(year, month, day).getDay() === 5;
}

// ============================================================
// THEME & STYLES
// ============================================================
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0e1a; --surface: #111827; --surface2: #1a2235; --surface3: #243047;
    --border: #2a3a55; --accent: #3b82f6; --accent2: #06b6d4; --accent3: #8b5cf6;
    --success: #10b981; --warning: #f59e0b; --danger: #ef4444;
    --text: #e2e8f0; --text2: #94a3b8; --text3: #64748b;
    --font: 'Sora', sans-serif; --mono: 'JetBrains Mono', monospace;
    --sidebar-w: 240px;
  }
  html, body { height: 100%; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); overflow-x: hidden; }

  /* LOGIN */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), var(--bg);
    padding: 16px;
  }
  .login-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    width: 100%; max-width: 400px; padding: 40px 36px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  }
  .login-logo { font-size: 22px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px; }
  .login-logo span { color: var(--accent); }
  .login-sub { font-size: 12px; color: var(--text3); margin-bottom: 32px; letter-spacing: 0.5px; text-transform: uppercase; }
  .login-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .login-desc { font-size: 13px; color: var(--text3); margin-bottom: 24px; }
  .login-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .login-btn { width: 100%; padding: 12px; font-size: 14px; margin-top: 8px; border-radius: 10px; }
  .login-roles { display: flex; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
  .login-role-chip {
    flex: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface2); cursor: pointer; text-align: center; transition: all 0.15s;
  }
  .login-role-chip:hover { border-color: var(--accent); background: rgba(59,130,246,0.08); }
  .login-role-chip .role-name { font-size: 11px; font-weight: 700; color: var(--accent); }
  .login-role-chip .role-email { font-size: 10px; color: var(--text3); margin-top: 2px; }

  /* APP SHELL */
  .app { display: flex; min-height: 100vh; position: relative; }

  /* SIDEBAR */
  .sidebar {
    width: var(--sidebar-w); min-height: 100vh; background: var(--surface);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    position: fixed; left: 0; top: 0; z-index: 200; transition: transform 0.25s ease;
  }
  .sidebar-logo {
    padding: 20px 18px; border-bottom: 1px solid var(--border);
    font-size: 15px; font-weight: 700; letter-spacing: -0.3px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .sidebar-logo span { color: var(--accent); }
  .sidebar-logo .sub { font-size: 10px; font-weight: 400; color: var(--text3); margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .sidebar-close { display: none; background: none; border: none; color: var(--text3); font-size: 20px; cursor: pointer; padding: 4px; }
  .sidebar-nav { flex: 1; overflow-y: auto; }
  .nav-group { padding: 10px 0; }
  .nav-label { font-size: 9px; font-weight: 600; color: var(--text3); letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 18px 6px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 18px;
    font-size: 13px; font-weight: 500; color: var(--text2); cursor: pointer;
    border-left: 3px solid transparent; transition: all 0.15s;
  }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active { color: var(--accent); background: rgba(59,130,246,0.08); border-left-color: var(--accent); }
  .nav-icon { font-size: 15px; width: 18px; text-align: center; }
  .sidebar-user {
    padding: 14px 18px; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .sidebar-avatar {
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .sidebar-avatar.manager { background: rgba(139,92,246,0.2); color: #8b5cf6; }
  .sidebar-avatar.supervisor { background: rgba(59,130,246,0.2); color: #3b82f6; }
  .sidebar-user-info { flex: 1; min-width: 0; }
  .sidebar-user-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-user-role { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
  .logout-btn { background: none; border: none; color: var(--text3); cursor: pointer; padding: 4px; font-size: 14px; }
  .logout-btn:hover { color: var(--danger); }

  /* SIDEBAR OVERLAY (mobile) */
  .sidebar-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199;
  }

  /* MAIN */
  .main { margin-left: var(--sidebar-w); flex: 1; padding: 0; min-height: 100vh; min-width: 0; }
  .topbar {
    display: none; padding: 12px 16px; background: var(--surface);
    border-bottom: 1px solid var(--border); align-items: center; gap: 12px; position: sticky; top: 0; z-index: 100;
  }
  .topbar-menu { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; padding: 4px; }
  .topbar-title { font-size: 15px; font-weight: 700; flex: 1; }
  .page-header {
    padding: 22px 28px 18px; border-bottom: 1px solid var(--border);
    background: var(--surface); display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 10px;
  }
  .page-title { font-size: 19px; font-weight: 700; letter-spacing: -0.5px; }
  .page-sub { font-size: 12px; color: var(--text3); margin-top: 2px; }
  .page-content { padding: 20px 24px; }

  /* CARDS */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .card-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .card-title { font-size: 13px; font-weight: 600; }
  .card-body { padding: 18px; }

  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
    border: none; cursor: pointer; transition: all 0.15s; font-family: var(--font); white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: #2563eb; }
  .btn-success { background: var(--success); color: #fff; }
  .btn-success:hover { background: #059669; }
  .btn-warning { background: var(--warning); color: #000; }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-danger:hover { background: #dc2626; }
  .btn-ghost { background: var(--surface2); color: var(--text2); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface3); color: var(--text); }
  .btn-sm { padding: 5px 10px; font-size: 11px; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* FORMS */
  .form-grid { display: grid; gap: 14px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
  .form-input, .form-select {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    border-radius: 8px; padding: 9px 12px; font-size: 13px; font-family: var(--font);
    transition: border 0.15s; outline: none; width: 100%;
  }
  .form-input:focus, .form-select:focus { border-color: var(--accent); }
  .form-section { margin-bottom: 22px; }
  .form-section-title {
    font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    color: var(--accent2); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

  /* TABLE */
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th {
    text-align: left; padding: 10px 12px; background: var(--surface2);
    font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
    color: var(--text3); border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--text2); vertical-align: middle; }
  tr:hover td { background: rgba(255,255,255,0.02); }
  tr:last-child td { border-bottom: none; }

  /* BADGES */
  .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
  .badge-green { background: rgba(16,185,129,0.15); color: #10b981; }
  .badge-red { background: rgba(239,68,68,0.15); color: #ef4444; }
  .badge-yellow { background: rgba(245,158,11,0.15); color: #f59e0b; }
  .badge-blue { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .badge-purple { background: rgba(139,92,246,0.15); color: #8b5cf6; }
  .badge-gray { background: rgba(100,116,139,0.15); color: #94a3b8; }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 700px; max-height: 92vh; overflow-y: auto; }
  .modal-header { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: var(--surface); z-index: 1; }
  .modal-title { font-size: 15px; font-weight: 700; }
  .modal-close { background: none; border: none; color: var(--text3); font-size: 20px; cursor: pointer; padding: 4px; }
  .modal-body { padding: 20px; }
  .modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

  /* STATS */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
  .stat-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; }
  .stat-value { font-size: 24px; font-weight: 700; font-family: var(--mono); }
  .stat-value.blue { color: var(--accent); }
  .stat-value.green { color: var(--success); }
  .stat-value.yellow { color: var(--warning); }
  .stat-value.purple { color: var(--accent3); }

  /* ROSTER */
  .roster-grid { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .roster-table { border-collapse: collapse; font-size: 11px; }
  .roster-table th, .roster-table td { padding: 5px 6px; border: 1px solid var(--border); text-align: center; white-space: nowrap; }
  .roster-table th { background: var(--surface2); font-size: 9px; }
  .roster-cell { cursor: pointer; border-radius: 4px; padding: 3px 5px; font-size: 10px; font-weight: 700; transition: all 0.1s; display: inline-block; min-width: 26px; }
  .roster-W { background: rgba(59,130,246,0.2); color: #3b82f6; }
  .roster-O { background: rgba(16,185,129,0.2); color: #10b981; }
  .roster-H { background: rgba(245,158,11,0.2); color: #f59e0b; }
  .roster-L { background: rgba(139,92,246,0.2); color: #8b5cf6; }

  /* ATTENDANCE */
  .att-status { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
  .att-btn { padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; border: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all 0.1s; }
  .att-btn.P { background: rgba(16,185,129,0.2); color: #10b981; border-color: #10b981; }
  .att-btn.A { background: rgba(239,68,68,0.2); color: #ef4444; border-color: #ef4444; }
  .att-btn.H { background: rgba(245,158,11,0.2); color: #f59e0b; border-color: #f59e0b; }
  .att-btn.S { background: rgba(139,92,246,0.2); color: #8b5cf6; border-color: #8b5cf6; }
  .att-btn.L { background: rgba(100,116,139,0.2); color: #94a3b8; border-color: #94a3b8; }
  .att-btn.inactive { opacity: 0.3; border-color: transparent; }

  /* PAYROLL */
  .payslip { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .payslip-header { background: linear-gradient(135deg, #1e3a5f 0%, #1a2a4a 100%); padding: 18px 20px; border-bottom: 1px solid var(--border); }
  .payslip-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
  .payslip-row.total { background: var(--surface2); font-weight: 700; font-size: 14px; border-bottom: none; }
  .payslip-row.deduct { color: var(--danger); }
  .payslip-row .amount { font-family: var(--mono); font-weight: 600; }

  /* ALERTS */
  .alert { padding: 11px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 8px; }
  .alert-info { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; }
  .alert-warning { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #fcd34d; }
  .alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }
  .alert-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }

  /* MISC */
  .text-mono { font-family: var(--mono); }
  .text-sm { font-size: 12px; color: var(--text2); }
  .gap-2 { display: flex; gap: 8px; flex-wrap: wrap; }
  .gap-3 { display: flex; gap: 12px; flex-wrap: wrap; }
  .mt-4 { margin-top: 16px; }
  .mb-4 { margin-bottom: 16px; }
  .flex-between { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .empty-state { text-align: center; padding: 40px 20px; color: var(--text3); }
  .empty-state .icon { font-size: 36px; margin-bottom: 12px; }
  .empty-state p { font-size: 14px; }

  /* TOAST */
  .toast-container { position: fixed; bottom: 20px; right: 16px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; max-width: calc(100vw - 32px); }
  .toast { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.4); animation: slideIn 0.2s ease; display: flex; align-items: center; gap: 8px; max-width: 320px; }
  .toast.success { border-left: 3px solid var(--success); }
  .toast.error { border-left: 3px solid var(--danger); }
  .toast.info { border-left: 3px solid var(--accent); }
  @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  /* OT inputs */
  .ot-input { width: 52px; background: var(--surface3); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 6px; font-size: 12px; font-family: var(--mono); text-align: center; }

  /* ROLE BADGE */
  .role-manager { background: rgba(139,92,246,0.15); color: #8b5cf6; }
  .role-supervisor { background: rgba(59,130,246,0.15); color: #3b82f6; }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    :root { --sidebar-w: 220px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .form-grid-3 { grid-template-columns: 1fr 1fr; }
    .page-content { padding: 16px; }
    .page-header { padding: 16px; }
  }

  @media (max-width: 640px) {
    :root { --sidebar-w: 260px; }
    /* sidebar hidden off-screen on mobile */
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
    .sidebar-close { display: block; }
    .sidebar-overlay.open { display: block; }
    .main { margin-left: 0; }
    .topbar { display: flex; }
    .page-header { display: none; }
    .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
    .page-content { padding: 12px; }
    .btn { font-size: 12px; padding: 7px 12px; }
    .modal { border-radius: 12px; }
    .modal-body { padding: 16px; }
    td, th { padding: 8px 10px; }
    .payslip-row { padding: 7px 14px; font-size: 12px; }
  }

  @media (max-width: 380px) {
    .stats-grid { grid-template-columns: 1fr; }
    .att-status { gap: 3px; }
    .att-btn { padding: 3px 6px; font-size: 9px; }
  }
`;

// ============================================================
// TOAST COMPONENT
// ============================================================
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === "success" ? "✓" : t.type === "error" ? "✗" : "ℹ"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = "info") => {
    const id = genId();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, toast };
}

// ============================================================
// AUTH
// ============================================================
// Role mapping — email → role/name/initials
const USER_ROLES = {
  "hr@alithomv.com":   { role: "manager",    name: "HR Manager", initials: "HR" },
  "info@alithomv.com": { role: "supervisor", name: "Supervisor", initials: "SV" },
};

// Supabase Auth helpers
async function sbSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Invalid email or password.");
  return data; // { access_token, user, ... }
}

async function sbSignOut(token) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
  });
}

async function sbGetUser(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !password) { setError("Please enter your email and password."); return; }
    if (!USER_ROLES[trimmedEmail]) { setError("Invalid email or password."); return; }
    setLoading(true); setError("");
    try {
      const data = await sbSignIn(trimmedEmail, password);
      const roleInfo = USER_ROLES[trimmedEmail];
      onLogin({ email: trimmedEmail, token: data.access_token, ...roleInfo });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Attend<span>Pro</span></div>
        <div className="login-sub">Alitho Construction · HR System</div>
        <div className="login-title">Sign In</div>
        <div className="login-desc">Enter your credentials to continue</div>
        {error && <div className="login-error">⚠ {error}</div>}
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Password</label>
          <div style={{ position: "relative" }}>
            <input className="form-input" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ paddingRight: 40 }} />
            <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 14 }}>{showPass ? "🙈" : "👁"}</button>
          </div>
        </div>
        <button className="btn btn-primary login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </div>
    </div>
  );
}


const EMPTY_EMP = {
  name: "", empId: "", designation: "", phone: "",
  basicSalary: "", attendanceAllowance: "", accommodationAllowance: "",
  foodAllowance: "", phoneAllowance: "",
  otRate: 20, concreteOT: 200, cementOT: 100, teaRate: 10,
  joinDate: "", empStatus: "active", statusDate: "", statusNote: "",
};

const EMP_STATUS_META = {
  active:  { label: "Active",   badge: "badge-green",  color: "#10b981", icon: "✓" },
  leave:   { label: "On Leave", badge: "badge-yellow", color: "#f59e0b", icon: "🏖" },
  fled:    { label: "Fled",     badge: "badge-red",    color: "#ef4444", icon: "🚨" },
  resigned:{ label: "Resigned", badge: "badge-gray",   color: "#94a3b8", icon: "✗" },
};

// Was this employee active (able to work) on a given date string "YYYY-MM-DD"?
// Rules:
//   - If current status is "active" → always true (status change back to active clears restriction)
//   - If current status is leave/fled/resigned AND statusDate is set:
//       → active BEFORE statusDate, locked FROM statusDate onwards
//   - If statusDate is not set but status is non-active → locked for all dates (conservative)
function isEmpActiveOnDate(emp, dateStr) {
  const st = emp.empStatus || "active";
  if (st === "active") return true;
  if (!emp.statusDate) return false; // no date set, treat as locked for all
  // employee was active before their statusDate
  return dateStr < emp.statusDate;
}

function EmployeeModal({ emp, onSave, onClose }) {
  const [form, setForm] = useState(emp ? { ...emp } : { ...EMPTY_EMP });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{emp ? "Edit Employee" : "Add Employee"}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">Personal Info</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Employee Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Employee ID *</label>
                <input className="form-input" value={form.empId} onChange={e => set("empId", e.target.value)} placeholder="EMP001" />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Mason" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input className="form-input" type="date" value={form.joinDate} onChange={e => set("joinDate", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Salary Details</div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Basic Salary (MVR)</label>
                <input className="form-input" type="number" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Attendance Allowance</label>
                <input className="form-input" type="number" value={form.attendanceAllowance} onChange={e => set("attendanceAllowance", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Accommodation Allow.</label>
                <input className="form-input" type="number" value={form.accommodationAllowance} onChange={e => set("accommodationAllowance", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Food Allowance/Month</label>
                <input className="form-input" type="number" value={form.foodAllowance} onChange={e => set("foodAllowance", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Allowance/Month</label>
                <input className="form-input" type="number" value={form.phoneAllowance} onChange={e => set("phoneAllowance", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">OT Rates (System Defaults)</div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">General OT (MVR/hr)</label>
                <input className="form-input" type="number" value={form.otRate} onChange={e => set("otRate", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Concrete OT (MVR/each)</label>
                <input className="form-input" type="number" value={form.concreteOT} onChange={e => set("concreteOT", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cement OT (MVR/each)</label>
                <input className="form-input" type="number" value={form.cementOT} onChange={e => set("cementOT", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Employment Status</div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.empStatus || "active"} onChange={e => set("empStatus", e.target.value)}>
                  {Object.entries(EMP_STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status Date</label>
                <input className="form-input" type="date" value={form.statusDate || ""} onChange={e => set("statusDate", e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.statusNote || ""} onChange={e => set("statusNote", e.target.value)} placeholder="e.g. Returned to home country, expected back 01 May" />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!form.name || !form.empId) return alert("Name and ID are required");
            onSave({ ...form, id: emp?.id || genId() });
          }}>Save Employee</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGES
// ============================================================

// DASHBOARD
function Dashboard({ employees, sites, attendance, rosters }) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todayAtt = attendance[todayKey] || {};
  // attendance[date][siteId][empId] — flatten across all sites
  const todayAllEmps = Object.values(todayAtt).flatMap(siteMap => Object.values(siteMap));
  const presentToday = todayAllEmps.filter(r => r.status === "P").length;
  const absentToday = todayAllEmps.filter(r => r.status === "A").length;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Employees</div>
          <div className="stat-value blue">{employees.filter(e => (e.empStatus||"active") === "active").length}</div>
          {employees.filter(e => (e.empStatus||"active") !== "active").length > 0 &&
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{employees.filter(e => (e.empStatus||"active") !== "active").length} inactive</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Work Sites</div>
          <div className="stat-value purple">{sites.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Present Today</div>
          <div className="stat-value green">{presentToday}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Absent Today</div>
          <div className="stat-value yellow">{absentToday}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Sites Overview</div></div>
          <div className="card-body">
            {sites.length === 0 ? <div className="empty-state"><p>No sites added yet</p></div> :
              sites.map(s => {
                // Count employees who appear in any roster for this site
                const rosterKeys = Object.keys(rosters).filter(k => k.includes(`:${s.id}`));
                const empSet = new Set();
                rosterKeys.forEach(k => Object.keys(rosters[k]).forEach(id => empSet.add(id)));
                const count = empSet.size;
                return (
                  <div key={s.id} className="flex-between" style={{ marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div className="text-sm">{count} assigned in rosters</div>
                    </div>
                    <span className="badge badge-blue">{count}</span>
                  </div>
                );
              })
            }
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Attendance ({todayKey})</div></div>
          <div className="card-body">
            {Object.keys(todayAtt).length === 0 ? <div className="empty-state"><p>No attendance entered today</p></div> :
              employees.filter(e => todayAtt[e.id]).slice(0, 8).map(e => (
                <div key={e.id} className="flex-between" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13 }}>{e.name}</div>
                  <span className={`badge ${todayAtt[e.id]?.status === "P" ? "badge-green" : todayAtt[e.id]?.status === "A" ? "badge-red" : "badge-yellow"}`}>
                    {todayAtt[e.id]?.status || "?"}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// SITES PAGE
function SitesPage({ sites, setSites, toast }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editing, setEditing] = useState(null);

  const addSite = () => {
    if (!name.trim()) return toast("Site name required", "error");
    if (editing) {
      setSites(p => p.map(s => s.id === editing ? { ...s, name, location } : s));
      setEditing(null); toast("Site updated", "success");
    } else {
      setSites(p => [...p, { id: genId(), name, location }]);
      toast("Site added", "success");
    }
    setName(""); setLocation("");
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header"><div className="card-title">{editing ? "Edit Site" : "Add Work Site"}</div></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Site Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Site A - Male" />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Notes</label>
              <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Address or description" />
            </div>
          </div>
          <div className="mt-4 gap-2">
            <button className="btn btn-primary" onClick={addSite}>{editing ? "Update" : "Add Site"}</button>
            {editing && <button className="btn btn-ghost" onClick={() => { setEditing(null); setName(""); setLocation(""); }}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Sites ({sites.length})</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Site Name</th><th>Location</th><th>Actions</th></tr></thead>
            <tbody>
              {sites.length === 0 ? (
                <tr><td colSpan={3}><div className="empty-state"><div className="icon">🏗️</div><p>No sites added</p></div></td></tr>
              ) : sites.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.location || "—"}</td>
                  <td>
                    <div className="gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(s.id); setName(s.name); setLocation(s.location || ""); }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setSites(p => p.filter(x => x.id !== s.id)); toast("Site deleted", "success"); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// EMPLOYEES PAGE
function EmployeesPage({ employees, setEmployees, toast }) {
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickStatus, setQuickStatus] = useState(null); // { emp, newStatus }

  const filtered = employees.filter(e => {
    const matchText = e.name.toLowerCase().includes(filter.toLowerCase()) || e.empId.toLowerCase().includes(filter.toLowerCase());
    const matchStatus = statusFilter === "all" || (e.empStatus || "active") === statusFilter;
    return matchText && matchStatus;
  });

  const counts = { all: employees.length };
  Object.keys(EMP_STATUS_META).forEach(s => {
    counts[s] = employees.filter(e => (e.empStatus || "active") === s).length;
  });

  const applyQuickStatus = (newStatus, date, note) => {
    setEmployees(p => p.map(e => e.id === quickStatus.emp.id
      ? { ...e, empStatus: newStatus, statusDate: date, statusNote: note }
      : e
    ));
    toast(`Status changed to ${EMP_STATUS_META[newStatus].label}`, "success");
    setQuickStatus(null);
  };

  return (
    <div>
      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All", "badge-blue"], ...Object.entries(EMP_STATUS_META).map(([k,v]) => [k, v.label, v.badge])].map(([k, label, badge]) => (
          <div key={k} onClick={() => setStatusFilter(k)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: statusFilter === k ? "rgba(59,130,246,0.15)" : "var(--surface2)",
              border: `1px solid ${statusFilter === k ? "#3b82f6" : "var(--border)"}`,
              color: statusFilter === k ? "#3b82f6" : "var(--text3)", transition: "all 0.12s" }}>
            {label} <span style={{ background: "var(--surface3)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{counts[k] || 0}</span>
          </div>
        ))}
      </div>

      <div className="flex-between mb-4">
        <input className="form-input" style={{ width: 240 }} placeholder="Search name / ID..." value={filter} onChange={e => setFilter(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setModal("new")}>+ Add Employee</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emp ID</th><th>Name</th><th>Designation</th><th>Phone</th>
                <th>Basic Salary</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="icon">👷</div><p>No employees found</p></div></td></tr>
              ) : filtered.map(e => {
                const st = e.empStatus || "active";
                const meta = EMP_STATUS_META[st] || EMP_STATUS_META.active;
                return (
                  <tr key={e.id}>
                    <td className="text-mono" style={{ color: "var(--accent)" }}>{e.empId}</td>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td>{e.designation || "—"}</td>
                    <td>{e.phone || "—"}</td>
                    <td className="text-mono">{mvr(e.basicSalary)}</td>
                    <td>
                      <div>
                        <span className={`badge ${meta.badge}`}>{meta.icon} {meta.label}</span>
                        {e.statusDate && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>Since {e.statusDate}</div>}
                        {e.statusNote && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.statusNote}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="gap-2" style={{ flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setQuickStatus({ emp: e })}>⚡ Status</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(e)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          if (confirm("Delete this employee?")) {
                            setEmployees(p => p.filter(x => x.id !== e.id));
                            toast("Employee deleted", "success");
                          }
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Status Change Modal */}
      {quickStatus && <QuickStatusModal emp={quickStatus.emp} onSave={applyQuickStatus} onClose={() => setQuickStatus(null)} />}

      {modal && (
        <EmployeeModal
          emp={modal === "new" ? null : modal}
          onSave={emp => {
            if (modal === "new") {
              setEmployees(p => [...p, emp]);
              toast("Employee added", "success");
            } else {
              setEmployees(p => p.map(e => e.id === emp.id ? emp : e));
              toast("Employee updated", "success");
            }
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function QuickStatusModal({ emp, onSave, onClose }) {
  const [newStatus, setNewStatus] = useState(emp.empStatus || "active");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(emp.statusNote || "");

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Change Status — {emp.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {Object.entries(EMP_STATUS_META).map(([k, v]) => (
              <div key={k} onClick={() => setNewStatus(k)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${newStatus === k ? v.color : "var(--border)"}`,
                  background: newStatus === k ? `${v.color}18` : "var(--surface2)", transition: "all 0.12s" }}>
                <span style={{ fontSize: 20 }}>{v.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: newStatus === k ? v.color : "var(--text)", fontSize: 14 }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    {k === "active" && "Employee is working normally"}
                    {k === "leave" && "Temporary leave — will return"}
                    {k === "fled" && "Employee has absconded / run away"}
                    {k === "resigned" && "Employee has formally resigned"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Effective Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Expected back 1 May, Resigned via email..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(newStatus, date, note)}>Save Status</button>
        </div>
      </div>
    </div>
  );
}


// ROSTER PAGE — one global roster per month (no site selection)
function RosterPage({ employees, rosters, setRosters, toast }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showPicker, setShowPicker] = useState(false);

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);

  const firstOfMonth = new Date(year, month, 1);
  const canEdit = today >= new Date(firstOfMonth.getTime() - 3 * 86400000);

  const rKey = monthKey;
  const roster = rosters[rKey] || {};
  const assignedIds = Object.keys(roster);
  const rosterEmps = employees.filter(e => assignedIds.includes(e.id));

  const TYPES = ["W", "O", "H", "L"];
  const TYPE_LABELS = { W: "Work", O: "Off", H: "Holiday", L: "Leave" };

  // Returns true if a day should be locked due to employee status
  const isDayLocked = (emp, day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return !isEmpActiveOnDate(emp, dateStr);
  };

  // What label to show on a locked cell
  const lockedLabel = (emp) => {
    const st = emp.empStatus || "active";
    if (st === "leave")    return { text: "LV", color: "#f59e0b", bg: "rgba(245,158,11,0.18)", title: "On Leave" };
    if (st === "fled")     return { text: "FL", color: "#ef4444", bg: "rgba(239,68,68,0.18)",  title: "Fled" };
    if (st === "resigned") return { text: "RS", color: "#94a3b8", bg: "rgba(148,163,184,0.18)",title: "Resigned" };
    return null;
  };

  const cycleType = (emp, day) => {
    if (!canEdit) return;
    if (isDayLocked(emp, day)) return; // locked — do nothing
    const cur = roster[emp.id]?.[day] || "W";
    const next = TYPES[(TYPES.indexOf(cur) + 1) % TYPES.length];
    setRosters(p => ({ ...p, [rKey]: { ...p[rKey], [emp.id]: { ...(p[rKey]?.[emp.id] || {}), [day]: next } } }));
  };

  const toggleEmp = (empId) => {
    if (assignedIds.includes(empId)) {
      const updated = { ...roster };
      delete updated[empId];
      setRosters(p => ({ ...p, [rKey]: updated }));
    } else {
      const sched = {};
      for (let d = 1; d <= days; d++) sched[d] = isFriday(year, month, d) ? "H" : "W";
      setRosters(p => ({ ...p, [rKey]: { ...p[rKey], [empId]: sched } }));
    }
  };

  const initAllDays = () => {
    const base = {};
    rosterEmps.forEach(e => {
      base[e.id] = {};
      for (let d = 1; d <= days; d++) base[e.id][d] = roster[e.id]?.[d] || (isFriday(year, month, d) ? "H" : "W");
    });
    setRosters(p => ({ ...p, [rKey]: base }));
    toast("Roster initialized — Fridays set as Holiday", "success");
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-body">
          <div className="gap-3">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {canEdit && (
              <>
                <div className="form-group" style={{ justifyContent: "flex-end" }}>
                  <label className="form-label">&nbsp;</label>
                  <button className="btn btn-ghost" onClick={() => setShowPicker(true)}>
                    👷 Assign Staff ({assignedIds.length})
                  </button>
                </div>
                {rosterEmps.length > 0 && (
                  <div className="form-group" style={{ justifyContent: "flex-end" }}>
                    <label className="form-label">&nbsp;</label>
                    <button className="btn btn-primary" onClick={initAllDays}>↺ Re-init Days</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="alert alert-warning">⚠ Roster editing opens 3 days before the month starts ({new Date(firstOfMonth.getTime() - 3*86400000).toDateString()})</div>
      )}

      {canEdit && rosterEmps.length === 0 && (
        <div className="alert alert-info">ℹ Click "Assign Staff" to add employees to the {months[month]} {year} roster.</div>
      )}

      {rosterEmps.length > 0 && (
        <>
          <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {TYPES.map(t => (
              <span key={t} className={`badge ${t==="W"?"badge-blue":t==="O"?"badge-green":t==="H"?"badge-yellow":"badge-purple"}`}>
                {t} = {TYPE_LABELS[t]}
              </span>
            ))}
            <span className="badge" style={{ background: "rgba(245,158,11,0.18)", color: "#f59e0b", border: "1px solid #f59e0b44" }}>LV = On Leave</span>
            <span className="badge" style={{ background: "rgba(239,68,68,0.18)", color: "#ef4444", border: "1px solid #ef444444" }}>FL = Fled</span>
            <span className="badge" style={{ background: "rgba(148,163,184,0.18)", color: "#94a3b8", border: "1px solid #94a3b844" }}>RS = Resigned</span>
            {canEdit && <span className="text-sm" style={{ marginLeft: 4 }}>Tap cells to cycle · Locked cells cannot be changed</span>}
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Duty Roster — {months[month]} {year}</div>
              {canEdit && <button className="btn btn-success btn-sm" onClick={() => toast("Roster saved!", "success")}>✓ Save</button>}
            </div>
            <div className="roster-grid">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", minWidth: 130, position: "sticky", left: 0, background: "var(--surface2)", zIndex: 2 }}>Employee</th>
                    {Array.from({ length: days }, (_, i) => {
                      const d = i + 1;
                      return <th key={d} style={{ color: isFriday(year,month,d) ? "var(--warning)" : undefined }}>{getDayName(year,month,d)}<br/>{d}</th>;
                    })}
                    <th style={{ color: "#3b82f6" }}>W</th>
                    <th style={{ color: "#f59e0b" }}>H</th>
                    <th style={{ color: "#8b5cf6" }}>L</th>
                    <th style={{ color: "#10b981" }}>O</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterEmps.map(e => {
                    const row = roster[e.id] || {};
                    const locked = lockedLabel(e);
                    const counts = { W: 0, H: 0, L: 0, O: 0 };
                    for (let d = 1; d <= days; d++) {
                      if (!isDayLocked(e, d)) {
                        const t = row[d] || "W";
                        counts[t] = (counts[t]||0)+1;
                      }
                    }
                    const empStatus = e.empStatus || "active";
                    const statusMeta = EMP_STATUS_META[empStatus];
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600, fontSize: 12, position: "sticky", left: 0, background: "var(--surface)", zIndex: 1 }}>
                          <div>{e.name}</div>
                          {e.designation && <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>{e.designation}</div>}
                          {empStatus !== "active" && (
                            <div style={{ marginTop: 3 }}>
                              <span className={`badge ${statusMeta.badge}`} style={{ fontSize: 9 }}>{statusMeta.icon} {statusMeta.label}</span>
                              {e.statusDate && <div style={{ fontSize: 9, color: "var(--text3)" }}>from {e.statusDate}</div>}
                            </div>
                          )}
                        </td>
                        {Array.from({ length: days }, (_, i) => {
                          const d = i + 1;
                          const isLocked = isDayLocked(e, d);
                          const t = row[d] || "W";
                          if (isLocked && locked) {
                            return (
                              <td key={d} style={{ padding: 3 }} title={`${locked.title} — cannot edit`}>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: 26, height: 26, borderRadius: 4, fontSize: 9, fontWeight: 800,
                                  background: locked.bg, color: locked.color,
                                  border: `1px solid ${locked.color}44`, cursor: "not-allowed",
                                  userSelect: "none"
                                }}>{locked.text}</span>
                              </td>
                            );
                          }
                          return (
                            <td key={d} style={{ padding: 3 }}>
                              <span className={`roster-cell roster-${t}`} onClick={() => cycleType(e, d)} style={{ cursor: canEdit ? "pointer" : "default" }}>{t}</span>
                            </td>
                          );
                        })}
                        <td style={{ fontWeight: 700, color: "#3b82f6" }}>{counts.W}</td>
                        <td style={{ fontWeight: 700, color: "#f59e0b" }}>{counts.H}</td>
                        <td style={{ fontWeight: 700, color: "#8b5cf6" }}>{counts.L}</td>
                        <td style={{ fontWeight: 700, color: "#10b981" }}>{counts.O}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Staff Picker Modal */}
      {showPicker && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">Assign Staff — {months[month]} {year}</div>
              <button className="modal-close" onClick={() => setShowPicker(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                ℹ Select all employees working this month. This roster is shared across all sites.
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => employees.forEach(e => !assignedIds.includes(e.id) && toggleEmp(e.id))}>Select All</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { const copy = { ...roster }; employees.forEach(e => delete copy[e.id]); setRosters(p => ({ ...p, [rKey]: copy })); }}>Clear All</button>
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                {employees.length === 0 ? (
                  <div className="empty-state"><p>No employees added yet</p></div>
                ) : employees.map(e => {
                  const isAssigned = assignedIds.includes(e.id);
                  const st = e.empStatus || "active";
                  const stMeta = EMP_STATUS_META[st];
                  return (
                    <label key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: isAssigned ? "rgba(59,130,246,0.06)" : "transparent" }}>
                      <input type="checkbox" checked={isAssigned} onChange={() => toggleEmp(e.id)} style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                        <div className="text-sm">{e.empId}{e.designation ? ` · ${e.designation}` : ""}</div>
                      </div>
                      <span className={`badge ${stMeta.badge}`} style={{ fontSize: 9 }}>{stMeta.icon} {stMeta.label}</span>
                      {isAssigned && <span className="badge badge-blue">✓</span>}
                    </label>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>
                {assignedIds.length} of {employees.length} employees assigned
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowPicker(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED: OT stepper widget
// ============================================================
function OTStepper({ label, unit, step, color, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 7 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => onChange(Math.max(0, +((value||0) - step).toFixed(1)))}
          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface3)", color: "var(--text)", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>−</button>
        <input type="number" min="0" step={step} value={value || 0}
          onChange={x => onChange(Math.max(0, parseFloat(x.target.value) || 0))}
          style={{ width: 60, background: "var(--surface3)", border: `1px solid ${color}44`, color, borderRadius: 8, padding: "5px 6px", fontSize: 16, fontFamily: "var(--mono)", fontWeight: 800, textAlign: "center" }} />
        <button onClick={() => onChange(+((value||0) + step).toFixed(1))}
          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface3)", color: "var(--text)", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>+</button>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>{unit}</span>
      </div>
    </div>
  );
}

// ============================================================
// SHARED: Attendance step breadcrumb
// ============================================================
function StepBreadcrumb({ steps, labels, current, onGoTo }) {
  const idx = steps.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20, flexWrap: "wrap" }}>
      {labels.map((l, i) => {
        const active = i === idx, done = i < idx;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div onClick={() => done && onGoTo(i)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20,
              fontSize: 12, fontWeight: 700, cursor: done ? "pointer" : "default",
              background: active ? "rgba(59,130,246,0.15)" : done ? "rgba(16,185,129,0.1)" : "var(--surface2)",
              color: active ? "#3b82f6" : done ? "#10b981" : "var(--text3)",
              border: `1px solid ${active ? "#3b82f6" : done ? "#10b981" : "var(--border)"}`,
            }}>
              <span>{done ? "✓" : i + 1}</span> {l}
            </div>
            {i < labels.length - 1 && <div style={{ width: 18, height: 1, background: "var(--border)", margin: "0 2px" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// ATTENDANCE PAGE
// attendance[date][siteId][empId] = { status, minutesLate }
// OT is entered separately in OTEntryPage
// ============================================================
function AttendancePage({ employees, sites, attendance, setAttendance, rosters, toast }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState("date");
  const [date, setDate] = useState(todayStr);
  const [siteId, setSiteId] = useState("");
  const [localAtt, setLocalAtt] = useState({});
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

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
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="card-header"><div className="card-title">Step 1 — Select Date</div></div>
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
                <div key={sid} className="card" style={{ cursor: "pointer" }} onClick={() => { setStep("site"); goToStaff(sid); }}>
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s?.name || sid}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>{Object.keys(empMap).length} staff · {pCount} present</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="badge badge-green">✓ Saved</span>
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
                <div key={s.id} onClick={() => goToStaff(s.id)}
                  style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color 0.15s" }}
                  onMouseEnter={ev => ev.currentTarget.style.borderColor="#3b82f6"}
                  onMouseLeave={ev => ev.currentTarget.style.borderColor="var(--border)"}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    {s.location && <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.location}</div>}
                  </div>
                  {existingCount > 0 ? <span className="badge badge-green">✓ {existingCount} entered</span> : <span className="badge badge-gray">Not entered</span>}
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

// ============================================================
// OT ENTRY PAGE
// ot[date][siteId][empId] = { genOT, concreteOT, cementOT }
// Employee can do OT at a DIFFERENT site from their attendance site.
// Any employee who was Present/HalfDay today (across any site) can be selected.
// ============================================================
function OTEntryPage({ employees, sites, attendance, ot, setOt, rosters, toast }) {
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


// TIMESHEET REVIEW PAGE
function TimesheetPage({ employees, sites, attendance, setAttendance, rosters, toast }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [siteId, setSiteId] = useState("");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState({});

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);
  // Global roster key
  const roster = rosters[monthKey] || {};
  const assignedIds = Object.keys(roster);
  // attendance[date][siteId][empId] — find emp in any site for the day, or filter by selected site
  const getAtt = (empId, d) => {
    const dk = `${monthKey}-${String(d).padStart(2,"0")}`;
    const dayData = attendance[dk] || {};
    if (siteId) return dayData[siteId]?.[empId];
    // no site filter: find first site that has this employee
    for (const sid of Object.keys(dayData)) {
      if (dayData[sid]?.[empId]) return dayData[sid][empId];
    }
    return undefined;
  };

  // Show employees assigned via roster. If siteId selected, only show those who appear in that site's attendance this month.
  const siteEmps = useMemo(() => {
    const base = employees.filter(e => assignedIds.includes(e.id));
    if (!siteId) return base;
    return base.filter(e => {
      for (let d = 1; d <= days; d++) {
        const dk = `${monthKey}-${String(d).padStart(2,"0")}`;
        if (attendance[dk]?.[siteId]?.[e.id]) return true;
      }
      return false;
    });
  }, [employees, assignedIds, siteId, attendance, days, monthKey]);

  const monthEnded = new Date(year, month + 1, 0) < today;
  const statusColors = { P:"badge-green", A:"badge-red", H:"badge-yellow", S:"badge-purple", L:"badge-gray" };

  const startEdit = (empId, day) => {
    const dk = `${monthKey}-${String(day).padStart(2,"0")}`;
    // find which site this emp was recorded under
    const dayData = attendance[dk] || {};
    let foundSite = siteId;
    if (!foundSite) {
      foundSite = Object.keys(dayData).find(sid => dayData[sid]?.[empId]);
    }
    const cur = (foundSite ? dayData[foundSite]?.[empId] : null) || { status: "P", genOT: 0, concreteOT: 0, cementOT: 0, minutesLate: 0 };
    setEditing({ empId, day, dk, siteKey: foundSite });
    setEditVal({ ...cur });
  };

  const saveEdit = () => {
    const { dk, empId, siteKey } = editing;
    if (!siteKey) { toast("Cannot determine site for this record", "error"); return; }
    setAttendance(p => ({
      ...p,
      [dk]: { ...(p[dk] || {}), [siteKey]: { ...(p[dk]?.[siteKey] || {}), [empId]: editVal } }
    }));
    setEditing(null);
    toast("Updated", "success");
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-body">
          <div className="gap-3" style={{ flexWrap: "wrap" }}>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
                {months.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Site</label>
              <select className="form-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">Select Site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {siteId && siteEmps.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Timesheet — {months[month]} {year}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {!monthEnded && <span className="badge badge-yellow">⚠ Month not ended yet</span>}
              {monthEnded && <span className="badge badge-green">✓ Month Ended — Editable</span>}
              <button className="btn btn-success btn-sm" onClick={() => downloadAttendanceExcel({ employees: siteEmps, sites, attendance, rosters, months, month, year, siteId })}>
                ⬇ Download Excel
              </button>
            </div>
          </div>
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ fontSize: 11, minWidth: 1000 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 120 }}>Employee</th>
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1;
                    return <th key={d} style={{ minWidth: 36 }}>{getDayName(year,month,d)}<br/>{d}</th>;
                  })}
                  <th>P</th><th>A</th><th>H</th><th>S</th><th>L</th>
                </tr>
              </thead>
              <tbody>
                {siteEmps.map(e => {
                  const counts = { P: 0, A: 0, H: 0, S: 0, L: 0 };
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      {Array.from({ length: days }, (_, i) => {
                        const d = i + 1;
                        const a = getAtt(e.id, d);
                        const rosterType = roster[e.id]?.[d] || "W";
                        const st = a?.status || (rosterType === "H" ? "H" : rosterType === "L" ? "L" : "—");
                        if (counts[st] !== undefined) counts[st]++;
                        return (
                          <td key={d} style={{ padding: 3, cursor: "pointer" }} onClick={() => startEdit(e.id, d)}>
                            {a ? <span className={`badge ${statusColors[a.status] || "badge-gray"}`}>{a.status}</span> : <span style={{ color: "var(--text3)", fontSize: 10 }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ color: "#10b981", fontWeight: 700 }}>{counts.P}</td>
                      <td style={{ color: "#ef4444", fontWeight: 700 }}>{counts.A}</td>
                      <td style={{ color: "#f59e0b", fontWeight: 700 }}>{counts.H}</td>
                      <td style={{ color: "#8b5cf6", fontWeight: 700 }}>{counts.S}</td>
                      <td style={{ color: "#94a3b8", fontWeight: 700 }}>{counts.L}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Edit Attendance</div>
              <button className="modal-close" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-4">
                <label className="form-label">Status</label>
                <div className="att-status">
                  {["P","A","H","S","L"].map(s => (
                    <button key={s} className={`att-btn ${s} ${editVal.status === s ? "" : "inactive"}`} onClick={() => setEditVal(p => ({ ...p, status: s }))}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Gen OT (hrs)</label>
                  <input className="form-input" type="number" value={editVal.genOT || 0} onChange={e => setEditVal(p => ({ ...p, genOT: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Concrete OT</label>
                  <input className="form-input" type="number" value={editVal.concreteOT || 0} onChange={e => setEditVal(p => ({ ...p, concreteOT: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cement OT</label>
                  <input className="form-input" type="number" value={editVal.cementOT || 0} onChange={e => setEditVal(p => ({ ...p, cementOT: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Minutes Late</label>
                  <input className="form-input" type="number" value={editVal.minutesLate || 0} onChange={e => setEditVal(p => ({ ...p, minutesLate: +e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-success" onClick={saveEdit}>Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// DEDUCTIONS PAGE
function DeductionsPage({ employees, deductions, setDeductions, toast }) {
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ empIds: [], utility: 0, advance: 0, loanInstallment: 0, notes: "" });

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(filter.toLowerCase()) || e.empId.toLowerCase().includes(filter.toLowerCase())
  );

  const getDeduction = (empId) => deductions[empId] || { utility: 0, advance: 0, loanInstallment: 0, notes: "" };

  const openEdit = (emp) => {
    setModal(emp);
    setForm(getDeduction(emp.id));
  };

  const saveDeduction = () => {
    setDeductions(p => ({ ...p, [modal.id]: { ...form } }));
    setModal(null);
    toast("Deduction saved", "success");
  };

  const openBulk = () => {
    setModal("bulk");
    setForm({ empIds: [], utility: 0, advance: 0, loanInstallment: 0, notes: "" });
  };

  const saveBulk = () => {
    const updates = {};
    form.empIds.forEach(id => {
      updates[id] = { ...getDeduction(id), utility: Number(form.utility) || 0, advance: Number(form.advance) || 0, loanInstallment: Number(form.loanInstallment) || 0 };
    });
    setDeductions(p => ({ ...p, ...updates }));
    setModal(null);
    toast(`Deductions applied to ${form.empIds.length} employees`, "success");
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <input className="form-input" style={{ width: 240 }} placeholder="Search employee..." value={filter} onChange={e => setFilter(e.target.value)} />
        <button className="btn btn-primary" onClick={openBulk}>Bulk Apply Deductions</button>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Employee Deductions</div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Employee</th><th>ID</th><th>Utility</th><th>Advance</th><th>Loan Installment</th><th>Total</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const d = getDeduction(e.id);
                const total = (+d.utility||0) + (+d.advance||0) + (+d.loanInstallment||0);
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td className="text-mono" style={{ color: "var(--accent)" }}>{e.empId}</td>
                    <td className="text-mono">{mvr(d.utility)}</td>
                    <td className="text-mono">{mvr(d.advance)}</td>
                    <td className="text-mono">{mvr(d.loanInstallment)}</td>
                    <td className="text-mono" style={{ color: "var(--danger)", fontWeight: 700 }}>{mvr(total)}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && modal !== "bulk" && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Deductions — {modal.name}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-1">
                {[["utility","Utility Deduction"],["advance","Advance"],["loanInstallment","Loan Installment"]].map(([k,l]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l} (MVR)</label>
                    <input className="form-input" type="number" value={form[k] || 0} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveDeduction}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal === "bulk" && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">Bulk Apply Deductions</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-4">
                <label className="form-label">Select Employees</label>
                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                  {employees.map(e => (
                    <label key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={form.empIds.includes(e.id)} onChange={() => {
                        setForm(p => ({
                          ...p,
                          empIds: p.empIds.includes(e.id) ? p.empIds.filter(x => x !== e.id) : [...p.empIds, e.id]
                        }));
                      }} />
                      {e.name} <span className="text-sm">· {e.empId}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-grid form-grid-3">
                {[["utility","Utility"],["advance","Advance"],["loanInstallment","Loan Inst."]].map(([k,l]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <input className="form-input" type="number" value={form[k] || 0} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={form.empIds.length === 0} onClick={saveBulk}>Apply to {form.empIds.length} Employee(s)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PAYROLL PAGE
function PayrollPage({ employees, sites, attendance, ot, rosters, deductions, toast }) {
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
      const dk = `${monthKey}-${String(d).padStart(2,"0")}`;
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
          else if (a.status === "S") { sickDays++; absentDays++; }
          else if (a.status === "L") leaveDays++;
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

    const basicSalary      = Number(emp.basicSalary) || 0;
    const attendanceAllow_ = Number(emp.attendanceAllowance) || 0;
    const foodAllow_       = Number(emp.foodAllowance) || 0;
    const phoneAllow_      = Number(phoneAllowances[emp.id] ?? emp.phoneAllowance) || 0;
    const accommodationAllow_ = Number(emp.accommodationAllowance) || 0;

    // Daily rates — always based on total days in month
    const dailyBasic    = basicSalary      / (totalDays || 1);
    const dailyAttAllow = attendanceAllow_  / (totalDays || 1);
    const dailyFood     = foodAllow_        / (totalDays || 1);
    const dailyPhone    = phoneAllow_       / (totalDays || 1);
    const dailyAccom    = accommodationAllow_ / (totalDays || 1);

    // Days for allowance calculation — holidays + entered/projected work days - leave days
    const paidWorkDays  = presentDays + halfDays + absentDays; // all non-leave entered work days
    const paidAllowDays = holidayDays + presentDays; // days food/phone/accom paid (not leave, not absent, not off)

    // Basic salary breakdown
    const basicForWork    = dailyBasic * (presentDays + halfDays * 0.5); // present + half
    const basicForLeave   = dailyBasic * leaveDays;                       // leave = basic only
    const basicForHoliday = dailyBasic * holidayDays;                     // holidays
    // absent days = no basic
    const basicEarned     = basicForWork + basicForLeave + basicForHoliday;

    // Attendance allowance — only present + holiday days
    const attAllowEarned  = dailyAttAllow * (presentDays + holidayDays);

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

    // Food, phone, accommodation — paid for present + holiday days (not leave, absent, off)
    const foodAllow        = +(dailyFood  * paidAllowDays).toFixed(2);
    const phoneAllow       = +(dailyPhone * paidAllowDays).toFixed(2);
    const accommodationAllow = +(dailyAccom * paidAllowDays).toFixed(2);

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
      enteredWorkDays, activeDays, paidAllowDays, upTo,
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

                  <div style={{ padding: "12px 0" }}>
                    <div style={{ padding: "4px 20px 8px", fontSize: 10, fontWeight: 700, color: "#06b6d4", letterSpacing: 1, textTransform: "uppercase" }}>Earnings</div>
                    {[
                      ["Basic Salary (Work Days)", p.basicForWork, `${p.workDays - p.absentDays} days × ${mvr(p.dailyBasic)}/day`],
                      ["Basic Salary (Leave Days)", p.basicForLeave, `${p.leaveDays} leave days × ${mvr(p.dailyBasic)}/day`],
                      ["Basic Salary (Holidays)", p.basicForHoliday, `${p.holidayDays} days × ${mvr(p.dailyBasic)}/day`],
                      ["Attendance Allowance", p.attendanceAllow, `${p.presentDays + p.holidayDays} days × ${mvr(p.dailyAttAllow)}/day`],
                      ...(p.holidayAllowBelow > 0 ? [["Holiday OT (< 9.5 hrs)", p.holidayAllowBelow, `${p.holidayOTBelow.toFixed(1)} hrs × MVR30`]] : []),
                      ...(p.holidayAllowFull  > 0 ? [["Holiday OT (≥ 9.5 hrs)", p.holidayAllowFull,  `${p.holidayOTFull} day(s) × 1.5× attendance`]] : []),
                      ["General OT", p.genOTAmount, `${p.genOT} hrs`],
                      ["Concrete OT", p.concreteOTAmount, `${p.concreteOT} units`],
                      ["Cement OT", p.cementOTAmount, `${p.cementOT} units`],
                      ["Accommodation Allowance", p.accommodationAllow, `${p.paidAllowDays} days × ${mvr(p.dailyAccom)}/day`],
                      ["Food Allowance", p.foodAllow, `${p.paidAllowDays} days × ${mvr(p.dailyFood)}/day`],
                      ["Tea Allowance", p.teaAllow, `${p.presentDays} days × MVR10`],
                      ["Phone Allowance", p.phoneAllow, `${p.paidAllowDays} days × ${mvr(p.dailyPhone)}/day`],
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

// ============================================================
// MAIN APP
// ============================================================
const ALL_NAV = [
  { id: "dashboard", icon: "⊞", label: "Dashboard",   group: "Overview",    roles: ["manager","supervisor"] },
  { id: "sites",     icon: "🏗", label: "Work Sites",  group: "Setup",       roles: ["manager"] },
  { id: "employees", icon: "👷", label: "Employees",   group: "Setup",       roles: ["manager"] },
  { id: "deductions",icon: "💳", label: "Deductions",  group: "Setup",       roles: ["manager"] },
  { id: "roster",    icon: "📋", label: "Duty Roster", group: "Operations",  roles: ["manager","supervisor"] },
  { id: "attendance",icon: "✓",  label: "Attendance",  group: "Operations",  roles: ["manager","supervisor"] },
  { id: "otentry",   icon: "⏱", label: "OT Entry",    group: "Operations",  roles: ["manager","supervisor"] },
  { id: "timesheet", icon: "📊", label: "Timesheet",   group: "Operations",  roles: ["manager","supervisor"] },
  { id: "payroll",   icon: "💰", label: "Payroll",     group: "Payroll",     roles: ["manager"] },
];

const PAGE_TITLES = {
  dashboard: ["Dashboard",       "Overview of attendance and workforce"],
  sites:     ["Work Sites",      "Manage construction sites"],
  employees: ["Employees",       "Employee records and salary details"],
  deductions:["Deductions",      "Utility, advances, and loan installments"],
  roster:    ["Duty Roster",     "Monthly schedule planning"],
  attendance:["Daily Attendance","Mark attendance status per site"],
  otentry:   ["OT Entry",        "Enter overtime — can be at a different site"],
  timesheet: ["Timesheet Review","Review and edit monthly timesheets"],
  payroll:   ["Payroll",         "Generate salary slips and payroll"],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [ot, setOt] = useState({});
  const [rosters, setRosters] = useState({});
  const [deductions, setDeductions] = useState({});
  const [loaded, setLoaded] = useState(false);
  const { toasts, toast } = useToast();

  useEffect(() => {
    (async () => {
      // Verify saved session token with Supabase
      const savedSession = localStorage.getItem("att:session");
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          const sbUser = await sbGetUser(session.token);
          if (sbUser) {
            setUser(session); // token still valid
          } else {
            localStorage.removeItem("att:session"); // token expired
          }
        } catch {
          localStorage.removeItem("att:session");
        }
      }
      // Load app data from Supabase
      const [e, s, a, r, d, o] = await Promise.all([
        load(KEYS.employees), load(KEYS.sites), load(KEYS.attendance),
        load(KEYS.rosters), load(KEYS.deductions), load(KEYS.ot)
      ]);
      if (e) setEmployees(e);
      if (s) setSites(s);
      if (a) setAttendance(a);
      if (r) setRosters(r);
      if (d) setDeductions(d);
      if (o) setOt(o);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) save(KEYS.employees, employees); }, [employees, loaded]);
  useEffect(() => { if (loaded) save(KEYS.sites, sites); }, [sites, loaded]);
  useEffect(() => { if (loaded) save(KEYS.attendance, attendance); }, [attendance, loaded]);
  useEffect(() => { if (loaded) save(KEYS.rosters, rosters); }, [rosters, loaded]);
  useEffect(() => { if (loaded) save(KEYS.deductions, deductions); }, [deductions, loaded]);
  useEffect(() => { if (loaded) save(KEYS.ot, ot); }, [ot, loaded]);

  const handleLogin = (u) => {
    localStorage.setItem("att:session", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = async () => {
    if (user?.token) await sbSignOut(user.token);
    localStorage.removeItem("att:session");
    setUser(null);
    setPage("dashboard");
  };

  if (!loaded) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0a0e1a", color:"#3b82f6", fontFamily:"Sora,sans-serif", fontSize:16 }}>
      <style>{CSS}</style>Loading…
    </div>
  );

  if (!user) return <><style>{CSS}</style><LoginPage onLogin={handleLogin} /></>;

  const NAV = ALL_NAV.filter(n => n.roles.includes(user.role));
  const groups = [...new Set(NAV.map(n => n.group))];
  const [title, sub] = PAGE_TITLES[page] || ["",""];
  const navItem = NAV.find(n => n.id === page);

  const closeSidebar = () => setSidebarOpen(false);
  const navigate = (id) => { setPage(id); closeSidebar(); };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={closeSidebar} />

        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <div>
              <div>Attend<span>Pro</span></div>
              <div className="sub">Alitho Construction</div>
            </div>
            <button className="sidebar-close" onClick={closeSidebar}>✕</button>
          </div>
          <div className="sidebar-nav">
            {groups.map(g => (
              <div key={g} className="nav-group">
                <div className="nav-label">{g}</div>
                {NAV.filter(n => n.group === g).map(n => (
                  <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => navigate(n.id)}>
                    <span className="nav-icon">{n.icon}</span>
                    {n.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="sidebar-user">
            <div className={`sidebar-avatar ${user.role}`}>{user.initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <button className="topbar-menu" onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="topbar-title">{navItem?.icon} {title}</div>
            <span className={`badge ${user.role === "manager" ? "role-manager" : "role-supervisor"}`}>{user.role}</span>
          </div>

          <div className="page-header">
            <div>
              <div className="page-title">{title}</div>
              <div className="page-sub">{sub}</div>
            </div>
            <span className={`badge ${user.role === "manager" ? "role-manager" : "role-supervisor"}`} style={{ fontSize: 11 }}>
              {user.initials} · {user.name}
            </span>
          </div>

          <div className="page-content">
            {page === "dashboard"  && <Dashboard employees={employees} sites={sites} attendance={attendance} rosters={rosters} />}
            {page === "sites"      && <SitesPage sites={sites} setSites={setSites} toast={toast} />}
            {page === "employees"  && <EmployeesPage employees={employees} setEmployees={setEmployees} toast={toast} />}
            {page === "deductions" && <DeductionsPage employees={employees} deductions={deductions} setDeductions={setDeductions} toast={toast} />}
            {page === "roster"     && <RosterPage employees={employees} rosters={rosters} setRosters={setRosters} toast={toast} />}
            {page === "attendance" && <AttendancePage employees={employees} sites={sites} attendance={attendance} setAttendance={setAttendance} rosters={rosters} toast={toast} />}
            {page === "otentry"    && <OTEntryPage employees={employees} sites={sites} attendance={attendance} ot={ot} setOt={setOt} rosters={rosters} toast={toast} />}
            {page === "timesheet"  && <TimesheetPage employees={employees} sites={sites} attendance={attendance} setAttendance={setAttendance} rosters={rosters} toast={toast} />}
            {page === "payroll"    && <PayrollPage employees={employees} sites={sites} attendance={attendance} ot={ot} rosters={rosters} deductions={deductions} toast={toast} />}
          </div>
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}
