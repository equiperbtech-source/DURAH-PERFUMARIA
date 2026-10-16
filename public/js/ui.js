// Utilitários compartilhados entre a loja e o painel admin
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const icon = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const DEFAULT_WA = '5548991154821';

// ─── Listas do formulário ───
export const CONCENTRATIONS = ['Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Parfum/Extrait'];
export const GENDERS = ['Masculino', 'Feminino', 'Unissex'];
export const FAMILIES = ['Amadeirado', 'Oriental/Âmbar', 'Floral', 'Cítrico', 'Fougère', 'Gourmand', 'Aromático', 'Aquático', 'Couro', 'Oud', 'Especiado'];
export const LONGEVITY = ['Moderada', 'Longa', 'Muito longa', 'Eterna'];
export const LONGEVITY_HINT = ['4 a 6 horas', '6 a 8 horas', '8 a 12 horas', 'mais de 12 horas'];
export const PROJECTION = ['Discreta', 'Moderada', 'Forte', 'Enorme'];
export const PROJECTION_HINT = ['perto da pele', 'até um braço', 'perfuma o ambiente', 'deixa rastro por onde passa'];
export const SEASONS = [['Primavera', 'flower'], ['Verão', 'sun'], ['Outono', 'leaf'], ['Inverno', 'snow']];
export const OCCASIONS = [['Dia a dia', 'coffee'], ['Trabalho', 'briefcase'], ['Noite', 'moon'], ['Encontro', 'heart'], ['Festa', 'music'], ['Eventos formais', 'gem']];
export const VOLUMES = ['2ml', '5ml', '10ml', '30ml', '50ml', '75ml', '90ml', '100ml', '125ml', '200ml'];
export const ORIGINS = ['França', 'Emirados Árabes', 'Itália', 'EUA', 'Reino Unido', 'Espanha', 'Turquia', 'Omã', 'Arábia Saudita', 'Alemanha', 'Brasil'];
export const NICHE_HOUSES = ['Creed', 'Parfums de Marly', 'Maison Francis Kurkdjian', 'Xerjoff', 'Initio', 'Nishane', 'Amouage', 'Tom Ford Private Blend', 'Byredo', 'Le Labo', 'Roja Parfums', 'Frederic Malle', 'Mancera', 'Montale'];
export const TAG_SUGGESTIONS = ['viciante', 'elogiado', 'doce', 'fresco', 'marcante', 'versátil', 'sensual', 'limpo', 'luxuoso', 'rastro forte'];

// ─── Regras de produto ───
export const finalPrice = (p) => (p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price);
export const discount = (p) => (p.promoPrice && p.promoPrice < p.price ? Math.round((1 - p.promoPrice / p.price) * 100) : 0);
export const isArab = (p) => /emirad|árab|arab|dubai|omã|oma\b|catar|kuwait|saudita/i.test(p.origin || '');

// ─── Tipos de produto ───
// Perfume: ficha completa (pirâmide, referências, decants…). Body Spray e Victoria's Secret: ficha simples (só "como é o cheiro").
export const PRODUCT_TYPES = [['perfume', 'Perfume'], ['body-spray', 'Body Spray'], ['victorias-secret', "Victoria's Secret"], ['kit', 'Kit / Combo']];
export const KIT_VARIANTS = [['full', 'Frasco'], ['d5', 'Decant 5ml'], ['d10', 'Decant 10ml']];
export const VS_KINDS = [['body-splash', 'Body Splash'], ['creme', 'Creme']];
export const SCENT_PROFILE = [['Doce', '🍬'], ['Frutado', '🍓'], ['Floral', '🌸'], ['Fresco', '🌿'], ['Cítrico', '🍋'], ['Baunilha', '🍦'], ['Gourmand', '🍫'], ['Amadeirado', '🪵'], ['Almiscarado', '🤍'], ['Aquático', '🌊'], ['Especiado', '🌶️']];
export const INTENSITY = ['Suave', 'Moderado', 'Marcante'];
export const productType = (p) => p.type || 'perfume';
export const isPerfume = (p) => productType(p) === 'perfume';
export const isKit = (p) => productType(p) === 'kit';
export const isSimple = (p) => ['body-spray', 'victorias-secret'].includes(productType(p));
export const typeLabel = (p) => isKit(p) ? 'Kit' : productType(p) === 'victorias-secret' ? (p.vsKind === 'creme' ? 'Creme' : 'Body Splash') : productType(p) === 'body-spray' ? 'Body Spray' : 'Perfume';
const SCENT_ADJ = { Baunilha: 'baunilhado' };
export const scentAdjective = (name) => SCENT_ADJ[name] || name.toLowerCase();
export const scentEmoji = (name) => (SCENT_PROFILE.find(([n]) => n === name) || [, '✦'])[1];

