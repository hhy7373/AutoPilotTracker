export async function fingerprintVin(vin) {
  const normalized = vin.trim().toUpperCase();
  if (!normalized) return { vinHash: '', vinLast6: '' };
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const vinHash = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return { vinHash, vinLast6: normalized.slice(-6) };
}
