import { useState, useEffect, useRef } from "react";
import { useToast, ToastContainer } from "./hooks/useToast";
import { load, save, sbGetUser, sbSignOut, getRoleInfo } from "./utils/supabase";
import { KEYS } from "./constants/keys";
import LoginPage         from "./pages/LoginPage";
import HRDashboard       from "./pages/HRDashboard";
import SitesPage         from "./pages/SitesPage";
import EmployeesPage     from "./pages/EmployeesPage";
import RosterPage        from "./pages/RosterPage";
import AttendancePage    from "./pages/AttendancePage";
import OTEntryPage       from "./pages/OTEntryPage";
import TimesheetPage     from "./pages/TimesheetPage";
import DeductionsPage    from "./pages/DeductionsPage";
import PayrollPage       from "./pages/PayrollPage";
import StatisticsPage    from "./pages/StatisticsPage";
import RecruitmentPage     from "./pages/RecruitmentPage";
import RecruitmentDashboard from "./pages/RecruitmentDashboard";
import QuotaPage            from "./pages/QuotaPage";
import RequirementsPage     from "./pages/RequirementsPage";
import LeaveManagementPage  from "./pages/LeaveManagementPage";
import LeaveDashboard      from "./pages/LeaveDashboard";
import LeaveTimetablePage  from "./pages/LeaveTimetablePage";
import LeaveRequestsPage   from "./pages/LeaveRequestsPage";
import PettyCashPage     from "./pages/PettyCashPage";
import PermitTrackingPage from "./pages/PermitTrackingPage";
import CompaniesPage        from "./pages/CompaniesPage";
import AttendanceDashboard  from "./pages/AttendanceDashboard";

// ── Module definitions ────────────────────────────────────────
// Each module has: id, icon, label, color, desc, comingSoon, roles, pages[]
// pages[].id maps directly to the page renderer below
export const MODULE_DEFS = [
  {
    id: "recruitment",
    icon: "👔", label: "Recruitment",
    color: "#3b82f6",
    desc: "Quota management, job requirements, and candidate tracking",
    comingSoon: false,
    roles: ["manager"],
    pages: [
      { id: "rec-dashboard",  icon: "📊", label: "Dashboard",    roles: ["manager"] },
      { id: "quota",          icon: "🎯", label: "Quota",        roles: ["manager"] },
      { id: "requirements",   icon: "📋", label: "Requirements", roles: ["manager"] },
      { id: "recruitment",    icon: "👤", label: "Recruitment",  roles: ["manager"] },
    ],
  },
  {
    id: "ems",
    icon: "👷", label: "EMS",
    color: "#8b5cf6",
    desc: "Employee records, work sites, and deductions",
    comingSoon: false,
    roles: ["manager", "supervisor"],
    pages: [
      { id: "employees",  icon: "👤", label: "Employees",  roles: ["manager", "supervisor"] },
      { id: "sites",      icon: "🏗", label: "Work Sites", roles: ["manager"] },
      { id: "deductions", icon: "💳", label: "Deductions", roles: ["manager"] },
    ],
  },
  {
    id: "attendance_ot",
    icon: "📅", label: "Attendance & OT",
    color: "#10b981",
    desc: "Daily attendance, overtime, duty roster, and timesheets",
    comingSoon: false,
    roles: ["manager", "supervisor"],
    pages: [
      { id: "att-dashboard", icon: "📅", label: "Dashboard",   roles: ["manager", "supervisor"] },
      { id: "attendance",    icon: "✓",  label: "Attendance",  roles: ["manager", "supervisor"] },
      { id: "otentry",       icon: "⏱", label: "OT Entry",    roles: ["manager", "supervisor"] },
      { id: "roster",        icon: "📋", label: "Duty Roster", roles: ["manager", "supervisor"] },
      { id: "timesheet",     icon: "📊", label: "Timesheet",   roles: ["manager"] },
    ],
  },
  {
    id: "payroll",
    icon: "💰", label: "Payroll",
    color: "#f59e0b",
    desc: "Salary calculations, payslips, and financial reports",
    comingSoon: false,
    roles: ["manager"],
    pages: [
      { id: "payroll",    icon: "💰", label: "Payroll",    roles: ["manager"] },
      { id: "statistics", icon: "📈", label: "Statistics", roles: ["manager"] },
    ],
  },
  {
    id: "leave",
    icon: "🏖", label: "Leave Management",
    color: "#06b6d4",
    desc: "Leave requests, timetable, and approvals",
    comingSoon: false,
    roles: ["manager", "supervisor"],
    pages: [
      { id: "leave-dashboard",  icon: "📊", label: "Dashboard",  roles: ["manager", "supervisor"] },
      { id: "leave-management", icon: "🏖", label: "Leave",      roles: ["manager", "supervisor"] },
      { id: "leave-timetable",  icon: "📅", label: "Timetable",  roles: ["manager", "supervisor"] },
      { id: "leave-requests",   icon: "📋", label: "Requests",   roles: ["manager"] },
    ],
  },
  {
    id: "pettycash",
    icon: "💵", label: "Petty Cash",
    color: "#ef4444",
    desc: "Cash requests, site expenses, and approvals",
    comingSoon: true,
    roles: ["manager"],
    pages: [
      { id: "pettycash", icon: "💵", label: "Petty Cash", roles: ["manager"] },
    ],
  },
  {
    id: "permits",
    icon: "📋", label: "Permit Tracking",
    color: "#ec4899",
    desc: "Companies, work permits, visa tracking, and renewals",
    comingSoon: false,
    roles: ["manager"],
    pages: [
      { id: "companies", icon: "🏢", label: "Companies",       roles: ["manager"] },
      { id: "permits",   icon: "📋", label: "Permit Tracking", roles: ["manager"] },
    ],
  },
];

