export async function fetchJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
