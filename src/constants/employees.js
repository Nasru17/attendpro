export const EMPTY_EMP = {
  // ── Core ──────────────────────────────────────────────────
  name: "", empId: "", designation: "", phone: "",
  basicSalary: "", attendanceAllowance: "", accommodationAllowance: "",
  foodAllowance: "", phoneAllowance: "",
  otRate: 20, concreteOT: 200, cementOT: 100, teaRate: 10,
  joinDate: "", empStatus: "active", statusDate: "", statusNote: "",
  salaryHistory: [], // [{ effectiveDate, basicSalary, attendanceAllowance, accommodationAllowance, foodAllowance, phoneAllowance }]

  // ── Contact ───────────────────────────────────────────────
  whatsapp: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",

  // ── Identity / Expat ──────────────────────────────────────
  nationality: "",
  nidNumber: "",   // NID (national ID card) for locals; for expats use passportNumber
  isExpat: false,
  agentName: "",
  agentContact: "",

  // ── Expat Documents ───────────────────────────────────────
  // Work Permit
  wpNumber: "", wpExpiry: "", wpFeePaid: false, wpFeePaidDate: "",
  // Passport
  passportNumber: "", passportExpiry: "",
  // Visa
  visaType: "", visaNumber: "", visaExpiry: "",
  // Medical
  medicalProvider: "", medicalExpiry: "",
  // Insurance
  insuranceProvider: "", insurancePolicyNo: "", insuranceExpiry: "",

  // ── Promotions ────────────────────────────────────────────
  // [{ id, date, fromDesignation, toDesignation, fromSalary, toSalary, note }]
  promotions: [],
};

// Get the salary record effective for a given month (YYYY-MM-DD = first day of month)
// Looks through salaryHistory sorted descending by effectiveDate, picks the first one <= targetDate
// Falls back to the employee's current salary fields if no history entry matches
export function getSalaryForMonth(emp, year, month) {
  const targetDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const history = emp.salaryHistory || [];
  // Sort descending by effectiveDate
  const sorted = [...history].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const match = sorted.find(h => h.effectiveDate <= targetDate);
  if (match) {
    return {
      basicSalary:             Number(match.basicSalary)            || 0,
      attendanceAllowance:     Number(match.attendanceAllowance)    || 0,
      accommodationAllowance:  Number(match.accommodationAllowance) || 0,
      foodAllowance:           Number(match.foodAllowance)          || 0,
      phoneAllowance:          Number(match.phoneAllowance)         || 0,
    };
  }
  // Fallback: use current salary fields on the employee record
  return {
    basicSalary:             Number(emp.basicSalary)            || 0,
    attendanceAllowance:     Number(emp.attendanceAllowance)    || 0,
    accommodationAllowance:  Number(emp.accommodationAllowance) || 0,
    foodAllowance:           Number(emp.foodAllowance)          || 0,
    phoneAllowance:          Number(emp.phoneAllowance)         || 0,
  };
}

export const EMP_STATUS_META = {
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
export function isEmpActiveOnDate(emp, dateStr) {
  const st = emp.empStatus || "active";
  if (st === "active") return true;
  if (!emp.statusDate) return false; // no date set, treat as locked for all
  // employee was active before their statusDate
  return dateStr < emp.statusDate;
}
