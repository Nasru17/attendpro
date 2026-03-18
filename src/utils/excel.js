// ============================================================
// EXCEL EXPORT — loads SheetJS from CDN on first use
// ============================================================
let _XLSX = null;
export async function getXLSX() {
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

export function styleCells(ws, range, style) {
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

export async function downloadPayrollExcel({ employees, months, month, year, calcPayroll }) {
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

export async function downloadAttendanceExcel({ employees, sites, attendance, rosters, months, month, year, siteId }) {
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
