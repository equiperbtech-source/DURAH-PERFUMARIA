/**
 * DURAH Perfumes e Importados — servidor
 * Express + catálogo em JSON + upload de imagens (WebP otimizado no navegador).
 * Roda como servidor Node comum (VPS, Render, Railway, Docker) ou como função na Vercel.
 */
const express = require('express');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');
const { createStorage, readSeed } = require('./storage');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'durah2026';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('durah::' + ADMIN_PASSWORD).digest('hex');
const TOKEN_TTL = 1000 * 60 * 60 * 12; // 12h

if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD não definida — usando a senha padrão "durah2026". Defina-a antes de publicar!');
}

const storage = createStorage();
let db; // carregado por requisição (com cache) a partir do armazenamento
const loadDb = async (fresh = false) => { db = await storage.load(fresh); return db; };

// ───────────── Normalização / validação ─────────────
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : v == null ? '' : String(v).trim().slice(0, max));
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };
const list = (v, max = 30, len = 80) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);
const bool = (v) => v === true || v === 'true' || v === 1 || v === 'on';
const slugify = (s) => str(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'perfume';
const isImg = (u) => typeof u === 'string' && (/^\/uploads\/[a-z0-9-]+\.(webp|jpe?g|png)$/i.test(u) || /^https:\/\/[^\s"'<>]+$/i.test(u));

function uniqueSlug(base, id) {
  let slug = base, i = 2;
  while (db.products.some((p) => p.slug === slug && p.id !== id)) slug = `${base}-${i++}`;
  return slug;
}

function normalizeProduct(input, existing = {}) {
  const p = { ...existing, ...input };
  const out = {
    id: existing.id || 'p' + crypto.randomBytes(6).toString('hex'),
    name: str(p.name, 120),
    brand: str(p.brand, 80),
    images: (Array.isArray(p.images) ? p.images : []).filter(isImg).slice(0, 4),
    price: num(p.price) ?? 0,
    promoPrice: num(p.promoPrice) || null,
    volume: str(p.volume, 20),
    concentration: str(p.concentration, 40),
    gender: str(p.gender, 20),
    origin: str(p.origin, 60),
    stock: Math.max(0, parseInt(p.stock, 10) || 0),
    status: p.status === 'esgotado' ? 'esgotado' : 'disponivel',
    description: str(p.description, 5000),
    notes: {
      top: list(p.notes && p.notes.top),
      heart: list(p.notes && p.notes.heart),
      base: list(p.notes && p.notes.base),
    },
    family: str(p.family, 40),
    perfumer: str(p.perfumer, 80),
    year: parseInt(p.year, 10) || null,
    longevity: str(p.longevity, 30),
    projection: str(p.projection, 30),
    seasons: list(p.seasons, 4),
    occasions: list(p.occasions, 10),
    references: (Array.isArray(p.references) ? p.references : [])
      .map((r) => ({ name: str(r && r.name, 80), house: str(r && r.house, 80) }))
      .filter((r) => r.name || r.house).slice(0, 8),
    tags: list(p.tags, 15, 40),
    active: bool(p.active),
    featured: bool(p.featured),
    niche: bool(p.niche),
    launch: bool(p.launch),
    imported: bool(p.imported),
    decant: bool(p.decant),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (out.promoPrice && out.promoPrice >= out.price) out.promoPrice = null;
  out.slug = uniqueSlug(slugify(p.slug && existing.name === p.name ? p.slug : out.name), out.id);
  return out;
}

function normalizeSettings(s, cur) {
  const m = { ...cur, ...s };
  const banner = { ...cur.banner, ...(s.banner || {}) };
  const ann = { ...cur.announcement, ...(s.announcement || {}) };
  return {
    storeName: str(m.storeName, 80) || 'DURAH Perfumes e Importados',
    whatsapp: str(m.whatsapp, 20).replace(/\D/g, '') || '5548991154821',
    instagram: str(m.instagram, 60).replace(/^@/, ''),
    hours: str(m.hours, 120),
    city: str(m.city, 120),
    announcement: { active: bool(ann.active), text: str(ann.text, 200) },
    banner: {
      active: bool(banner.active),
      tag: str(banner.tag, 40),
      title: str(banner.title, 100),
      text: str(banner.text, 300),
      cta: str(banner.cta, 40),
      link: str(banner.link, 300),
      image: isImg(banner.image) ? banner.image : '',
    },
  };
}

// ───────────── Autenticação (token HMAC) ─────────────
const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
function makeToken() { const exp = String(Date.now() + TOKEN_TTL); return `${exp}.${sign(exp)}`; }
function verifyToken(t) {
  if (typeof t !== 'string' || !t.includes('.')) return false;
  const [exp, sig] = t.split('.');
  const good = sign(exp);
  if (sig.length !== good.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)) && Number(exp) > Date.now();
}
function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyToken(t)) return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  next();
}
const attempts = new Map();
function loginLimiter(req, res, next) {
  const ip = req.ip, now = Date.now();
  const a = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (a.length >= 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
  a.push(now); attempts.set(ip, a); next();
}

// ───────────── App ─────────────
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '12mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const api = express.Router();
// Diagnóstico: /api/health?check=1 também testa a leitura do banco
api.get('/health', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const out = {
    ok: true,
    storage: storage.kind,
    supabase_url: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
    admin_password_definida: Boolean(process.env.ADMIN_PASSWORD),
  };
  if (req.query.check) {
    try { const d = await storage.load(true); out.banco = `ok — ${d.products.length} produtos`; }
    catch (e) { out.banco = 'ERRO: ' + e.message; }
  }
  res.json(out);
});

api.get('/catalog', async (req, res) => {
  await loadDb();
  res.setHeader('Cache-Control', 'no-cache');
  res.json({ settings: db.settings, products: db.products.filter((p) => p.active) });
});

api.post('/login', loginLimiter, (req, res) => {
  const pass = str(req.body && req.body.password, 200);
  const a = Buffer.from(crypto.createHash('sha256').update(pass).digest('hex'));
  const b = Buffer.from(crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex'));
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Senha incorreta.' });
  attempts.delete(req.ip);
  res.json({ token: makeToken() });
});

api.get('/admin/catalog', auth, async (req, res) => {
  await loadDb(true);
  res.json({ settings: db.settings, products: db.products, storage: storage.kind });
});

api.post('/products', auth, async (req, res) => {
  await loadDb(true);
  const p = normalizeProduct(req.body || {});
  if (!p.name) return res.status(400).json({ error: 'Informe o nome do perfume.' });
  db.products.unshift(p); await storage.save(db); res.status(201).json(p);
});

api.put('/products/:id', auth, async (req, res) => {
  await loadDb(true);
  const i = db.products.findIndex((p) => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Produto não encontrado.' });
  const p = normalizeProduct(req.body || {}, db.products[i]);
  if (!p.name) return res.status(400).json({ error: 'Informe o nome do perfume.' });
  const oldImages = db.products[i].images;
  db.products[i] = p; await storage.save(db); await cleanupImages(oldImages); res.json(p);
});

api.delete('/products/:id', auth, async (req, res) => {
  await loadDb(true);
  const i = db.products.findIndex((p) => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Produto não encontrado.' });
  const [removed] = db.products.splice(i, 1);
  await storage.save(db); await cleanupImages(removed.images); res.json({ ok: true });
});

api.put('/settings', auth, async (req, res) => {
  await loadDb(true);
  const old = db.settings.banner && db.settings.banner.image;
  db.settings = normalizeSettings(req.body || {}, db.settings);
  await storage.save(db); if (old) await cleanupImages([old]); res.json(db.settings);
});

api.post('/import', auth, async (req, res) => {
  await loadDb(true);
  const b = req.body || {};
  if (!Array.isArray(b.products)) return res.status(400).json({ error: 'Arquivo de backup inválido.' });
  db = { settings: normalizeSettings(b.settings || {}, db.settings), products: [] };
  for (const p of b.products) db.products.push(normalizeProduct(p, { id: p.id, createdAt: p.createdAt }));
  await storage.save(db); res.json({ ok: true, count: db.products.length });
});

api.post('/reset-demo', auth, async (req, res) => {
  await loadDb(true);
  const seed = readSeed();
  db.products = [...seed.products, ...db.products.filter((p) => !seed.products.some((s) => s.id === p.id))];
  await storage.save(db); res.json({ ok: true, count: db.products.length });
});

api.post('/upload', auth, async (req, res) => {
  const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec((req.body && req.body.dataUrl) || '');
  if (!m) return res.status(400).json({ error: 'Imagem inválida.' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Imagem muito grande (máx. 4 MB).' });
  const url = await storage.saveImage(buf, m[1] === 'jpeg' ? 'jpg' : m[1], 'image/' + m[1]);
  res.status(201).json({ url });
});

// Apaga fotos enviadas que não são mais usadas por nenhum produto/banner
async function cleanupImages(candidates = []) {
  for (const u of candidates) {
    const used = db.products.some((p) => p.images.includes(u)) || db.settings.banner.image === u;
    if (!used) await storage.removeImage(u);
  }
}

app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
app.use('/api', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro no servidor. Tente novamente em instantes.' });
});

if (storage.uploadsDir) app.use('/uploads', express.static(storage.uploadsDir, { maxAge: '365d', immutable: true }));

app.get(['/admin', '/admin/'], (req, res) => res.redirect('/#/admin'));

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>`
  );
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); },
}));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'), (err) => err && !res.headersSent && res.type('text').send('Página não encontrada.')));

// Na Vercel o app é exportado como função; fora dela, sobe um servidor normal.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`✨ DURAH rodando em http://localhost:${PORT}  ·  admin: http://localhost:${PORT}/admin  ·  armazenamento: ${storage.kind}`));
}
module.exports = app;