// Returns the module that owns a given pageId (null = HR Dashboard)
function getModuleForPage(pageId) {
  if (!pageId || pageId === "hr-dashboard") return null;
  for (const m of MODULE_DEFS) {
    if (m.pages.some(p => p.id === pageId)) return m;
  }
  return null;
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(null);
  const [page, setPage]               = useState("hr-dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees]     = useState([]);
  const [sites, setSites]             = useState([]);
  const [attendance, setAttendance]   = useState({});
  const [ot, setOt]                   = useState({});
  const [rosters, setRosters]         = useState({});
  const [deductions, setDeductions]   = useState({});
  const [companies, setCompanies]     = useState([]);
  const [quotas, setQuotas]           = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [applicants, setApplicants]   = useState([]);
  const [leaves, setLeaves]                 = useState([]);
  const [leaveTimetable, setLeaveTimetable] = useState([]);
  const [loaded, setLoaded]           = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { toasts, toast } = useToast();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Session helpers ──
  const verifySession = async (token) => {
    if (!token) return null;
    return await sbGetUser(token) || null;
  };

  const forceExpire = () => {
    localStorage.removeItem("att:session");
    setUser(null);
    setSessionExpired(true);
  };

  // ── Initial data load ──
  useEffect(() => {
    (async () => {
      const savedSession = localStorage.getItem("att:session");
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          const sbUser  = await verifySession(session.token);
          if (sbUser) {
            const roleInfo = getRoleInfo(sbUser);
            setUser({ ...session, ...roleInfo });
          } else {
            localStorage.removeItem("att:session");
          }
        } catch {
          localStorage.removeItem("att:session");
        }
      }
      const [e, s, a, r, d, o, co, qu, rq, ap, lv, lt] = await Promise.all([
        load(KEYS.employees), load(KEYS.sites),    load(KEYS.attendance),
        load(KEYS.rosters),   load(KEYS.deductions), load(KEYS.ot),
        load(KEYS.companies), load(KEYS.quotas),   load(KEYS.requirements),
        load(KEYS.applicants), load(KEYS.leaves),  load(KEYS.leaveTimetable),
      ]);
      if (e)  setEmployees(e);
      if (s)  setSites(s);
      if (a)  setAttendance(a);
      if (r)  setRosters(r);
      if (d)  setDeductions(d);
      if (o)  setOt(o);
      if (co) setCompanies(co);
      if (qu) setQuotas(qu);
      if (rq) setRequirements(rq);
      if (ap) setApplicants(ap);
      if (lv) setLeaves(lv);
      if (lt) setLeaveTimetable(lt);
      setLoaded(true);
    })();
  }, []);

  // ── Periodic session check (every 4 min) ──
  useEffect(() => {
    const interval = setInterval(async () => {
      const u = userRef.current;
      if (!u?.token) return;
      if (!await verifySession(u.token)) forceExpire();
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Data persistence ──
  const saveData = async (key, val) => {
    const u = userRef.current;
    if (!u?.token) { forceExpire(); return; }
    if (!await save(key, val, u.token)) forceExpire();
  };

  useEffect(() => { if (loaded) saveData(KEYS.employees,  employees);  }, [employees,  loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.sites,      sites);      }, [sites,      loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.attendance, attendance); }, [attendance, loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.rosters,    rosters);    }, [rosters,    loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.deductions, deductions); }, [deductions, loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.ot,         ot);         }, [ot,         loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.companies,    companies);    }, [companies,    loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.quotas,       quotas);       }, [quotas,       loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.requirements, requirements); }, [requirements, loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.applicants,   applicants);   }, [applicants,   loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.leaves,         leaves);         }, [leaves,         loaded]);
  useEffect(() => { if (loaded) saveData(KEYS.leaveTimetable, leaveTimetable); }, [leaveTimetable, loaded]);

  // ── Auth handlers ──
  const handleLogin = (u) => {
    localStorage.setItem("att:session", JSON.stringify(u));
    setSessionExpired(false);
    setUser(u);
    setPage("hr-dashboard");
  };

  const handleLogout = async () => {
    if (user?.token) await sbSignOut(user.token);
    localStorage.removeItem("att:session");
    setUser(null);
    setPage("hr-dashboard");
  };

  // ── Loading screen ──
  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0e1a", color: "#3b82f6", fontFamily: "Sora,sans-serif", fontSize: 16 }}>
      Loading…
    </div>
  );

  // ── Login ──
  if (!user && !sessionExpired) return <LoginPage onLogin={handleLogin} />;

  // ── Session expired ──
  if (sessionExpired || !user) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ background: "#ef4444", color: "#fff", padding: "12px 20px", textAlign: "center", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <span>🔒 Your session expired — please sign in again.</span>
        <span style={{ fontSize: 11, opacity: 0.85 }}>⚠ Data entered while logged out was not saved.</span>
      </div>
      <LoginPage onLogin={handleLogin} />
    </div>
  );

  // ── Navigation helpers ──
  const navigate = (id) => { setPage(id); setSidebarOpen(false); };
  const closeSidebar = () => setSidebarOpen(false);

  const currentModule = getModuleForPage(page);
  const isHome        = page === "hr-dashboard";

  // Filter modules and pages visible to this user's role
  const visibleModules = MODULE_DEFS.filter(m => m.roles.includes(user.role));

  // Page label for topbar
  const currentPageDef = currentModule?.pages.find(p => p.id === page);
  const pageLabel      = isHome ? "HR Dashboard" : currentPageDef?.label || page;
  const moduleLabel    = isHome ? "" : currentModule?.label || "";

  return (
    <>
      <div className="app">
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={closeSidebar} />

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div>
              <div>Attend<span>Pro</span></div>
              <div className="sub">Alitho Construction</div>
            </div>
            <button className="sidebar-close" onClick={closeSidebar}>✕</button>
          </div>

          {/* Nav */}
          <div className="sidebar-nav">

            {/* Home / HR Dashboard — always visible */}
            <div className="nav-group">
              <div
                className={`nav-item ${isHome ? "active" : ""}`}
                onClick={() => navigate("hr-dashboard")}
              >
                <span className="nav-icon">⊞</span>
                HR Dashboard
              </div>
            </div>

            {/* When inside a module — show that module's sub-pages */}
            {currentModule ? (
              <div className="nav-group">
                <div className="nav-label" style={{ color: currentModule.color, letterSpacing: 1 }}>
                  {currentModule.icon} {currentModule.label}
                </div>
                {currentModule.pages
                  .filter(p => p.roles.includes(user.role))
                  .map(p => (
                    <div
                      key={p.id}
                      className={`nav-item ${page === p.id ? "active" : ""}`}
                      onClick={() => navigate(p.id)}
                    >
                      <span className="nav-icon">{p.icon}</span>
                      {p.label}
                    </div>
                  ))
                }
              </div>
            ) : (
              /* On HR Dashboard — show all modules as quick links */
              <div className="nav-group">
                <div className="nav-label">Modules</div>
                {visibleModules.map(m => {
                  const firstPage = m.pages.find(p => p.roles.includes(user.role));
                  return (
                    <div
                      key={m.id}
                      className="nav-item"
                      onClick={() => !m.comingSoon && firstPage && navigate(firstPage.id)}
                      style={{
                        opacity: m.comingSoon ? 0.45 : 1,
                        cursor: m.comingSoon ? "default" : "pointer",
                        borderLeft: `3px solid transparent`,
                      }}
                    >
                      <span className="nav-icon">{m.icon}</span>
                      <span style={{ flex: 1 }}>{m.label}</span>
                      {m.comingSoon && (
                        <span style={{ fontSize: 8, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8 }}>Soon</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User info */}
          <div className="sidebar-user">
            <div className={`sidebar-avatar ${user.role}`}>{user.initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="main">
          {/* Mobile topbar */}
          <div className="topbar">
            <button className="topbar-menu" onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="topbar-title">
              {moduleLabel ? `${moduleLabel} · ` : ""}{pageLabel}
            </div>
            <span className={`badge ${user.role === "manager" ? "role-manager" : "role-supervisor"}`}>
              {user.role}
            </span>
          </div>

          {/* Desktop page header */}
          {!isHome && (
            <div className="page-header">
              <div>
                {/* Breadcrumb */}
                {currentModule && (
                  <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{ cursor: "pointer", color: "var(--text3)" }}
                      onClick={() => navigate("hr-dashboard")}
                    >
                      HR Dashboard
                    </span>
                    <span>›</span>
                    <span
                      style={{ cursor: "pointer", color: currentModule.color }}
                      onClick={() => navigate(currentModule.pages.find(p => p.roles.includes(user.role))?.id)}
                    >
                      {currentModule.icon} {currentModule.label}
                    </span>
                    <span>›</span>
                    <span style={{ color: "var(--text2)" }}>{currentPageDef?.label}</span>
                  </div>
                )}
                <div className="page-title">{currentPageDef?.icon} {pageLabel}</div>
              </div>
              <span className={`badge ${user.role === "manager" ? "role-manager" : "role-supervisor"}`} style={{ fontSize: 11 }}>
                {user.initials} · {user.name}
              </span>
            </div>
          )}

          <div className="page-content">

            {/* ── HR Dashboard ── */}
            {isHome && (
              <HRDashboard
                employees={employees}
                sites={sites}
                attendance={attendance}
                ot={ot}
                rosters={rosters}
                user={user}
                onNavigate={navigate}
                modules={visibleModules}
              />
            )}

            {/* ── EMS ── */}
            {page === "employees"  && <EmployeesPage  employees={employees} setEmployees={setEmployees} toast={toast} user={user} attendance={attendance} rosters={rosters} ot={ot} sites={sites} deductions={deductions} leaves={leaves} setLeaves={setLeaves} />}
            {page === "sites"      && <SitesPage      sites={sites} setSites={setSites} toast={toast} companies={companies} />}
            {page === "deductions" && <DeductionsPage employees={employees} deductions={deductions} setDeductions={setDeductions} toast={toast} />}

            {/* ── Attendance & OT ── */}
            {page === "att-dashboard" && <AttendanceDashboard onNavigate={navigate} user={user} attendance={attendance} ot={ot} employees={employees} rosters={rosters} />}
            {page === "roster"     && <RosterPage     employees={employees} rosters={rosters} setRosters={setRosters} toast={toast} user={user} />}
            {page === "attendance" && <AttendancePage employees={employees} sites={sites} attendance={attendance} setAttendance={setAttendance} rosters={rosters} toast={toast} user={user} />}
            {page === "otentry"    && <OTEntryPage    employees={employees} sites={sites} attendance={attendance} ot={ot} setOt={setOt} rosters={rosters} toast={toast} />}
            {page === "timesheet"  && <TimesheetPage  employees={employees} sites={sites} attendance={attendance} setAttendance={setAttendance} rosters={rosters} toast={toast} />}

            {/* ── Payroll ── */}
            {page === "payroll"    && <PayrollPage    employees={employees} sites={sites} attendance={attendance} ot={ot} rosters={rosters} deductions={deductions} toast={toast} />}
            {page === "statistics" && <StatisticsPage employees={employees} sites={sites} attendance={attendance} ot={ot} rosters={rosters} deductions={deductions} />}

            {/* ── Recruitment ── */}
            {page === "rec-dashboard"  && <RecruitmentDashboard quotas={quotas} requirements={requirements} applicants={applicants} onNavigate={navigate} user={user} />}
            {page === "quota"          && <QuotaPage quotas={quotas} setQuotas={setQuotas} companies={companies} sites={sites} employees={employees} toast={toast} />}
            {page === "requirements"   && <RequirementsPage requirements={requirements} setRequirements={setRequirements} toast={toast} />}
            {page === "recruitment"    && <RecruitmentPage applicants={applicants} setApplicants={setApplicants} requirements={requirements} quotas={quotas} setQuotas={setQuotas} companies={companies} employees={employees} setEmployees={setEmployees} toast={toast} />}
            {page === "leave-dashboard"  && <LeaveDashboard leaves={leaves} employees={employees} leaveTimetable={leaveTimetable} onNavigate={navigate} user={user} />}
            {page === "leave-management" && <LeaveManagementPage leaves={leaves} setLeaves={setLeaves} employees={employees} leaveTimetable={leaveTimetable} toast={toast} user={user} />}
            {page === "leave-timetable"  && <LeaveTimetablePage leaveTimetable={leaveTimetable} setLeaveTimetable={setLeaveTimetable} leaves={leaves} employees={employees} toast={toast} user={user} />}
            {page === "leave-requests"   && <LeaveRequestsPage leaves={leaves} setLeaves={setLeaves} employees={employees} toast={toast} />}
            {page === "pettycash"   && <PettyCashPage />}
            {page === "permits"     && <PermitTrackingPage />}
            {page === "companies"   && <CompaniesPage companies={companies} setCompanies={setCompanies} toast={toast} />}
          </div>
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}
