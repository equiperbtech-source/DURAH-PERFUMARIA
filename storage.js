/**
 * Armazenamento do catálogo e das fotos.
 *  - "supabase": Supabase (tabela store_data + bucket de fotos) quando SUPABASE_URL e a chave secreta existem.
 *  - "blob": Vercel Blob (quando BLOB_READ_WRITE_TOKEN existe) — persistente, ideal para a Vercel.
 *  - "disk": pasta local DATA_DIR — para VPS, Render, Railway, Docker ou uso local.
 *  - "temp": disco temporário (/tmp) — usado na Vercel sem Blob configurado; as alterações se perdem.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Perfumes de exemplo do servidor (fora de public/ para sempre irem junto com a função na Vercel).
// public/data/seed.json é uma cópia usada só pelo "modo demonstração" sem servidor.
const SEED = require('./seed.json');
const readSeed = () => JSON.parse(JSON.stringify(SEED));
const CACHE_MS = 10 * 1000;

function diskStorage(dir, kind) {
  const uploads = path.join(dir, 'uploads');
  const file = path.join(dir, 'db.json');
  const statsFile = path.join(dir, 'stats.json');
  let cache = null;
  fs.mkdirSync(uploads, { recursive: true });
  return {
    kind,
    uploadsDir: uploads,
    async load() {
      if (cache) return cache;
      if (!fs.existsSync(file)) { cache = readSeed(); await this.save(cache); return cache; }
      cache = JSON.parse(fs.readFileSync(file, 'utf8'));
      return cache;
    },
    async save(db) {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, file);
      cache = db;
    },
    async loadStats() { return fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile, 'utf8')) : null; },
    async saveStats(s) { fs.writeFileSync(statsFile + '.tmp', JSON.stringify(s)); fs.renameSync(statsFile + '.tmp', statsFile); },
    async saveImage(buf, ext) {
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(uploads, name), buf);
      return `/uploads/${name}`;
    },
    async removeImage(url) {
      if (/^\/uploads\//.test(url)) fs.rm(path.join(uploads, path.basename(url)), { force: true }, () => {});
    },
  };
}

function blobStorage() {
  const { put, list, del } = require('@vercel/blob');
  let cache = null, cachedAt = 0;

  // Cada gravação cria uma nova versão "db/<data>.json" (URL única, sem cache velho de CDN).
  async function versions(prefix = 'db/') {
    const out = []; let cursor;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      out.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  return {
    kind: 'blob',
    async load(fresh = false) {
      if (!fresh && cache && Date.now() - cachedAt < CACHE_MS) return cache;
      const [latest] = await versions();
      if (!latest) { cache = readSeed(); await this.save(cache); return cache; }
      const r = await fetch(latest.url, { cache: 'no-store' });
      if (!r.ok) throw new Error('Não foi possível ler o catálogo no Vercel Blob.');
      cache = await r.json(); cachedAt = Date.now();
      return cache;
    },
    async save(db) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await put(`db/${stamp}.json`, JSON.stringify(db), {
        access: 'public', contentType: 'application/json', addRandomSuffix: true, cacheControlMaxAge: 60,
      });
      cache = db; cachedAt = Date.now();
      // mantém só as 5 versões mais recentes (as anteriores servem de histórico curto)
      const old = (await versions()).slice(5).map((b) => b.url);
      if (old.length) await del(old).catch(() => {});
    },
    async loadStats() {
      const [latest] = await versions('stats/');
      if (!latest) return null;
      const r = await fetch(latest.url, { cache: 'no-store' });
      return r.ok ? r.json() : null;
    },
    async saveStats(s) {
      await put(`stats/${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(s), {
        access: 'public', contentType: 'application/json', addRandomSuffix: true, cacheControlMaxAge: 60,
      });
      const old = (await versions('stats/')).slice(3).map((b) => b.url);
      if (old.length) await del(old).catch(() => {});
    },
    async saveImage(buf, ext, contentType) {
      const r = await put(`uploads/${Date.now().toString(36)}.${ext}`, buf, {
        access: 'public', contentType, addRandomSuffix: true,
      });
      return r.url;
    },
    async removeImage(url) {
      if (/\.blob\.vercel-storage\.com\//.test(url)) await del(url).catch(() => {});
    },
  };
}

function supabaseStorage(baseUrl, key) {
  const base = baseUrl.replace(/\/+$/, '');
  const bucket = process.env.SUPABASE_BUCKET || 'produtos';
  const publicPrefix = `${base}/storage/v1/object/public/${bucket}/`;
  // chaves antigas (JWT "eyJ...") vão também no Authorization; as novas (sb_secret_...) só no apikey
  const headers = (extra = {}) => ({ apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), ...extra });
  let cache = null, cachedAt = 0;

  async function call(path, opts = {}) {
    const r = await fetch(base + path, { ...opts, headers: headers(opts.headers) });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`Supabase ${opts.method || 'GET'} ${path.split('?')[0]} falhou (${r.status}): ${body.slice(0, 300)}`);
    }
    return r;
  }

  return {
    kind: 'supabase',
    async load(fresh = false) {
      if (!fresh && cache && Date.now() - cachedAt < CACHE_MS) return cache;
      const rows = await (await call('/rest/v1/store_data?id=eq.main&select=data', { headers: { Accept: 'application/json' } })).json();
      if (!rows.length || !rows[0].data) { cache = readSeed(); await this.save(cache); return cache; }
      cache = rows[0].data; cachedAt = Date.now();
      return cache;
    },
    async save(db) {
      await call('/rest/v1/store_data?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ id: 'main', data: db, updated_at: new Date().toISOString() }]),
      });
      cache = db; cachedAt = Date.now();
    },
    // cliques ficam numa linha separada (id "stats") da mesma tabela: nunca interferem no catálogo
    async loadStats() {
      const rows = await (await call('/rest/v1/store_data?id=eq.stats&select=data', { headers: { Accept: 'application/json' } })).json();
      return rows.length ? rows[0].data : null;
    },
    async saveStats(s) {
      await call('/rest/v1/store_data?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ id: 'stats', data: s, updated_at: new Date().toISOString() }]),
      });
    },
    async saveImage(buf, ext, contentType) {
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      await call(`/storage/v1/object/${bucket}/${name}`, {
        method: 'POST', body: buf,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'max-age=31536000', 'x-upsert': 'false' },
      });
      return publicPrefix + name;
    },
    async removeImage(url) {
      if (!url.startsWith(publicPrefix)) return;
      await call(`/storage/v1/object/${bucket}/${url.slice(publicPrefix.length)}`, { method: 'DELETE' }).catch((e) => console.error(e.message));
    },
  };
}

function createStorage() {
  const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (sbUrl && sbKey) return supabaseStorage(sbUrl, sbKey);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try { return blobStorage(); }
    catch (e) { console.error('Falha ao iniciar o Vercel Blob, usando /tmp:', e); return diskStorage('/tmp/durah-data', 'temp'); }
  }
  if (process.env.VERCEL) {
    console.warn('⚠️  Vercel sem Blob configurado: usando /tmp (as alterações do painel NÃO são permanentes).');
    return diskStorage('/tmp/durah-data', 'temp');
  }
  return diskStorage(process.env.DATA_DIR || path.join(__dirname, 'data'), 'disk');
}

module.exports = { createStorage, readSeed };
