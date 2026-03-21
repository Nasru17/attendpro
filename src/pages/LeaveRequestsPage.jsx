import { useState } from "react";

const TYPE_LABEL = { annual: "Annual", sick: "Sick", emergency: "Emergency", other: "Other" };
const TYPE_COLOR = { annual: "#06b6d4", sick: "#8b5cf6", emergency: "#ef4444", other: "#94a3b8" };

export default function LeaveRequestsPage({ leaves, setLeaves, employees, toast }) {
  const pending = leaves.filter(l => l.status === "pending")
    .sort((a, b) => (a.requestedAt || "").localeCompare(b.requestedAt || ""));

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote,  setRejectNote]  = useState("");

  const handleApprove = (id) => {
    setLeaves(p => p.map(l => l.id === id ? { ...l, status: "approved" } : l));
    toast("Leave request approved", "success");
  };

  const handleReject = (id) => {
    setLeaves(p => p.map(l => l.id === id ? { ...l, status: "rejected", reviewNote: rejectNote } : l));
    toast("Leave request rejected", "info");
    setRejectingId(null);
    setRejectNote("");
  };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text)" }}>
        Pending Leave Requests ({pending.length})
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No pending requests</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pending.map(l => (
            <div key={l.id} className="card">
              <div className="card-body" style={{ padding: "18px 22px" }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{l.employeeName}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      Requested by <strong style={{ color: "var(--text2)" }}>{l.requestedBy || "—"}</strong> on {l.requestedAt || "—"}
                    </div>
                  </div>
                  <span style={{ color: TYPE_COLOR[l.leaveType], fontWeight: 700, fontSize: 13, background: `${TYPE_COLOR[l.leaveType]}18`, border: `1px solid ${TYPE_COLOR[l.leaveType]}44`, borderRadius: 8, padding: "4px 12px" }}>
                    {TYPE_LABEL[l.leaveType] || l.leaveType}
                  </span>
                </div>

                {/* Dates + days */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, marginBottom: 12 }}>
                  <div>
                    <span style={{ color: "var(--text3)" }}>From </span>
                    <span className="text-mono" style={{ fontWeight: 600 }}>{l.startDate}</span>
                    <span style={{ color: "var(--text3)" }}> to </span>
                    <span className="text-mono" style={{ fontWeight: 600 }}>{l.endDate}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text3)" }}>Duration: </span>
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>{l.days} day{l.days !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Reason */}
                {l.reason && (
                  <div style={{ fontSize: 13, color: "var(--text2)", background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                    {l.reason}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {rejectingId === l.id ? (
                    <>
                      <input
                        className="form-input"
                        placeholder="Rejection note (optional)..."
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        style={{ flex: 1, minWidth: 200, padding: "6px 10px", fontSize: 13 }}
                      />
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(l.id)}>Confirm Reject</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingId(null); setRejectNote(""); }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-sm"
                        style={{ background: "#10b981", borderColor: "#10b981", color: "#fff" }}
                        onClick={() => handleApprove(l.id)}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { setRejectingId(l.id); setRejectNote(""); }}
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