// ─── Variantes: frasco completo, decant 5ml e decant 10ml ───
// O frasco usa preço/estoque/status do produto; os decants existem quando o preço deles está preenchido.
export const fullAvailable = (p) => p.status !== 'esgotado' && Number(p.stock) > 0;
export function variants(p) {
  const kitN = isKit(p) ? (p.kitItems || []).reduce((a, i) => a + (Number(i.qty) || 1), 0) : 0;
  const list = [{ key: 'full', label: isKit(p) ? 'Kit completo' : p.volume ? `Frasco ${p.volume}` : 'Frasco completo', size: isKit(p) ? `Kit com ${kitN} ${kitN === 1 ? 'item' : 'itens'}` : p.volume || 'Frasco completo', price: finalPrice(p), old: discount(p) ? p.price : null, available: fullAvailable(p) }];
  if (isPerfume(p) && Number(p.decant5Price) > 0) list.push({ key: 'd5', label: 'Decant 5ml', size: 'Decant 5ml', price: Number(p.decant5Price), old: null, available: true });
  if (isPerfume(p) && Number(p.decant10Price) > 0) list.push({ key: 'd10', label: 'Decant 10ml', size: 'Decant 10ml', price: Number(p.decant10Price), old: null, available: true });
  return list;
}
export const getVariant = (p, key) => variants(p).find((v) => v.key === key) || variants(p)[0];
export const defaultVariant = (p) => variants(p).find((v) => v.available) || variants(p)[0];
export const hasDecants = (p) => variants(p).length > 1;
export const minDecantPrice = (p) => Math.min(...variants(p).filter((v) => v.key !== 'full').map((v) => v.price));
export const isSoldOut = (p) => !variants(p).some((v) => v.available);
export const isLastUnits = (p) => fullAvailable(p) && Number(p.stock) <= 3;
export const isDecant = (p) => p.decant || hasDecants(p) || (parseInt(p.volume, 10) > 0 && parseInt(p.volume, 10) <= 10);

// ─── Encontra o produto citado num título (aceita pequenos erros: "Assad" ≈ "Asad") ───
const normTxt = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
function nearlyEqual(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}
export function guessProductByTitle(products, title) {
  const words = normTxt(title);
  if (!words.length) return null;
  let best = null, bestScore = 0;
  for (const p of products) {
    const nameWords = normTxt(p.name);
    if (!nameWords.length) continue;
    const hits = nameWords.filter((w) => words.some((t) => nearlyEqual(w, t))).length;
    const score = hits / nameWords.length;
    if (hits && score > bestScore) { best = p; bestScore = score; }
  }
  return bestScore >= 0.5 ? best : null;
}

// ─── Confiança (textos editáveis no painel → Banner & loja) ───
export const DEFAULT_TRUST = {
  backorder: '5 dias úteis',
  authenticity: 'Produtos 100% originais',
  payment: 'Pix, débito e crédito',
  installments: 10,
  shipping: 'Postagem em até 1 dia útil',
};
// prazo de "sob encomenda" (atualizado pela loja ao carregar as configurações)
export const shop = { backorder: DEFAULT_TRUST.backorder, products: [] };

// ─── Kits: resolve os itens com o catálogo atual ───
export function kitItems(p) {
  return (p.kitItems || []).map((it) => {
    const prod = it.productId ? shop.products.find((x) => x.id === it.productId) : null;
    const qty = Math.max(1, Number(it.qty) || 1);
    if (!prod) return { prod: null, qty, label: it.name || 'Item', unit: 0, variantLabel: '' };
    const v = variants(prod).find((x) => x.key === it.variant) || variants(prod)[0];
    const variantLabel = v.key === 'full' ? (prod.volume ? `Frasco ${prod.volume}` : typeLabel(prod)) : v.label;
    return { prod, qty, label: prod.name, variantLabel, unit: v.price };
  });
}
export const kitSeparatePrice = (p) => kitItems(p).reduce((a, i) => a + i.unit * i.qty, 0);
export const kitSavings = (p) => Math.max(0, Math.round((kitSeparatePrice(p) - finalPrice(p)) * 100) / 100);
const kitLines = (p) => kitItems(p).map((i) => `• ${i.qty > 1 ? i.qty + 'x ' : ''}${i.label}${i.variantLabel ? ' — ' + i.variantLabel : ''}`).join('\n');
export const backorderLabel = () => `Sob encomenda (${shop.backorder})`;

export const installmentText = (price, n) => (n > 1 && price > 0 ? `${n}x de R$ ${money(price / n)} sem juros` : '');
export const stars = (n) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

