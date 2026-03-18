export function genId() { return Math.random().toString(36).slice(2, 10); }
export function fmt(n) { return Number(n || 0).toFixed(2); }
export function mvr(n) { return `MVR ${fmt(n)}`; }

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
export function getDayName(year, month, day) {
  return new Date(year, month, day).toLocaleDateString("en", { weekday: "short" });
}
export function isFriday(year, month, day) {
  return new Date(year, month, day).getDay() === 5;
}
