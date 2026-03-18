const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const SB_HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

export async function load(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attendpro_store?key=eq.${key}&select=value`, { headers: SB_HEADERS });
    const rows = await res.json();
    return rows?.[0]?.value ?? null;
  } catch { return null; }
}

// save now requires a valid user token — returns true on success, false if session expired
export async function save(key, val, token) {
  try {
    // Use user token if available so RLS can be enforced in future; fall back to anon
    const authHeader = token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attendpro_store`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": authHeader, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value: val, updated_at: new Date().toISOString() })
    });
    if (res.status === 401 || res.status === 403) return false; // session expired
    return true;
  } catch { return false; }
}

// Role is stored in Supabase user metadata (user_metadata.role)
// Fallback: if no role set, default to "supervisor"
export function getRoleInfo(sbUser) {
  const meta = sbUser?.user_metadata || {};
  const role = meta.role || "supervisor";
  const name = meta.name || sbUser?.email?.split("@")[0] || "User";
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return { role, name, initials };
}

// Supabase Auth helpers
export async function sbSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Invalid email or password.");
  return data; // { access_token, user, ... }
}

export async function sbSignOut(token) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
  });
}

export async function sbGetUser(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}
