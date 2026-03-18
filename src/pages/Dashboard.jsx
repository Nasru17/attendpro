import { getDaysInMonth } from "../utils/helpers";
import { EMP_STATUS_META } from "../constants/employees";

export default function Dashboard({ employees, sites, attendance, rosters, ot }) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  const totalDays = getDaysInMonth(today.getFullYear(), today.getMonth());
  const dayOfMonth = today.getDate();

  // Today's attendance flat across all sites
  const todayAtt = attendance[todayKey] || {};
  const todayFlatByEmp = {};
  Object.entries(todayAtt).forEach(([sid, empMap]) => {
    Object.entries(empMap).forEach(([eid, rec]) => { todayFlatByEmp[eid] = { ...rec, siteId: sid }; });
  });
  const presentToday   = Object.values(todayFlatByEmp).filter(r=>r.status==="P").length;
  const absentToday    = Object.values(todayFlatByEmp).filter(r=>r.status==="A").length;
  const halfToday      = Object.values(todayFlatByEmp).filter(r=>r.status==="H").length;
  const sickToday      = Object.values(todayFlatByEmp).filter(r=>r.status==="S").length;
  const leaveToday     = Object.values(todayFlatByEmp).filter(r=>r.status==="L").length;
  const enteredToday   = Object.values(todayFlatByEmp).length;

  const activeEmps     = employees.filter(e=>(e.empStatus||"active")==="active");
  const onLeave        = employees.filter(e=>e.empStatus==="leave").length;
  const fled           = employees.filter(e=>e.empStatus==="fled").length;
  const resigned       = employees.filter(e=>e.empStatus==="resigned").length;
  const rosterEmps     = Object.keys(rosters[monthKey]||{}).length;
  const attendanceRate = rosterEmps > 0 ? Math.round((presentToday / rosterEmps) * 100) : 0;

  // Last 7 days attendance trend
  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(today); d.setDate(today.getDate()-6+i);
    const dk = d.toISOString().slice(0,10);
    const dayAtt = attendance[dk]||{};
    let p=0,a=0,total=0;
    Object.values(dayAtt).forEach(siteMap=>Object.values(siteMap).forEach(r=>{total++;if(r.status==="P")p++;else if(r.status==="A")a++;}));
    return { date:dk, label:d.toLocaleDateString("en",{weekday:"short"}), day:d.getDate(), p, a, total };
  });
  const maxBar = Math.max(...last7.map(d=>d.total), 1);

  // Monthly summary so far
  const monthSummary = { P:0, A:0, H:0, S:0, L:0 };
  for (let d=1; d<=dayOfMonth; d++) {
    const dk = `${monthKey}-${String(d).padStart(2,"00")}`;
    const dayAtt = attendance[dk]||{};
    Object.values(dayAtt).forEach(sm=>Object.values(sm).forEach(r=>{if(monthSummary[r.status]!==undefined)monthSummary[r.status]++;}));
  }
  const monthTotal = Object.values(monthSummary).reduce((s,v)=>s+v,0);

  // Site-wise today
  const siteToday = sites.map(s=>{
    const sm = todayAtt[s.id]||{};
    const p = Object.values(sm).filter(r=>r.status==="P").length;
    const total = Object.values(sm).length;
    return { ...s, p, total };
  }).filter(s=>s.total>0);

  // OT this month
  let monthGenOT=0, monthConcreteOT=0, monthCementOT=0;
  for (let d=1; d<=dayOfMonth; d++) {
    const dk=`${monthKey}-${String(d).padStart(2,"00")}`;
    const otDay = ot?.[dk]||{};
    Object.values(otDay).forEach(sm=>Object.values(sm).forEach(r=>{monthGenOT+=(r.genOT||0);monthConcreteOT+=(r.concreteOT||0);monthCementOT+=(r.cementOT||0);}));
  }

  // Employees on leave / flagged
  const flaggedEmps = employees.filter(e=>e.empStatus&&e.empStatus!=="active");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Top KPI row */}
      <div className="stats-grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))" }}>
        {[
          { label:"Active Staff", value:activeEmps.length, sub:`${rosterEmps} in roster`, color:"#3b82f6", icon:"👷" },
          { label:"Present Today", value:presentToday, sub:`${attendanceRate}% of roster`, color:"#10b981", icon:"✅" },
          { label:"Absent Today",  value:absentToday,  sub:`${halfToday} half-day`, color:"#ef4444", icon:"❌" },
          { label:"Sick / Leave",  value:sickToday+leaveToday, sub:`${enteredToday} total entered`, color:"#f59e0b", icon:"🏖" },
          { label:"Work Sites",    value:sites.length, sub:`${siteToday.length} active today`, color:"#8b5cf6", icon:"🏗" },
          { label:"Month OT Hrs",  value:monthGenOT.toFixed(1), sub:`${monthConcreteOT} concrete · ${monthCementOT} cement`, color:"#06b6d4", icon:"⏱" },
        ].map(k=>(
          <div key={k.label} className="stat-card" style={{ position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", right:12, top:12, fontSize:22, opacity:0.15 }}>{k.icon}</div>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value" style={{ color:k.color, fontSize:28 }}>{k.value}</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Middle row: 7-day trend + monthly pie-like */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* 7-day bar trend */}
        <div className="card">
          <div className="card-header"><div className="card-title">📈 Last 7 Days — Attendance</div></div>
          <div className="card-body">
            <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:100 }}>
              {last7.map(d=>(
                <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:80, gap:1 }}>
                    {d.a>0&&<div style={{ background:"#ef444488", borderRadius:"3px 3px 0 0", height:`${(d.a/maxBar)*80}px`, minHeight:2, width:"100%" }} title={`Absent: ${d.a}`} />}
                    {d.p>0&&<div style={{ background:d.date===todayKey?"#10b981":"#3b82f688", borderRadius: d.a>0?"0":"3px 3px 0 0", height:`${(d.p/maxBar)*80}px`, minHeight:2, width:"100%" }} title={`Present: ${d.p}`} />}
                  </div>
                  <div style={{ fontSize:9, color:d.date===todayKey?"#3b82f6":"var(--text3)", fontWeight:d.date===todayKey?700:400 }}>{d.label}</div>
                  <div style={{ fontSize:8, color:"var(--text3)" }}>{d.day}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:12, marginTop:10, fontSize:10, color:"var(--text3)" }}>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, background:"#3b82f688", borderRadius:2, display:"inline-block" }}/> Present</span>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, background:"#ef444488", borderRadius:2, display:"inline-block" }}/> Absent</span>
            </div>
          </div>
        </div>

        {/* Month summary donut-style */}
        <div className="card">
          <div className="card-header"><div className="card-title">📅 {today.toLocaleString("en",{month:"long"})} So Far (Days 1–{dayOfMonth})</div></div>
          <div className="card-body">
            {monthTotal === 0
              ? <div className="empty-state"><p>No attendance entered this month yet.</p></div>
              : <>
                  {[
                    ["Present (P)",  monthSummary.P, "#10b981"],
                    ["Absent (A)",   monthSummary.A, "#ef4444"],
                    ["Half Day (H)", monthSummary.H, "#f59e0b"],
                    ["Sick (S)",     monthSummary.S, "#8b5cf6"],
                    ["Leave (L)",    monthSummary.L, "#94a3b8"],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <div style={{ flex:1, fontSize:12 }}>{l}</div>
                      <div style={{ width:120, height:8, background:"var(--surface3)", borderRadius:4, overflow:"hidden" }}>
                        <div style={{ width:`${monthTotal?Math.round((v/monthTotal)*100):0}%`, height:"100%", background:c, borderRadius:4, transition:"width 0.5s" }} />
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:c, width:32, textAlign:"right", fontFamily:"var(--mono)" }}>{v}</div>
                      <div style={{ fontSize:10, color:"var(--text3)", width:28, textAlign:"right" }}>{monthTotal?Math.round((v/monthTotal)*100):0}%</div>
                    </div>
                  ))}
                </>
            }
          </div>
        </div>
      </div>

      {/* Bottom row: site today + flagged employees */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* Site-wise today */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏗 Site Activity Today</div><span style={{ fontSize:11, color:"var(--text3)" }}>{todayKey}</span></div>
          <div className="card-body">
            {sites.length === 0 && <div className="empty-state"><p>No sites added</p></div>}
            {sites.map(s => {
              const sm = todayAtt[s.id]||{};
              const entries = Object.values(sm);
              const p = entries.filter(r=>r.status==="P").length;
              const a = entries.filter(r=>r.status==="A").length;
              const total = entries.length;
              const pct = total > 0 ? Math.round((p/total)*100) : 0;
              return (
                <div key={s.id} style={{ marginBottom:12, padding:"10px 12px", background:"var(--surface2)", borderRadius:8, border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{s.name}</div>
                    {total>0
                      ? <div style={{ display:"flex", gap:6 }}>
                          <span className="badge badge-green" style={{ fontSize:10 }}>✓ {p}</span>
                          {a>0&&<span className="badge badge-red" style={{ fontSize:10 }}>✗ {a}</span>}
                        </div>
                      : <span style={{ fontSize:11, color:"var(--text3)" }}>No entry</span>
                    }
                  </div>
                  {total>0&&(
                    <div style={{ height:4, background:"var(--surface3)", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:"#10b981", borderRadius:4 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Flagged / Inactive employees */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠ Staff Status Alerts</div>
            <span className="badge badge-yellow">{flaggedEmps.length} flagged</span>
          </div>
          <div className="card-body">
            {flaggedEmps.length === 0
              ? <div className="empty-state"><p>All employees are active ✓</p></div>
              : flaggedEmps.map(e=>{
                  const meta = EMP_STATUS_META[e.empStatus]||{};
                  return (
                    <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:`${meta.color}22`, color:meta.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{meta.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.name}</div>
                        <div style={{ fontSize:10, color:"var(--text3)" }}>{e.empId} · {e.statusDate||"no date"}</div>
                      </div>
                      <span className={`badge ${meta.badge}`} style={{ fontSize:10 }}>{meta.label}</span>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
