// Camada de dados: usa a API do servidor quando disponível;
// sem servidor (hospedagem estática / prévia), roda em "modo demonstração" no navegador.
const LS_DB = 'durah_db_v1';
const LS_TOKEN = 'durah_admin_token';
const DEMO_PASSWORD = 'durah2026';

let mode = null; // 'api' | 'local'

const safeLS = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

async function detectMode() {
  if (mode) return mode;
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    const j = r.ok && (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
    mode = j && j.ok ? 'api' : 'local';
  } catch { mode = 'local'; }
  return mode;
}

async function seed() {
  const r = await fetch('data/seed.json');
  return r.json();
}

async function localDb() {
  const raw = safeLS.get(LS_DB);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  const s = await seed();
  safeLS.set(LS_DB, JSON.stringify(s));
  return s;
}
function saveLocal(db) {
  if (!safeLS.set(LS_DB, JSON.stringify(db))) throw new Error('Espaço do navegador esgotado. Use imagens menores ou publique com o servidor.');
}

async function api(path, opts = {}) {
  const token = safeLS.get(LS_TOKEN);
  const r = await fetch('api/' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { safeLS.del(LS_TOKEN); }
  if (!r.ok) { const e = new Error(j.error || 'Erro de comunicação com o servidor.'); e.status = r.status; throw e; }
  return j;
}

const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'perfume';

function localNormalize(p, existing, all) {
  const out = { ...existing, ...p };
  out.id = existing?.id || 'p' + Math.random().toString(36).slice(2, 10);
  out.price = Number(out.price) || 0;
  out.promoPrice = Number(out.promoPrice) || null;
  if (out.promoPrice && out.promoPrice >= out.price) out.promoPrice = null;
  out.stock = Math.max(0, parseInt(out.stock, 10) || 0);
  out.year = parseInt(out.year, 10) || null;
  let base = existing && existing.name === out.name ? existing.slug : slugify(out.name), slug = base, i = 2;
  while (all.some((x) => x.slug === slug && x.id !== out.id)) slug = `${base}-${i++}`;
  out.slug = slug;
  out.createdAt = existing?.createdAt || new Date().toISOString();
  out.updatedAt = new Date().toISOString();
  return out;
}

export const store = {
  get mode() { return mode; },
  detectMode,

  async catalog() {
    await detectMode();
    if (mode === 'api') return api('catalog');
    const db = await localDb();
    return { settings: db.settings, products: db.products.filter((p) => p.active) };
  },

  // ─── admin ───
  isLogged() { return !!safeLS.get(LS_TOKEN); },
  async login(password) {
    await detectMode();
    if (mode === 'api') { const { token } = await api('login', { method: 'POST', body: { password } }); safeLS.set(LS_TOKEN, token); return; }
    if (password !== DEMO_PASSWORD) throw new Error('Senha incorreta.');
    safeLS.set(LS_TOKEN, 'demo');
  },
  logout() { safeLS.del(LS_TOKEN); },

  async adminCatalog() {
    await detectMode();
    if (mode === 'api') return api('admin/catalog');
    return localDb();
  },
  async saveProduct(p) {
    if (mode === 'api') return p.id ? api('products/' + p.id, { method: 'PUT', body: p }) : api('products', { method: 'POST', body: p });
    const db = await localDb();
    const i = p.id ? db.products.findIndex((x) => x.id === p.id) : -1;
    const n = localNormalize(p, i >= 0 ? db.products[i] : null, db.products);
    if (i >= 0) db.products[i] = n; else db.products.unshift(n);
    saveLocal(db); return n;
  },
  async deleteProduct(id) {
    if (mode === 'api') return api('products/' + id, { method: 'DELETE' });
    const db = await localDb();
    db.products = db.products.filter((x) => x.id !== id); saveLocal(db);
  },
  async saveSettings(s) {
    if (mode === 'api') return api('settings', { method: 'PUT', body: s });
    const db = await localDb();
    db.settings = { ...db.settings, ...s }; saveLocal(db); return db.settings;
  },
  async importBackup(data) {
    if (mode === 'api') return api('import', { method: 'POST', body: data });
    if (!Array.isArray(data.products)) throw new Error('Arquivo de backup inválido.');
    saveLocal({ settings: data.settings, products: data.products });
  },
  async resetDemo() {
    if (mode === 'api') return api('reset-demo', { method: 'POST' });
    safeLS.del(LS_DB);
  },
  async uploadImage(dataUrl) {
    if (mode === 'api') return (await api('upload', { method: 'POST', body: { dataUrl } })).url;
    return dataUrl; // modo demonstração: guarda a imagem no próprio navegador
  },
};

// Redimensiona e converte para WebP no navegador (imagens leves e rápidas)
export function optimizeImage(file, max = 1400, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('Envie um arquivo de imagem.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/webp', quality);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', quality);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
}
