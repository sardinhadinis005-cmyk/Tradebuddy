// Per-user Tradier keys. The key is encrypted with AES-GCM using a Worker secret; KV never holds it in readable form.
const encoder = new TextEncoder();
export class VaultError extends Error {}

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function cryptoKey(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new VaultError('SETTINGS_SECRET must be at least 32 characters.');
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('tradebuddy-vault-v1'), info: encoder.encode('tradier-token') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function userId(email) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(email).trim().toLowerCase()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const recordKey = (id) => `tradier:${id}`;
const store = (env) => { if (!env.SETTINGS) throw new VaultError('Account storage is not set up.'); return env.SETTINGS; };

export async function saveTradier(env, email, { token, environment }) {
  const id = await userId(email);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify({ token, environment }));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(id) }, await cryptoKey(env.SETTINGS_SECRET), data);
  await store(env).put(recordKey(id), JSON.stringify({ v: 1, environment, iv: toB64(iv), ct: toB64(new Uint8Array(sealed)), savedAt: new Date().toISOString() }));
}

async function readRecord(env, id) {
  const raw = await store(env).get(recordKey(id));
  if (raw == null) return null;
  const record = JSON.parse(raw);
  if (record?.v !== 1 || typeof record.iv !== 'string' || typeof record.ct !== 'string') throw new VaultError('The saved key has an unknown format.');
  return record;
}

// Cheap check that never decrypts the key.
export async function tradierStatus(env, email) {
  const record = await readRecord(env, await userId(email));
  return record ? { configured: true, environment: record.environment === 'production' ? 'production' : 'sandbox' } : { configured: false, environment: null };
}

export async function loadTradier(env, email) {
  const id = await userId(email);
  const record = await readRecord(env, id);
  if (!record) return null;
  try {
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(record.iv), additionalData: encoder.encode(id) }, await cryptoKey(env.SETTINGS_SECRET), fromB64(record.ct));
    const value = JSON.parse(new TextDecoder().decode(clear));
    if (typeof value.token !== 'string') throw new Error('shape');
    return { token: value.token, environment: value.environment === 'production' ? 'production' : 'sandbox' };
  } catch (error) {
    if (error instanceof VaultError) throw error;
    throw new VaultError('The saved key could not be decrypted. Save it again in Settings.');
  }
}

export async function removeTradier(env, email) {
  await store(env).delete(recordKey(await userId(email)));
}
