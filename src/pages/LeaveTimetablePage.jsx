import { useState, useMemo } from "react";
import { genId } from "../utils/helpers";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function leaveOverlapsMonth(leave, year, month) {
  // month is 1-based
  const first = new Date(year, month - 1, 1);
  const last  = new Date(year, month, 0); // last day of month
  const start = new Date(leave.startDate);
  const end   = new Date(leave.endDate);
  return start <= last && end >= first;
}

function getInitials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function LeaveTimetablePage({ leaveTimetable, setLeaveTimetable, leaves, employees, toast, user }) {
  const isManager = user?.role === "manager";
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Bulk set state
  const [bulkSlots, setBulkSlots] = useState("");

  // Inline editing state: monthNum (1-12) or null
  const [editingMonth, setEditingMonth] = useState(null);
  const [editValue,    setEditValue]    = useState("");

  const approvedLeaves = useMemo(() => leaves.filter(l => l.status === "approved"), [leaves]);

  const monthData = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const month = idx + 1;
      const slot  = leaveTimetable.find(s => s.year === year && s.month === month);
      const usedLeaves = approvedLeaves.filter(l => leaveOverlapsMonth(l, year, month));
      const usedCount  = usedLeaves.length;
      const maxSlots   = slot?.maxSlots ?? null;
      const available  = maxSlots !== null ? maxSlots - usedCount : null;

      // Unique employees on approved leave in this month (deduplicated)
      const empIds = [...new Set(usedLeaves.map(l => l.employeeId))];
      const empBadges = empIds.map(id => {
        const e = employees.find(e => e.id === id);
        return { id, name: e?.name || id, initials: getInitials(e?.name || "") };
      });

      return { month, name, slot, usedCount, maxSlots, available, empBadges };
    });
  }, [leaveTimetable, approvedLeaves, employees, year]);

  const setSlotForMonth = (month, value) => {
    const slots = parseInt(value, 10);
    if (isNaN(slots) || slots < 0) return;
    setLeaveTimetable(prev => {
      const existing = prev.find(s => s.year === year && s.month === month);
      if (existing) {
        return prev.map(s => s.year === year && s.month === month ? { ...s, maxSlots: slots } : s);
      }
      return [...prev, { id: genId(), year, month, maxSlots: slots }];
    });
  };

  const handleEditSave = (month) => {
    setSlotForMonth(month, editValue);
    setEditingMonth(null);
    setEditValue("");
    toast("Slot updated", "success");
  };

  const handleBulkApply = () => {
    const slots = parseInt(bulkSlots, 10);
    if (isNaN(slots) || slots < 0) return toast("Enter a valid number", "error");
    setLeaveTimetable(prev => {
      const updated = [...prev];
      for (let m = 1; m <= 12; m++) {
        const idx = updated.findIndex(s => s.year === year && s.month === m);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], maxSlots: slots };
        } else {
          updated.push({ id: genId(), year, month: m, maxSlots: slots });
        }
      }
      return updated;
    });
    toast(`Set ${slots} slots for all months of ${year}`, "success");
    setBulkSlots("");
  };

  return (
    <div>
      {/* Year selector + Bulk set */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <button
              key={y}
              className={`btn btn-sm ${year === y ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setYear(y)}
            >{y}</button>
          ))}
        </div>

        {isManager && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>Set all months:</span>
            <input
              className="form-input"
              type="number"
              min={0}
              placeholder="Slots"
              value={bulkSlots}
              onChange={e => setBulkSlots(e.target.value)}
              style={{ width: 80, padding: "6px 10px" }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleBulkApply}>Apply</button>
          </div>
        )}
      </div>

      {/* Month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {monthData.map(({ month, name, maxSlots, usedCount, available, empBadges }) => {
          const isEditing   = editingMonth === month;
          const isFull      = maxSlots !== null && available !== null && available <= 0;
          const hasSlot     = maxSlots !== null;

          return (
            <div key={month} className="card" style={{
              border: `1px solid ${isFull ? "#ef444455" : "var(--border)"}`,
            }}>
              <div className="card-body" style={{ padding: "16px 18px" }}>
                {/* Month name + slot config */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>

                  {isManager ? (
                    isEditing ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          value={editValue}
                          autoFocus
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleEditSave(month); if (e.key === "Escape") setEditingMonth(null); }}
                          onBlur={() => handleEditSave(month)}
                          style={{ width: 64, padding: "4px 8px", fontSize: 12 }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {hasSlot ? (
                          <>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
                              {maxSlots} slots
                            </span>
                            <button
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 13, padding: 2 }}
                              onClick={() => { setEditingMonth(month); setEditValue(String(maxSlots)); }}
                              title="Edit slots"
                            >✏</button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => { setEditingMonth(month); setEditValue(""); }}
                          >+ Set</button>
                        )}
                      </div>
                    )
                  ) : (
                    hasSlot ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
                        {maxSlots} slots
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>— Not set</span>
                    )
                  )}
                </div>

                {/* Used / Available */}
                <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: "var(--text3)" }}>Used: </span>
                    <span style={{ fontWeight: 700, color: usedCount > 0 ? "#f59e0b" : "var(--text3)" }}>{usedCount}</span>
                  </div>
                  {hasSlot && (
                    <div>
                      <span style={{ color: "var(--text3)" }}>Available: </span>
                      <span style={{ fontWeight: 700, color: isFull ? "#ef4444" : "#10b981" }}>
                        {available < 0 ? 0 : available}
                        {isFull && " (Full)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Employee initials */}
                {empBadges.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {empBadges.map(e => (
                      <div key={e.id} title={e.name} style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "#06b6d422", color: "#06b6d4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, border: "1px solid #06b6d433",
                      }}>{e.initials}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
