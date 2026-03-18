export default function StepBreadcrumb({ steps, labels, current, onGoTo }) {
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
