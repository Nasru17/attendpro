export default function ComingSoonPage({ icon, title, description, features = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 20, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 32, maxWidth: 420, lineHeight: 1.7 }}>{description}</div>

      {features.length > 0 && (
        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 14,
          padding: "20px 28px", maxWidth: 400, width: "100%", textAlign: "left", marginBottom: 28
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>
            Planned Features
          </div>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13, color: "var(--text2)",
              borderBottom: i < features.length - 1 ? "1px solid var(--border)" : "none"
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, display: "inline-block" }} />
              {f}
            </div>
          ))}
        </div>
      )}

      <div style={{
        fontSize: 12, color: "var(--text3)",
        background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)",
        borderRadius: 8, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 8
      }}>
        🚧 This module is under development
      </div>
    </div>
  );
}