export function badges(p) {
  const b = [];
  if (isSoldOut(p)) b.push(['Sob encomenda', 'warn']);
  else if (!fullAvailable(p)) b.push(['Frasco sob encomenda', 'warn']);
  else if (isLastUnits(p)) b.push(['Últimas unidades', 'warn']);
  if (p.launch) b.push(['Lançamento', 'solid']);
  if (discount(p)) b.push([`-${discount(p)}%`, 'solid']);
  if (p.niche) b.push(['Nicho', '']);
  if (hasDecants(p) && fullAvailable(p)) b.push(['Tem decant', '']);
  if (p.imported) b.push(['Importado', '']);
  return b.map(([t, c]) => `<span class="badge ${c ? 'badge--' + c : ''}">${esc(t)}</span>`).join('');
}

// ─── WhatsApp ───
export const waUrl = (num, msg) => `https://wa.me/${String(num || DEFAULT_WA).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

export const msgProduct = (p, key = 'full') => {
  const v = getVariant(p, key);
  if (!v.available) return msgBackorder(p, v);
  if (isKit(p)) return `Olá, DURAH Perfumes e Importados! 👋✨
Vim pelo catálogo e quero este kit:

🎁 Kit: ${p.name}
📦 Itens:
${kitLines(p)}
💰 Valor do kit: R$ ${money(v.price)}${kitSavings(p) ? ` (economia de R$ ${money(kitSavings(p))})` : ''}

Ainda está disponível? Gostaria de saber as formas de pagamento e prazo de entrega. Obrigado(a)!`;
  return `Olá, DURAH Perfumes e Importados! 👋✨
Vim pelo catálogo e fiquei apaixonado(a) por esta fragrância:

🖤 Perfume: ${p.name}
🏷️ Marca: ${p.brand}
📏 Tamanho: ${v.size}
💰 Valor: R$ ${money(v.price)}

Ainda está disponível? Gostaria de saber as formas de pagamento e prazo de entrega. Obrigado(a)!`;
};

// Produto sem estoque: pedido sob encomenda
export const msgBackorder = (p, v) =>
`Olá, DURAH Perfumes e Importados! 👋✨
Vi no catálogo que esta fragrância está sem estoque e tenho interesse em encomendar:

${isKit(p) ? `🎁 Kit: ${p.name}\n📦 Itens:\n${kitLines(p)}` : `🖤 Perfume: ${p.name}\n🏷️ Marca: ${p.brand}\n📏 Tamanho: ${v.size}`}
💰 Valor: R$ ${money(v.price)}
📦 Sob encomenda (prazo de ${shop.backorder})

Poderia me informar quando chegaria e como funciona o pagamento — é antecipado ou pago na chegada? Obrigado(a)!`;

export const msgGeneral = () => 'Olá, DURAH Perfumes e Importados! 👋 Gostaria de ajuda para escolher o perfume ideal para mim. Pode me atender?';

export const joinPt = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1]);
export const joinOr = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' ou ' + arr[arr.length - 1]);

export const msgHelp = (gender, notes, occasion) =>
  `Olá, DURAH! Estou procurando um perfume ${gender}, com notas ${notes}, para usar em ${occasion}. Pode me indicar algumas opções?`;

export function msgList(items, intro = 'montei minha sacola') {
  let total = 0, hasBackorder = false;
  const lines = items.map(({ p, qty, v }, i) => {
    const vr = getVariant(p, v);
    const sub = vr.price * qty; total += sub;
    if (!vr.available) hasBackorder = true;
    if (isKit(p)) return `${i + 1}) 🎁 ${p.name} · Qtd: ${qty} · 💰 R$ ${money(sub)}\n${kitLines(p).replace(/^/gm, '    ')}${vr.available ? '' : `\n    📦 Sob encomenda (${shop.backorder})`}`;
    return `${i + 1}) 🖤 ${p.name} — ${p.brand}\n    📏 ${vr.size} · Qtd: ${qty} · 💰 R$ ${money(sub)}${vr.available ? '' : `\n    📦 Sob encomenda (${shop.backorder})`}`;
  });
  return `Olá, DURAH Perfumes e Importados! 👋✨
Vim pelo catálogo e ${intro}:

${lines.join('\n\n')}

🧾 Total: R$ ${money(total)}

