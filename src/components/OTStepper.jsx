export default function OTStepper({ label, unit, step, color, value, onChange }) {
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
