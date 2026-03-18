import { useState } from "react";
import { genId, fmt, mvr } from "../utils/helpers";

export default function DeductionsPage({ employees, deductions, setDeductions, toast }) {
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
