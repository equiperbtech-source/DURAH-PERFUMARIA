/**
 * Armazenamento do catálogo e das fotos.
 *  - "blob": Vercel Blob (quando BLOB_READ_WRITE_TOKEN existe) — persistente, ideal para a Vercel.
 *  - "disk": pasta local DATA_DIR — para VPS, Render, Railway, Docker ou uso local.
 *  - "temp": disco temporário (/tmp) — usado na Vercel sem Blob configurado; as alterações se perdem.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// require() garante que o arquivo de exemplos seja incluído no pacote da função na Vercel
const SEED = require('./public/data/seed.json');
const readSeed = () => JSON.parse(JSON.stringify(SEED));
const CACHE_MS = 10 * 1000;

function diskStorage(dir, kind) {
  const uploads = path.join(dir, 'uploads');
  const file = path.join(dir, 'db.json');
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
  async function versions() {
    const out = []; let cursor;
    do {
      const r = await list({ prefix: 'db/', cursor, limit: 1000 });
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

function createStorage() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStorage();
  if (process.env.VERCEL) {
    console.warn('⚠️  Vercel sem Blob configurado: usando /tmp (as alterações do painel NÃO são permanentes).');
    return diskStorage('/tmp/durah-data', 'temp');
  }
  return diskStorage(process.env.DATA_DIR || path.join(__dirname, 'data'), 'disk');
}

module.exports = { createStorage, readSeed };