${hasBackorder ? 'Sobre os itens sob encomenda: quando chegariam e o pagamento é antecipado ou na chegada?\n' : ''}Ainda estão disponíveis? Gostaria de saber as formas de pagamento e prazo de entrega. Obrigado(a)!`;
}

// ─── Toast ───
let toastTimer;
export function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.toggle('is-error', error); t.classList.add('is-show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
}

// ─── Arte do frasco (usada quando o produto ainda não tem foto) ───
const FAMILY_COLORS = {
  'Amadeirado': ['#D9A35B', '#7A4E1E'], 'Oriental/Âmbar': ['#FFB23E', '#9C4A07'], 'Floral': ['#F59AB5', '#8E2F52'],
  'Cítrico': ['#FFE36A', '#B88A00'], 'Fougère': ['#A8D08D', '#3F6B2A'], 'Gourmand': ['#E0A46A', '#6B3410'],
  'Aromático': ['#B6D7A8', '#4E7A43'], 'Aquático': ['#7FD3F7', '#145E86'], 'Couro': ['#B07850', '#3E2010'],
  'Oud': ['#A0522D', '#2E120A'], 'Especiado': ['#F08A4B', '#7A2A0C'],
};
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const artCache = new Map();

export function bottleArt(p) {
  const key = `${p.id}|${p.name}|${p.brand}|${p.family}`;
  if (artCache.has(key)) return artCache.get(key);
  const h = hash(p.id + p.name);
  const [c1, c2] = FAMILY_COLORS[p.family] || ['#E9CC7A', '#7E5E1C'];
  const shape = h % 3, cap = (h >> 3) % 3;
  const name = xml((p.name || '').toUpperCase().slice(0, 22));
  const brand = xml((p.brand || '').toUpperCase().slice(0, 22));
  const vol = xml(p.volume || '');
  const bodies = [
    '<rect x="128" y="182" width="144" height="232" rx="16"/>',
    '<rect x="104" y="214" width="192" height="200" rx="28"/>',
    '<path d="M150 186h100l36 40v148l-36 40H150l-36-40V226z"/>',
  ];
  const caps = [
    '<rect x="166" y="96" width="68" height="70" rx="6" fill="url(#gold)"/><rect x="166" y="96" width="68" height="8" rx="4" fill="#fff" opacity=".35"/>',
    '<path d="M200 84c12 18 40 26 40 52 0 18-18 30-40 30s-40-12-40-30c0-26 28-34 40-52z" fill="url(#gold)"/><path d="M200 70v16" stroke="#D4AF37" stroke-width="3"/><circle cx="200" cy="68" r="4" fill="#F6E3A1"/><ellipse cx="186" cy="124" rx="8" ry="14" fill="#fff" opacity=".25"/>',
    '<path d="M172 166 182 80h36l10 86z" fill="url(#gold)"/><rect x="190" y="84" width="6" height="76" fill="#fff" opacity=".3"/>',
  ];
  const labelY = shape === 1 ? 286 : 272;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
<defs>
<radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#241C12"/><stop offset="1" stop-color="#0B0907"/></radialGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#D4AF37" stop-opacity=".26"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
<linearGradient id="liq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E3A1"/><stop offset=".45" stop-color="#D4AF37"/><stop offset="1" stop-color="#7E5E1C"/></linearGradient>
<linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="cl">${bodies[shape]}</clipPath>
</defs>
<rect width="400" height="500" fill="url(#bg)"/>
<circle cx="200" cy="290" r="190" fill="url(#glow)"/>
<g fill="none" stroke="#D4AF37"><path d="M70 470V210a130 130 0 0 1 260 0v260" stroke-opacity=".28"/><path d="M84 470V214a116 116 0 0 1 232 0v256" stroke-opacity=".14"/></g>
<path d="M200 66l5 5-5 5-5-5z" fill="#D4AF37" fill-opacity=".6"/>
<ellipse cx="200" cy="430" rx="130" ry="14" fill="#000" opacity=".7"/>
<g clip-path="url(#cl)">
<rect x="90" y="170" width="220" height="260" fill="url(#liq)" opacity=".92"/>
<rect x="90" y="170" width="220" height="40" fill="#fff" opacity=".10"/>
<rect x="140" y="170" width="38" height="260" fill="url(#shine)"/>
</g>
<g fill="none" stroke="#D4AF37" stroke-opacity=".6" stroke-width="2">${bodies[shape]}</g>
<rect x="182" y="160" width="36" height="28" fill="url(#gold)"/>
${caps[cap]}
<rect x="124" y="${labelY}" width="152" height="64" rx="4" fill="#0B0907" stroke="#D4AF37" stroke-width="1.5"/>
<text x="200" y="${labelY + 27}" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="${name.length > 16 ? 8.5 : name.length > 13 ? 9.5 : name.length > 10 ? 11 : 13}" fill="#E9CC7A" text-anchor="middle" letter-spacing="1">${name}</text>
<text x="200" y="${labelY + 46}" font-family="Arial,sans-serif" font-size="8" fill="#ddd" text-anchor="middle" letter-spacing="1.5">${vol}</text>
</svg>`;
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  artCache.set(key, uri);
  return uri;
}

export const productImages = (p) => {
  if (p.images && p.images.length) return p.images;
  if (isKit(p)) { const first = kitItems(p).find((i) => i.prod); if (first) return productImages(first.prod); }
  return [bottleArt(p)];
};
