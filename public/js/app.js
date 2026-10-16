import { store } from './store.js';
import {
  $, $$, esc, money, icon, toast, badges, bottleArt, productImages, finalPrice, discount, isSoldOut, isLastUnits, isArab, isDecant,
  waUrl, msgProduct, msgGeneral, msgHelp, msgList, joinPt, joinOr,
  variants, getVariant, defaultVariant, hasDecants, minDecantPrice, fullAvailable, DEFAULT_TRUST, installmentText, stars, guessProductByTitle,
  shop, backorderLabel,
  GENDERS, FAMILIES, LONGEVITY, LONGEVITY_HINT, PROJECTION, PROJECTION_HINT, SEASONS, OCCASIONS,
} from './ui.js';

// ═══════════════ Estado ═══════════════
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const persist = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const S = {
  products: [],
  settings: {},
  cart: load('durah_cart', []), // [{id, qty}]
  favs: load('durah_favs', []), // [id]
};
const app = $('#app');
const byId = (id) => S.products.find((p) => p.id === id);
const wa = (msg) => waUrl(S.settings.whatsapp, msg);

export const CATS = [
  { id: 'arabes', label: 'Árabes', icon: 'moon', desc: 'Oud, âmbar e especiarias', test: isArab },
  { id: 'masculinos', label: 'Masculinos', icon: 'user', desc: 'Marcantes e elegantes', test: (p) => p.gender === 'Masculino' },
  { id: 'femininos', label: 'Femininos', icon: 'flower', desc: 'Sofisticados e sensuais', test: (p) => p.gender === 'Feminino' },
  { id: 'unissex', label: 'Unissex', icon: 'sparkles', desc: 'Sem rótulos', test: (p) => p.gender === 'Unissex' },
  { id: 'nicho', label: 'Nicho', icon: 'gem', desc: 'Perfumaria autoral', test: (p) => p.niche },
  { id: 'decants', label: 'Decants/Miniaturas', icon: 'drop', desc: 'Prove antes do frasco', test: isDecant },
  { id: 'lancamentos', label: 'Lançamentos', icon: 'star', desc: 'Acabaram de chegar', test: (p) => p.launch },
];

// ═══════════════ Componentes ═══════════════
// ─── Confiança e avaliações ───
const trust = () => ({ ...DEFAULT_TRUST, ...(S.settings.trust || {}) });
const reviewsList = () => (S.settings.reviews || []).filter((r) => r && r.text);
function ratingSummary(list = reviewsList()) {
  if (!list.length) return null;
  const avg = list.reduce((a, r) => a + (Number(r.rating) || 5), 0) / list.length;
  return { avg, count: list.length };
}
function trustBar(variant = 'bar') {
  const t = trust(), rs = ratingSummary();
  const items = [
    ['shield', t.authenticity, 'Autenticidade garantida'],
    ['card', t.installments > 1 ? `Até ${t.installments}x sem juros` : t.payment, t.installments > 1 ? t.payment : 'Formas de pagamento'],
    ['truck', t.shipping, 'Envio para todo o Brasil'],
    rs ? ['star', `${rs.avg.toFixed(1).replace('.', ',')} de 5 estrelas`, `${rs.count} ${rs.count === 1 ? 'avaliação' : 'avaliações'} de clientes`]
       : ['chat', 'Atendimento personalizado', 'Tire dúvidas pelo WhatsApp'],
  ];
  return `<div class="trust trust--${variant}">${items.map(([i, a, b]) => `<div class="trust__item">${icon(i)}<div><strong>${esc(a)}</strong><span>${esc(b)}</span></div></div>`).join('')}</div>`;
}
function reviewsSection(list, title = 'Quem comprou, recomenda') {
  if (!list.length) return '';
  const rs = ratingSummary(list);
  return `<div class="reviews">
    <div class="reviews__head"><span class="reviews__stars" aria-label="${rs.avg.toFixed(1)} de 5">${stars(rs.avg)}</span><strong>${rs.avg.toFixed(1).replace('.', ',')}</strong><span class="muted">· ${rs.count} ${rs.count === 1 ? 'avaliação' : 'avaliações'}</span></div>
    <h2 class="sr-only">${esc(title)}</h2>
    <div class="reviews__list">${list.map((r) => `<figure class="review">
      <div class="review__stars" aria-label="${Number(r.rating) || 5} de 5">${stars(Number(r.rating) || 5)}</div>
      <blockquote>“${esc(r.text)}”</blockquote>
      <figcaption><strong>${esc(r.name || 'Cliente')}</strong>${r.city ? ` · ${esc(r.city)}` : ''}${r.productName ? `<span>${esc(r.productName)}</span>` : ''}</figcaption>
    </figure>`).join('')}</div>
  </div>`;
}

function card(p) {
  const fav = S.favs.includes(p.id);
  const sold = isSoldOut(p);
  const v = defaultVariant(p);
  const img = productImages(p)[0];
  return `<article class="card ${sold ? 'is-soldout' : ''}">
    <div class="card__media">
      <img src="${esc(img)}" alt="${esc(p.name)} — ${esc(p.brand)}" loading="lazy" decoding="async" width="400" height="500">
      <div class="card__badges">${badges(p)}</div>
    </div>
    <button class="icon-btn card__fav ${fav ? 'is-on' : ''}" data-fav="${p.id}" aria-label="${fav ? 'Remover dos' : 'Adicionar aos'} desejos" aria-pressed="${fav}">${icon('heart')}</button>
    <div class="card__body">
      <span class="card__brand">${esc(p.brand)}</span>
      <h3 class="card__name"><a class="card__link" href="#/produto/${esc(p.slug)}">${esc(p.name)}</a></h3>
      <span class="card__meta">${esc([p.volume, p.concentration, p.family].filter(Boolean).join(' · '))}</span>
      <div class="card__price">
        ${v.key !== 'full' ? `<span class="card__from">${esc(v.label)}</span>` : v.old ? `<span class="price-old">R$ ${money(v.old)}</span>` : ''}
        <span class="price">R$ ${money(v.price)}</span>
      </div>
      ${sold ? `<span class="card__backorder">${icon('clock', 'i--sm')} Chega em ${esc(shop.backorder)}</span>` : ''}
      ${installmentText(v.price, trust().installments) ? `<span class="card__inst">ou ${installmentText(v.price, trust().installments)}</span>` : ''}
      ${hasDecants(p) && v.key === 'full' ? `<span class="card__decant">${icon('drop', 'i--sm')} Decant a partir de R$ ${money(minDecantPrice(p))}</span>` : ''}
    </div>
    <div class="card__actions">
      <a class="btn ${sold ? 'btn--backorder' : 'btn--primary'}" href="${wa(msgProduct(p, v.key))}" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} ${sold ? 'Sob encomenda' : 'Comprar'}</a>
      <button class="icon-btn" data-add="${p.id}" data-variant="${v.key}" aria-label="Adicionar à sacola">${icon('bag')}</button>
    </div>
  </article>`;
}

const grid = (list, cls = '') => list.length
  ? `<div class="grid ${cls}">${list.map(card).join('')}</div>`
  : `<div class="empty">${icon('search')}<p><strong>Nenhum perfume encontrado.</strong></p><p class="mt-1">Tente ajustar os filtros ou fale com a gente — encontramos a fragrância ideal pra você.</p><button class="btn btn--outline mt-2" data-help>Me ajude a escolher</button></div>`;

const sortAvailable = (a, b) => isSoldOut(a) - isSoldOut(b);

function whyBlock() {
  const items = [
    ['globe', 'Produtos importados', 'Curadoria de perfumes importados, árabes e de nicho das casas mais desejadas do mundo.'],
    ['chat', 'Atendimento personalizado', 'Consultoria olfativa pelo WhatsApp para indicar a fragrância que combina com você.'],
    ['truck', 'Envio para todo o Brasil', 'Embalagem segura e código de rastreio do nosso estoque até a sua porta.'],
    ['card', 'Pagamento facilitado', 'Pix, cartão de crédito e condições especiais. Consulte pelo WhatsApp.'],
  ];
  return `<section class="section section--alt">
    <div class="container">
      <div class="section__head"><div><span class="eyebrow">Confiança</span><h2 class="h2 mt-1">Por que comprar na DURAH</h2></div></div>
      <div class="why">${items.map(([i, t, d]) => `<div class="why__item"><div class="why__icon">${icon(i, 'i--lg')}</div><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}</div>
    </div>
  </section>`;
}

function helpCta() {
  return `<div class="help-cta">
    <div><span class="eyebrow">Consultoria olfativa</span><h2 class="mt-1">Não sabe qual <em>escolher?</em></h2><p>Diga o que você gosta — amadeirado, doce, fresco, oud… — e indicamos as fragrâncias perfeitas para o seu estilo e ocasião.</p></div>
    <button class="btn btn--lg" data-help>${icon('sparkles')} Me ajude a escolher</button>
  </div>`;
}

const brandsList = () => {
  const m = new Map();
  S.products.forEach((p) => p.brand && m.set(p.brand, (m.get(p.brand) || 0) + 1));
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
};

// ═══════════════ Páginas ═══════════════
function pageHome() {
  const featured = S.products.filter((p) => p.featured).sort(sortAvailable);
  const launches = S.products.filter((p) => p.launch).sort(sortAvailable);
  const heroP = featured[0] || S.products[0];
  const b = S.settings.banner || {};
  const brands = brandsList();

  setSeo('DURAH Perfumes e Importados — Perfumes importados, árabes e de nicho');
  app.innerHTML = `<div class="page">
  <section class="hero">
    <img class="hero__mark" src="img/brand/monograma.webp" alt="" aria-hidden="true" width="276" height="360">
    <div class="container hero__inner">
      <div>
        <span class="eyebrow">Oud · Âmbar · Almíscar</span>
        <h1 class="hero__title">Fragrâncias importadas e de nicho que <em>marcam presença</em>.</h1>
        <p class="hero__text">Da tradição dos perfumistas árabes às grandes casas de nicho: oud nobre, resinas douradas e acordes que deixam rastro. Escolha sua assinatura, chame no WhatsApp e receba em todo o Brasil.</p>
        <div class="hero__ctas">
          <a href="#/catalogo" class="btn btn--primary btn--lg">Ver catálogo ${icon('arrow')}</a>
          <button class="btn btn--outline btn--lg" data-help>Me ajude a escolher</button>
        </div>
        <div class="hero__stats">
          <div><strong>${S.products.length}+</strong><span>fragrâncias</span></div>
          <div><strong>${brands.length}</strong><span>casas</span></div>
          <div><strong>BR</strong><span>envio nacional</span></div>
        </div>
      </div>
      ${heroP ? `<a class="hero__art" href="#/produto/${esc(heroP.slug)}" aria-label="Ver ${esc(heroP.name)}"><span class="arch"><img src="${esc(productImages(heroP)[0])}" alt="${esc(heroP.name)}" width="400" height="500" fetchpriority="high"></span></a>` : ''}
    </div>
  </section>

  <section class="trust-wrap"><div class="container">${trustBar()}</div></section>

  <nav class="cats-strip" aria-labelledby="catsTitle"><div class="container">
    <p class="cats-strip__title" id="catsTitle"><span>Categorias</span> · encontre seu estilo de fragrância</p>
    <div class="cats-marquee">
      <div class="cats-marquee__track">
        ${[0, 1].map((copy) => `<div class="cats-marquee__group" ${copy ? 'aria-hidden="true"' : ''}>${CATS.map((c) => `<a class="cat-chip" href="#/catalogo?cat=${c.id}" ${copy ? 'tabindex="-1"' : ''}>${icon(c.icon)}${c.label}</a>`).join('')}</div>`).join('')}
      </div>
    </div>
  </div></nav>

  ${promoBlock(b)}


  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="section__head"><div><span class="eyebrow">Curadoria DURAH</span><h2 class="h2 mt-1">Destaques</h2><p>Os mais elogiados da casa.</p></div><a class="link-more" href="#/catalogo">Ver todos ${icon('arrow', 'i--sm')}</a></div>
      ${grid((featured.length ? featured : S.products).slice(0, 8), 'grid--4')}
    </div>
  </section>

  ${reviewsList().length ? `<section class="section" style="padding-top:0"><div class="container">
    <div class="section__head"><div><span class="eyebrow">Avaliações</span><h2 class="h2 mt-1">Quem comprou, recomenda</h2></div></div>
    ${reviewsSection(reviewsList().slice(0, 8))}
  </div></section>` : ''}

  <section class="section" style="padding-top:0"><div class="container">${helpCta()}</div></section>

  ${launches.length ? `<section class="section" style="padding-top:0">
    <div class="container">
      <div class="section__head"><div><span class="eyebrow">Novidades</span><h2 class="h2 mt-1">Lançamentos</h2></div><a class="link-more" href="#/catalogo?cat=lancamentos">Ver todos ${icon('arrow', 'i--sm')}</a></div>
      ${grid(launches.slice(0, 4), 'grid--4')}
    </div>
  </section>` : ''}

  ${whyBlock()}

  ${brands.length ? `<section class="section">
    <div class="container">
      <div class="section__head"><div><span class="eyebrow">Casas de perfumaria</span><h2 class="h2 mt-1">Marcas</h2></div><a class="link-more" href="#/marcas">Todas ${icon('arrow', 'i--sm')}</a></div>
      <div class="marquee">${brands.map(([b]) => `<a href="#/catalogo?marca=${encodeURIComponent(b)}">${esc(b)}</a>`).join('')}</div>
    </div>
  </section>` : ''}
  </div>`;
}

// ─── Promoção da semana (produto, preço de/por e compra direta) ───
function promoBlock(b) {
  if (!b.active) return '';
  // produto escolhido no painel; se não houver, tenta achar pelo título do banner
  const p = (b.productId && byId(b.productId)) || guessProductByTitle(S.products, b.title);
  if (!p && !b.title) return '';
  const img = b.image || (p ? productImages(p)[0] : '');
  const v = p ? (fullAvailable(p) ? getVariant(p, 'full') : defaultVariant(p)) : null;
  const href = p ? `#/produto/${p.slug}` : safeLink(b.link);
  const t = trust();
  return `<section class="section section--promo"><div class="container">
    <div class="promo ${p ? 'promo--product' : ''}">
      ${img ? `<a class="promo__media" href="${esc(href)}" aria-label="${esc(p ? p.name : b.title)}"><img src="${esc(img)}" alt="${esc(p ? p.name : '')}" loading="lazy"></a>` : ''}
      <div class="promo__body">
        ${b.tag ? `<span class="promo__tag">${esc(b.tag)}</span>` : ''}
        ${p ? `<span class="promo__brand">${esc(p.brand)}</span>` : ''}
        <h2>${esc(b.title || (p && p.name) || '')}</h2>
        ${b.text ? `<p>${esc(b.text)}</p>` : ''}
        ${v ? `<div class="promo__prices">
            ${v.old ? `<span class="promo__old">De <s>R$ ${money(v.old)}</s></span>` : ''}
            <span class="promo__now"><small>${v.old ? 'Por' : v.key === 'full' ? '' : esc(v.label)}</small> R$ ${money(v.price)}</span>
            ${v.old ? `<span class="price-off">-${Math.round((1 - v.price / v.old) * 100)}% OFF</span>` : ''}
          </div>
          ${installmentText(v.price, t.installments) ? `<p class="promo__inst">ou ${installmentText(v.price, t.installments)} · ${esc(t.payment)}</p>` : ''}` : ''}
        <div class="promo__ctas">
          ${p ? `<a class="btn btn--primary btn--lg" href="${wa(msgProduct(p, v.key))}" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} ${esc(b.cta || 'Comprar agora')}</a>
                 <a class="btn btn--outline" href="${esc(href)}">Ver detalhes</a>`
              : b.cta ? `<a class="btn btn--primary btn--lg" href="${esc(href)}" ${/^https?:/.test(b.link) ? 'target="_blank" rel="noopener"' : ''}>${esc(b.cta)} ${icon('arrow')}</a>` : ''}
        </div>
        <div class="promo__trust"><span>${icon('shield', 'i--sm')} ${esc(t.authenticity)}</span><span>${icon('truck', 'i--sm')} ${esc(t.shipping)}</span></div>
      </div>
    </div>
  </div></section>`;
}

// ─── Catálogo ───
const F = { q: '', cat: '', brands: new Set(), genders: new Set(), families: new Set(), occasions: new Set(), min: '', max: '', sort: 'relevance', fav: false };

function readFilters(q) {
  F.q = q.get('q') || ''; F.cat = q.get('cat') || ''; F.fav = q.get('fav') === '1';
  F.brands = new Set(q.getAll('marca')); F.genders = new Set(q.getAll('genero'));
  F.families = new Set(q.getAll('familia')); F.occasions = new Set(q.getAll('ocasiao'));
  F.min = q.get('min') || ''; F.max = q.get('max') || ''; F.sort = q.get('ordem') || 'relevance';
}
function writeFilters() {
  const q = new URLSearchParams();
  if (F.q) q.set('q', F.q); if (F.cat) q.set('cat', F.cat); if (F.fav) q.set('fav', '1');
  F.brands.forEach((v) => q.append('marca', v)); F.genders.forEach((v) => q.append('genero', v));
  F.families.forEach((v) => q.append('familia', v)); F.occasions.forEach((v) => q.append('ocasiao', v));
  if (F.min) q.set('min', F.min); if (F.max) q.set('max', F.max); if (F.sort !== 'relevance') q.set('ordem', F.sort);
  const s = q.toString();
  history.replaceState(null, '', '#/catalogo' + (s ? '?' + s : ''));
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function filtered() {
  const terms = norm(F.q).split(/\s+/).filter(Boolean);
  const cat = CATS.find((c) => c.id === F.cat);
  const min = parseFloat(F.min), max = parseFloat(F.max);
  let list = S.products.filter((p) => {
    if (cat && !cat.test(p)) return false;
    if (F.fav && !S.favs.includes(p.id)) return false;
    if (F.brands.size && !F.brands.has(p.brand)) return false;
    if (F.genders.size && !F.genders.has(p.gender)) return false;
    if (F.families.size && !F.families.has(p.family)) return false;
    if (F.occasions.size && !(p.occasions || []).some((o) => F.occasions.has(o))) return false;
    const price = finalPrice(p);
    if (!isNaN(min) && price < min) return false;
    if (!isNaN(max) && price > max) return false;
    if (terms.length) {
      const hay = norm([p.name, p.brand, p.family, p.gender, p.origin, p.concentration, p.description, ...(p.tags || []),
        ...(p.notes?.top || []), ...(p.notes?.heart || []), ...(p.notes?.base || []),
        ...(p.references || []).map((r) => r.name + ' ' + r.house)].join(' '));
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  const sorters = {
    relevance: (a, b) => sortAvailable(a, b) || (b.featured - a.featured) || (b.launch - a.launch),
    'menor-preco': (a, b) => finalPrice(a) - finalPrice(b),
    'maior-preco': (a, b) => finalPrice(b) - finalPrice(a),
    nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
    novidades: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
  };
  return list.sort(sorters[F.sort] || sorters.relevance);
}

function pageCatalog(q) {
  readFilters(q);
  const cat = CATS.find((c) => c.id === F.cat);
  const title = F.fav ? 'Lista de desejos' : cat ? cat.label : F.brands.size === 1 ? [...F.brands][0] : 'Catálogo';
  setSeo(`${title} — DURAH Perfumes e Importados`);

  const brands = brandsList().map(([b]) => b);
  const occs = OCCASIONS.map(([o]) => o);
  const families = FAMILIES.filter((f) => S.products.some((p) => p.family === f));
  const checks = (name, values, set) => `<div class="chips">${values.map((v) => `<label class="chip-check"><input type="checkbox" name="${name}" value="${esc(v)}" ${set.has(v) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>`;

  app.innerHTML = `<div class="page">
  <section class="page-head"><div class="container">
    <nav class="crumbs" aria-label="Você está em"><a href="#/">Início</a><span>/</span><span>Catálogo</span></nav>
    <h1 class="h2">${esc(title)}</h1>
    <p>${cat ? esc(cat.desc) + ' — ' : ''}Perfumes importados, árabes e de nicho com pirâmide olfativa completa.</p>
    <div class="catbar">
      <button class="pill ${!F.cat ? 'is-active' : ''}" data-cat="">Todos</button>
      ${CATS.map((c) => `<button class="pill ${F.cat === c.id ? 'is-active' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}
    </div>
  </div></section>

  <div class="container catalog">
    <aside class="filters" id="filters" aria-label="Filtros">
      <div class="filters__head"><strong class="h3">Filtros</strong><button class="icon-btn" data-close-filters aria-label="Fechar filtros">${icon('x')}</button></div>
      <form class="filters__body" id="filterForm">
        <div class="fgroup"><h4>Buscar</h4><input class="input" type="search" name="q" value="${esc(F.q)}" placeholder="Nome, marca ou nota (ex.: baunilha)"></div>
        <div class="fgroup"><h4>Gênero</h4>${checks('genero', GENDERS, F.genders)}</div>
        ${brands.length ? `<div class="fgroup"><h4>Marca</h4>${checks('marca', brands, F.brands)}</div>` : ''}
        ${families.length ? `<div class="fgroup"><h4>Família olfativa</h4>${checks('familia', families, F.families)}</div>` : ''}
        <div class="fgroup"><h4>Faixa de preço (R$)</h4>
          <div class="price-range"><input class="input" type="number" inputmode="numeric" min="0" name="min" placeholder="Mín." value="${esc(F.min)}"><span class="muted">–</span><input class="input" type="number" inputmode="numeric" min="0" name="max" placeholder="Máx." value="${esc(F.max)}"></div>
          <div class="chips mt-1">
            <button type="button" class="pill" data-range="0-200">Até 200</button>
            <button type="button" class="pill" data-range="200-500">200 a 500</button>
            <button type="button" class="pill" data-range="500-1000">500 a 1.000</button>
            <button type="button" class="pill" data-range="1000-">+ 1.000</button>
          </div>
        </div>
        <div class="fgroup"><h4>Ocasião</h4>${checks('ocasiao', occs, F.occasions)}</div>
        <div class="fgroup"><label class="chip-check"><input type="checkbox" name="fav" ${F.fav ? 'checked' : ''}><span>${icon('heart', 'i--sm')} Só meus desejos</span></label></div>
      </form>
      <div class="filters__foot">
        <button class="btn btn--ghost" id="clearFilters" style="flex:1">Limpar</button>
        <button class="btn btn--primary" data-close-filters style="flex:1.4">Ver resultados</button>
      </div>
    </aside>

    <div>
      ${trustBar('compact')}
      <div class="toolbar">
        <span class="toolbar__count" id="count"></span>
        <button class="btn btn--ghost btn--sm" id="openFilters">${icon('filter', 'i--sm')} Filtros</button>
        <select class="input" id="sort" aria-label="Ordenar" style="width:auto">
          <option value="relevance">Relevância</option>
          <option value="novidades">Novidades</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
          <option value="nome">Nome (A–Z)</option>
        </select>
      </div>
      <div id="results"></div>
    </div>
  </div>
  </div>`;

  $('#sort').value = F.sort;
  const form = $('#filterForm');
  const update = () => {
    const fd = new FormData(form);
    F.q = fd.get('q') || ''; F.min = fd.get('min') || ''; F.max = fd.get('max') || ''; F.fav = !!fd.get('fav');
    F.brands = new Set(fd.getAll('marca')); F.genders = new Set(fd.getAll('genero'));
    F.families = new Set(fd.getAll('familia')); F.occasions = new Set(fd.getAll('ocasiao'));
    renderResults(); writeFilters();
  };
  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => { e.preventDefault(); update(); closeFilters(); });
  $$('[data-range]', form).forEach((b) => b.addEventListener('click', () => {
    const [a, z] = b.dataset.range.split('-'); form.min.value = a === '0' ? '' : a; form.max.value = z; update();
  }));
  $('#sort').addEventListener('change', (e) => { F.sort = e.target.value; renderResults(); writeFilters(); });
  $$('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    F.cat = b.dataset.cat; writeFilters(); pageCatalog(new URLSearchParams(location.hash.split('?')[1] || ''));
  }));
  $('#clearFilters').addEventListener('click', () => { location.hash = '#/catalogo' + (F.cat ? '?cat=' + F.cat : ''); });
  $('#openFilters').addEventListener('click', openFilters);
  $$('[data-close-filters]').forEach((b) => b.addEventListener('click', closeFilters));
  renderResults();
}
function renderResults() {
  const list = filtered();
  $('#count').textContent = `${list.length} ${list.length === 1 ? 'fragrância' : 'fragrâncias'}`;
  $('#results').innerHTML = grid(list);
}
function openFilters() { $('#filters').classList.add('is-open'); showOverlay(closeFilters); }
function closeFilters() { $('#filters')?.classList.remove('is-open'); hideOverlay(); }

// ─── Produto ───
function pageProduct(slug) {
  const p = S.products.find((x) => x.slug === slug || x.id === slug);
  if (!p) return pageNotFound('Perfume não encontrado', 'Este perfume pode ter sido removido do catálogo.');
  const imgs = productImages(p);
  const sold = isSoldOut(p);
  const fav = S.favs.includes(p.id);
  const sel = defaultVariant(p);
  const prodReviews = reviewsList().filter((r) => !r.productId || r.productId === p.id);
  const lvl = (arr, v) => arr.indexOf(v);
  const lon = lvl(LONGEVITY, p.longevity), pro = lvl(PROJECTION, p.projection);
  const refs = (p.references || []).filter((r) => r.name || r.house);
  const n = p.notes || {};
  const fmtRef = (r) => r.name ? `<b>${esc(r.name)}</b>${r.house ? ` (${esc(r.house)})` : ''}` : `<b>${esc(r.house)}</b>`;
  const mono = (s) => String(s || '?').split(/\s+/).filter((w) => /^[A-Za-zÀ-ú]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  setSeo(`${p.name} — ${p.brand} | DURAH Perfumes e Importados`, `${p.name} (${p.brand}) ${p.concentration} ${p.volume}. ${String(p.description || '').slice(0, 140)}…`, productLd(p, imgs));
  document.body.classList.add('is-product');

  const tier = (ic, label, sub, notes) => notes && notes.length ? `<div class="tier">
      <div class="tier__icon">${icon(ic)}</div>
      <div><div class="tier__label">${label}<span class="tier__sub">${sub}</span></div>
      <div class="chips">${notes.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
    </div>` : '';
  const meter = (ic, label, val, arr, hints, idx) => idx < 0 ? '' : `<div class="meter">
      <div class="meter__top"><span>${icon(ic, 'i--sm')} ${label}</span><strong>${esc(val)}</strong></div>
      <div class="meter__bar" role="meter" aria-valuemin="1" aria-valuemax="4" aria-valuenow="${idx + 1}" aria-label="${label}: ${esc(val)}">${arr.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>
      <div class="meter__legend">${arr.map((a) => `<span>${a}</span>`).join('')}</div>
      <p class="hint">${esc(hints[idx])}</p>
    </div>`;

  const related = S.products.filter((x) => x.id !== p.id).map((x) => {
    let s = 0;
    if (x.family === p.family) s += 3;
    if (x.gender === p.gender || x.gender === 'Unissex') s += 2;
    if (x.brand === p.brand) s += 2;
    const all = new Set([...(n.top || []), ...(n.heart || []), ...(n.base || [])]);
    [...(x.notes?.top || []), ...(x.notes?.heart || []), ...(x.notes?.base || [])].forEach((k) => all.has(k) && (s += 1));
    return [x, s - (isSoldOut(x) ? 5 : 0)];
  }).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([x]) => x);

  app.innerHTML = `<div class="page">
  <div class="container">
    <nav class="crumbs" style="padding-top:18px" aria-label="Você está em"><a href="#/">Início</a><span>/</span><a href="#/catalogo">Catálogo</a><span>/</span><span>${esc(p.name)}</span></nav>
    <div class="product">
      <div class="gallery">
        <div class="gallery__main">
          <img id="mainImg" src="${esc(imgs[0])}" alt="${esc(p.name)} — ${esc(p.brand)}" width="800" height="1000" fetchpriority="high">
          <div class="card__badges">${badges(p)}</div>
          ${imgs.length > 1 ? `<button class="icon-btn gallery__nav gallery__nav--prev" data-step="-1" aria-label="Foto anterior">${icon('chevl')}</button><button class="icon-btn gallery__nav gallery__nav--next" data-step="1" aria-label="Próxima foto">${icon('chevr')}</button>` : ''}
        </div>
        ${imgs.length > 1 ? `<div class="gallery__thumbs">${imgs.map((src, i) => `<button class="${i ? '' : 'is-active'}" data-img="${i}" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      </div>

      <div class="pinfo">
        <a class="pinfo__brand" href="#/catalogo?marca=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a>
        <h1 class="pinfo__name">${esc(p.name)}</h1>
        <div class="pinfo__spec">
          ${p.volume ? `<span class="chip chip--solid">${esc(p.volume)}</span>` : ''}
          ${p.concentration ? `<span class="chip">${esc(p.concentration)}</span>` : ''}
          ${p.gender ? `<span class="chip chip--muted">${esc(p.gender)}</span>` : ''}
          ${p.origin ? `<span class="chip chip--muted">${icon('pin', 'i--sm')} ${esc(p.origin)}</span>` : ''}
        </div>

        <div class="pinfo__price" id="pPrice"></div>
        <p class="pinfo__inst" id="pInst"></p>

        ${hasDecants(p) ? `<fieldset class="variants">
          <legend class="label">Escolha o tamanho</legend>
          <div class="variants__list">${variants(p).map((v) => `<label class="variant ${v.available ? '' : 'is-backorder'}">
            <input type="radio" name="variant" value="${v.key}" ${v.key === sel.key ? 'checked' : ''}>
            <span><strong>${esc(v.label)}</strong><em>R$ ${money(v.price)}</em><small>${!v.available ? 'Sob encomenda' : v.key === 'full' ? 'Lacrado, original' : 'Fracionado do original'}</small></span>
          </label>`).join('')}</div>
        </fieldset>` : ''}

        <div class="pinfo__stock" id="pStock"></div>

        <div class="pinfo__buy">
          <a class="btn btn--primary btn--lg btn--block btn--wa" id="buyWa" href="#" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} <span>Comprar pelo WhatsApp</span></a>
          <div class="pinfo__buy-row">
            <button class="btn btn--outline" id="buyAdd" data-add="${p.id}" data-variant="${sel.key}">${icon('bag')} Adicionar à sacola</button>
            <button class="icon-btn card__fav ${fav ? 'is-on' : ''}" style="position:static;width:46px;height:46px;border:1px solid var(--gold-line)" data-fav="${p.id}" aria-label="Lista de desejos" aria-pressed="${fav}">${icon('heart')}</button>
          </div>
        </div>
        <div class="seal"><img src="img/brand/monograma.webp" alt="" width="276" height="360" loading="lazy"><p><strong>Vendido e garantido por DURAH</strong><span>Curadoria, procedência e atendimento da nossa equipe do pedido ao drydown.</span></p></div>
        ${refs.length ? `<section class="block block--refs"><h2>${icon('star')} Para quem gosta de…</h2>
          <p class="refs-lead">Para quem gosta de ${joinOr(refs.map(fmtRef))}.</p>
          <div class="refs">${refs.map((r) => `<div class="ref"><span class="ref__mono">${esc(mono(r.house || r.name))}</span><div><strong>${esc(r.name || r.house)}</strong>${r.name && r.house ? `<small>${esc(r.house)}</small>` : ''}</div></div>`).join('')}</div>
          <p class="hint mt-1">Referências de perfil olfativo semelhante, para orientar sua escolha.</p>
        </section>` : ''}

        ${trustBar('list')}

        ${p.family ? `<div class="mt-2"><div class="family-seal"><span class="family-seal__icon">${icon('drop')}</span><span><small>Família olfativa</small><strong>${esc(p.family)}</strong></span></div></div>` : ''}
        ${(p.tags || []).length ? `<div class="chips mt-2">${p.tags.map((t) => `<span class="chip chip--muted">#${esc(t)}</span>`).join('')}</div>` : ''}

        ${p.description ? `<section class="block"><h2>${icon('sparkles')} Sobre a fragrância</h2><p class="desc">${esc(p.description)}</p></section>` : ''}

        ${(n.top?.length || n.heart?.length || n.base?.length) ? `<section class="block">
          <h2>${icon('layers')} Pirâmide olfativa</h2>
          <div class="pyramid-wrap">
            <div class="pyramid-visual" aria-hidden="true">
              <svg viewBox="0 0 150 140"><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1D68B"/><stop offset="1" stop-color="#D4AF37" stop-opacity=".35"/></linearGradient></defs>
                <path d="M75 6 L144 134 H6 Z" fill="rgba(255,196,0,.06)" stroke="#D4AF37" stroke-width="1.5"/>
                <path d="M75 6 L98 48 H52 Z" fill="url(#pg)"/>
                <path d="M52 48 H98 L121 91 H29 Z" fill="#D4AF37" fill-opacity=".45"/>
                <path d="M29 91 H121 L144 134 H6 Z" fill="#D4AF37" fill-opacity=".22"/>
                <text x="75" y="42" text-anchor="middle" font-size="9" font-weight="700" fill="#0B0907" font-family="Cinzel,Georgia,serif">TOPO</text>
                <text x="75" y="76" text-anchor="middle" font-size="9" font-weight="700" fill="#0B0907" font-family="Cinzel,Georgia,serif">CORAÇÃO</text>
                <text x="75" y="119" text-anchor="middle" font-size="9" font-weight="800" fill="#D4AF37" font-family="Cinzel,Georgia,serif">FUNDO</text>
              </svg>
            </div>
            <div class="pyramid">
              ${tier('wind', 'Topo', 'saída · primeiros minutos', n.top)}
              ${tier('flower', 'Coração', 'corpo · 1 a 4 horas', n.heart)}
              ${tier('layers', 'Fundo', 'base · drydown', n.base)}
            </div>
          </div>
        </section>` : ''}

        ${(lon >= 0 || pro >= 0) ? `<section class="block"><h2>${icon('clock')} Performance</h2>
          ${meter('clock', 'Fixação', p.longevity, LONGEVITY, LONGEVITY_HINT, lon)}
          ${meter('wind', 'Projeção / sillage', p.projection, PROJECTION, PROJECTION_HINT, pro)}
        </section>` : ''}

        <section class="block"><h2>${icon('calendar')} Quando usar</h2>
          <p class="label">Estações ideais</p>
          <div class="iconlist iconlist--4">${SEASONS.map(([s, i]) => `<div class="iconitem ${(p.seasons || []).includes(s) ? 'on' : ''}">${icon(i)} ${s}</div>`).join('')}</div>
          <p class="label mt-2">Ocasiões</p>
          <div class="iconlist iconlist--3">${OCCASIONS.map(([s, i]) => `<div class="iconitem ${(p.occasions || []).includes(s) ? 'on' : ''}">${icon(i)} ${s}</div>`).join('')}</div>
        </section>

        <section class="block"><h2>${icon('tag')} Ficha técnica</h2>
          <dl class="specs">
            ${[['drop', 'Concentração', p.concentration], ['box', 'Volume', p.volume], ['user', 'Perfumista', p.perfumer], ['calendar', 'Lançamento', p.year], ['pin', 'Origem', p.origin], ['layers', 'Família', p.family]]
              .filter(([, , v]) => v).map(([i, k, v]) => `<div><dt>${icon(i)} ${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
          </dl>
        </section>
      </div>
    </div>

    ${prodReviews.length ? `<section class="section" style="padding-top:20px">
      <div class="section__head"><div><span class="eyebrow">Avaliações</span><h2 class="h2 mt-1">Quem comprou, recomenda</h2></div></div>
      ${reviewsSection(prodReviews.slice(0, 6))}
    </section>` : ''}

    ${related.length ? `<section class="section" style="padding-top:20px">
      <div class="section__head"><div><span class="eyebrow">Você também pode gostar</span><h2 class="h2 mt-1">Produtos relacionados</h2></div></div>
      ${grid(related, 'grid--4')}
    </section>` : ''}
  </div>
  <div class="buybar">
    <div><span class="price" id="bbPrice"></span></div>
    <a class="btn btn--primary" id="buyWa2" href="#" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} <span>Comprar</span></a>
  </div>
  </div>`;

  // atualiza preço, parcelas, estoque e links de compra conforme o tamanho escolhido
  const t = trust();
  const applyVariant = (key) => {
    const v = getVariant(p, key);
    $('#pPrice').innerHTML = `${v.old ? `<span class="price-old">R$ ${money(v.old)}</span><span class="price-off">-${Math.round((1 - v.price / v.old) * 100)}%</span>` : ''}
      <span class="price" style="width:100%">R$ ${money(v.price)}</span>`;
    $('#pInst').textContent = [installmentText(v.price, t.installments) && 'ou ' + installmentText(v.price, t.installments), t.payment].filter(Boolean).join(' · ');
    $('#pStock').innerHTML = !v.available ? `<span class="dot dot--warn"></span> Sem estoque · disponível sob encomenda em ${esc(shop.backorder)}`
      : v.key === 'full' && isLastUnits(p) ? '<span class="dot dot--warn"></span> Últimas unidades em estoque'
      : `<span class="dot"></span> Disponível · ${esc(t.shipping)}`;
    const label = v.available ? (v.key === 'full' ? 'Comprar pelo WhatsApp' : `Comprar ${v.label}`) : backorderLabel();
    $('#buyWa').href = $('#buyWa2').href = wa(msgProduct(p, v.key));
    $('#buyWa span').textContent = label;
    $('#buyWa2 span').textContent = v.available ? 'Comprar' : 'Sob encomenda';
    $('#buyWa').classList.toggle('btn--backorder', !v.available); $('#buyWa').classList.toggle('btn--primary', v.available);
    $('#buyWa2').classList.toggle('btn--backorder', !v.available); $('#buyWa2').classList.toggle('btn--primary', v.available);
    $('#bbPrice').textContent = `R$ ${money(v.price)}`;
    const add = $('#buyAdd'); add.dataset.variant = v.key; add.disabled = false;
    add.lastChild.textContent = v.available ? ' Adicionar à sacola' : ' Encomendar na sacola';
  };
  applyVariant(sel.key);
  $$('input[name="variant"]').forEach((r) => r.addEventListener('change', () => applyVariant(r.value)));

  let cur = 0;
  const show = (i) => {
    cur = (i + imgs.length) % imgs.length; $('#mainImg').src = imgs[cur];
    $$('[data-img]').forEach((b, k) => b.classList.toggle('is-active', k === cur));
  };
  $$('[data-img]').forEach((b) => b.addEventListener('click', () => show(+b.dataset.img)));
  $$('[data-step]').forEach((b) => b.addEventListener('click', () => show(cur + +b.dataset.step)));
  // swipe na galeria
  let x0 = null;
  const gm = $('.gallery__main');
  gm.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  gm.addEventListener('touchend', (e) => { if (x0 == null || imgs.length < 2) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
}

function productLd(p, imgs) {
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, brand: { '@type': 'Brand', name: p.brand },
    description: p.description, image: imgs.filter((i) => !i.startsWith('data:')).map((i) => new URL(i, location.href).href),
    category: 'Perfume', offers: {
      '@type': 'Offer', priceCurrency: 'BRL', price: finalPrice(p).toFixed(2),
      availability: isSoldOut(p) ? 'https://schema.org/BackOrder' : 'https://schema.org/InStock',
      url: location.href,
    },
  };
}

// ─── Marcas ───
function pageBrands() {
  setSeo('Marcas — DURAH Perfumes e Importados');
  const list = brandsList();
  app.innerHTML = `<div class="page">
    <section class="page-head"><div class="container">
      <nav class="crumbs"><a href="#/">Início</a><span>/</span><span>Marcas</span></nav>
      <h1 class="h2">Marcas e casas de perfumaria</h1>
      <p>Explore o catálogo pela casa que você ama.</p>
    </div></section>
    <section class="section" style="padding-top:28px"><div class="container">
      ${list.length ? `<div class="brands">${list.map(([b, c]) => `<a class="brand-card" href="#/catalogo?marca=${encodeURIComponent(b)}"><strong>${esc(b)}</strong><span>${c} ${c === 1 ? 'fragrância' : 'fragrâncias'}</span></a>`).join('')}</div>` : '<div class="empty">Nenhuma marca cadastrada ainda.</div>'}
      <div class="mt-3">${helpCta()}</div>
    </div></section>
  </div>`;
}

// ─── Contato ───
function pageContact() {
  setSeo('Contato — DURAH Perfumes e Importados');
  const st = S.settings;
  const faq = [
    ['Os perfumes são originais?', 'Trabalhamos com perfumes importados selecionados. Tire qualquer dúvida sobre procedência, lote e embalagem diretamente com nossa equipe pelo WhatsApp.'],
    ['Quais as formas de pagamento?', 'Pix, cartão de crédito e condições de parcelamento. As condições atualizadas são informadas no atendimento.'],
    ['Vocês enviam para todo o Brasil?', 'Sim! Enviamos para todo o país com embalagem segura e código de rastreio. O prazo e o frete são calculados pelo seu CEP.'],
    ['O que é um decant?', 'É uma porção do perfume original (ex.: 5 ml ou 10 ml) transferida para um frasco menor — ideal para conhecer a fragrância antes de investir no frasco completo.'],
  ];
  app.innerHTML = `<div class="page">
    <section class="page-head"><div class="container">
      <nav class="crumbs"><a href="#/">Início</a><span>/</span><span>Contato</span></nav>
      <h1 class="h2">Fale com a DURAH</h1>
      <p>Atendimento personalizado para encontrar a sua assinatura olfativa.</p>
    </div></section>
    <section class="section" style="padding-top:28px"><div class="container">
      <div class="contact-grid">
        <a class="contact-card" href="${wa(msgGeneral())}" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')}<span class="eyebrow">WhatsApp</span><strong>${esc(fmtPhone(st.whatsapp))}</strong><span class="muted">Clique para conversar agora</span></a>
        ${st.instagram ? `<a class="contact-card" href="https://instagram.com/${esc(st.instagram)}" target="_blank" rel="noopener">${icon('instagram')}<span class="eyebrow">Instagram</span><strong>@${esc(st.instagram)}</strong><span class="muted">Lançamentos e novidades</span></a>` : ''}
        <div class="contact-card">${icon('clock')}<span class="eyebrow">Horário de atendimento</span><strong>${esc(st.hours || '')}</strong><span class="muted">${esc(st.city || '')}</span></div>
      </div>
      <div class="mt-3">${helpCta()}</div>
      <div class="block mt-3"><h2>${icon('chat')} Perguntas frequentes</h2>
        ${faq.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
      </div>
    </div></section>
  </div>`;
}

function pageNotFound(t = 'Página não encontrada', d = 'O endereço acessado não existe.') {
  setSeo(t + ' — DURAH');
  app.innerHTML = `<div class="page container section"><div class="empty">${icon('search')}<h1 class="h2">${esc(t)}</h1><p class="mt-1">${esc(d)}</p><a class="btn btn--primary mt-2" href="#/catalogo">Ver catálogo</a></div></div>`;
}

// ═══════════════ SEO ═══════════════
function setSeo(title, description, ld) {
  document.title = title;
  const d = description || 'DURAH Perfumes e Importados: perfumes importados, árabes e de nicho com atendimento personalizado pelo WhatsApp.';
  $('meta[name="description"]').setAttribute('content', d);
  $('meta[property="og:title"]').setAttribute('content', title);
  $('meta[property="og:description"]').setAttribute('content', d);
  $('#ld-page')?.remove();
  if (ld) {
    const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld-page';
    s.textContent = JSON.stringify(ld).replace(/</g, '\\u003c'); document.head.appendChild(s);
  }
}

// ═══════════════ Sacola & desejos ═══════════════
function saveCart() { persist('durah_cart', S.cart); updateCounts(); }
function saveFavs() { persist('durah_favs', S.favs); updateCounts(); }
const cartItems = () => S.cart.map((i) => ({ p: byId(i.id), qty: i.qty, v: i.v || 'full' })).filter((i) => i.p);
function updateCounts() {
  const c = S.cart.reduce((a, i) => a + (byId(i.id) ? i.qty : 0), 0);
  const f = S.favs.filter(byId).length;
  $('#cartCount').textContent = c; $('#cartCount').hidden = !c;
  $('#favCount').textContent = f; $('#favCount').hidden = !f;
}
function addToCart(id, key) {
  const p = byId(id); if (!p) return;
  const v = key ? getVariant(p, key) : defaultVariant(p);
  const it = S.cart.find((i) => i.id === id && (i.v || 'full') === v.key);
  const max = v.key === 'full' && v.available ? Math.max(1, p.stock || 99) : 99;
  if (it) it.qty = Math.min(it.qty + 1, max); else S.cart.push({ id, v: v.key, qty: 1 });
  saveCart(); toast(v.available ? `${v.key === 'full' ? 'Frasco' : v.label} adicionado à sacola ✓` : `Adicionado sob encomenda (${shop.backorder}) ✓`);
  if ($('#drawer').classList.contains('is-open')) renderDrawer();
}
function toggleFav(id) {
  const on = S.favs.includes(id);
  S.favs = on ? S.favs.filter((x) => x !== id) : [...S.favs, id];
  saveFavs();
  $$(`[data-fav="${id}"]`).forEach((b) => { b.classList.toggle('is-on', !on); b.setAttribute('aria-pressed', String(!on)); });
  toast(on ? 'Removido dos desejos' : 'Salvo na lista de desejos ♥');
  if ($('#drawer').classList.contains('is-open')) renderDrawer();
}

let drawerTab = 'cart';
function openDrawer(tab = 'cart') {
  drawerTab = tab; renderDrawer();
  const d = $('#drawer'); d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
  showOverlay(closeDrawer);
}
function closeDrawer() { const d = $('#drawer'); d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); hideOverlay(); }
function renderDrawer() {
  $$('#drawer .tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === drawerTab));
  const body = $('#drawerBody'), foot = $('#drawerFoot');
  if (drawerTab === 'cart') {
    S.cart = S.cart.filter((i) => byId(i.id));
    const items = cartItems();
    if (!items.length) {
      body.innerHTML = `<div class="empty">${icon('bag')}<p><strong>Sua sacola está vazia.</strong></p><p class="mt-1">Adicione perfumes e finalize tudo em uma única mensagem no WhatsApp.</p></div>`;
      foot.innerHTML = `<a class="btn btn--primary btn--block" href="#/catalogo" data-close>Ver catálogo</a>`; return;
    }
    const total = items.reduce((a, { p, qty, v }) => a + getVariant(p, v).price * qty, 0);
    body.innerHTML = items.map(({ p, qty, v }, i) => { const vr = getVariant(p, v); return `<div class="line-item">
      <img src="${esc(productImages(p)[0])}" alt="" loading="lazy">
      <div><div class="line-item__brand">${esc(p.brand)}</div><a class="line-item__name" href="#/produto/${esc(p.slug)}" data-close>${esc(p.name)}</a><div class="line-item__meta"><span class="line-item__variant">${esc(vr.label)}</span> · R$ ${money(vr.price)}</div>${!vr.available ? `<span class="badge badge--warn mt-1">Sob encomenda · ${esc(shop.backorder)}</span>` : ''}</div>
      <div class="line-item__right">
        <div class="qty"><button data-qty="${i}" data-d="-1" aria-label="Diminuir">${icon('minus')}</button><span>${qty}</span><button data-qty="${i}" data-d="1" aria-label="Aumentar">${icon('plus')}</button></div>
        <button class="link-btn" data-remove="${i}">Remover</button>
      </div>
    </div>`; }).join('');
    foot.innerHTML = `<div class="drawer__total"><span>Total estimado</span><strong>R$ ${money(total)}</strong></div>
      <a class="btn btn--primary btn--block btn--lg" href="${wa(msgList(items))}" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} Finalizar pelo WhatsApp</a>
      <p class="hint" style="text-align:center">Você confirma disponibilidade, frete e pagamento direto com a loja.</p>`;
  } else {
    const items = S.favs.map(byId).filter(Boolean);
    if (!items.length) {
      body.innerHTML = `<div class="empty">${icon('heart')}<p><strong>Nenhum desejo salvo.</strong></p><p class="mt-1">Toque no coração dos perfumes para montar sua lista.</p></div>`;
      foot.innerHTML = `<a class="btn btn--primary btn--block" href="#/catalogo" data-close>Ver catálogo</a>`; return;
    }
    body.innerHTML = items.map((p) => `<div class="line-item">
      <img src="${esc(productImages(p)[0])}" alt="" loading="lazy">
      <div><div class="line-item__brand">${esc(p.brand)}</div><a class="line-item__name" href="#/produto/${esc(p.slug)}" data-close>${esc(p.name)}</a><div class="line-item__meta">${esc(defaultVariant(p).label)} · R$ ${money(defaultVariant(p).price)}</div></div>
      <div class="line-item__right">
        <button class="btn btn--outline btn--sm" data-add="${p.id}">${icon('bag', 'i--sm')}</button>
        <button class="link-btn" data-unfav="${p.id}">Remover</button>
      </div>
    </div>`).join('');
    foot.innerHTML = `<a class="btn btn--primary btn--block btn--lg" href="${wa(msgList(items.map((p) => ({ p, qty: 1, v: defaultVariant(p).key })), 'separei minha lista de desejos'))}" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} Enviar lista pelo WhatsApp</a>`;
  }
}

// ─── Overlay ───
let overlayClose = null;
function showOverlay(fn) { overlayClose = fn; $('#overlay').hidden = false; document.body.style.overflow = 'hidden'; }
function hideOverlay() { $('#overlay').hidden = true; document.body.style.overflow = ''; overlayClose = null; }

// ═══════════════ Helpers ═══════════════
function fmtPhone(n) {
  const d = String(n || '').replace(/\D/g, '');
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : d;
}
function safeLink(l) { return /^(https?:\/\/|#\/)/.test(l || '') ? l : '#/catalogo'; }

function applySettings() {
  const st = S.settings;
  const ann = $('#announce');
  ann.hidden = !(st.announcement && st.announcement.active && st.announcement.text);
  ann.innerHTML = `<span>${esc(st.announcement?.text || '')}</span>`;
  shop.backorder = (st.trust && st.trust.backorder) || DEFAULT_TRUST.backorder;
  $('#waFloat').href = wa(msgGeneral());
  $('#headerWa').href = wa(msgGeneral());
  $('#footerContact').innerHTML = `
    <li><a href="${wa(msgGeneral())}" target="_blank" rel="noopener">${icon('whatsapp', 'i--fill')} ${esc(fmtPhone(st.whatsapp))}</a></li>
    ${st.instagram ? `<li><a href="https://instagram.com/${esc(st.instagram)}" target="_blank" rel="noopener">${icon('instagram')} @${esc(st.instagram)}</a></li>` : ''}
    ${st.hours ? `<li><span style="display:inline-flex;gap:10px">${icon('clock')} ${esc(st.hours)}</span></li>` : ''}`;
  $('#year').textContent = new Date().getFullYear();
}

// ═══════════════ Roteador ═══════════════
async function route() {
  const h = location.hash || '#/';
  if (!h.startsWith('#/')) return;
  const [path, qs] = h.slice(1).split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(qs || '');
  document.body.classList.remove('is-product', 'is-admin');
  closeMobileNav(); hideOverlay();
  $('#header').classList.remove('is-searching');
  $$('.nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === (parts[0] || 'home') || (parts[0] === 'produto' && a.dataset.nav === 'catalogo')));

  switch (parts[0]) {
    case undefined: pageHome(); break;
    case 'catalogo': pageCatalog(q); $('#searchInput').value = F.q; break;
    case 'produto': pageProduct(parts[1]); break;
    case 'marcas': pageBrands(); break;
    case 'contato': pageContact(); break;
    case 'admin': {
      setSeo('Painel administrativo — DURAH');
      document.body.classList.add('is-admin');
      const { mountAdmin } = await import('./admin.js');
      mountAdmin(app, { onChange: reloadCatalog });
      break;
    }
    default: pageNotFound();
  }
  if (!route.keepScroll) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  route.keepScroll = false;
}

async function reloadCatalog() {
  const data = await store.catalog();
  S.products = data.products || []; S.settings = data.settings || {};
  applySettings(); updateCounts();
}

// ═══════════════ Eventos globais ═══════════════
function closeMobileNav() { $('#mobileNav').hidden = true; $('#menuBtn').setAttribute('aria-expanded', 'false'); }

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-fav],[data-add],[data-help],[data-close],[data-qty],[data-remove],[data-unfav],#drawer .tab');
  if (!t) return;
  if (t.dataset.fav) { e.preventDefault(); toggleFav(t.dataset.fav); }
  else if (t.dataset.add) { e.preventDefault(); addToCart(t.dataset.add, t.dataset.variant); }
  else if (t.hasAttribute('data-help')) { e.preventDefault(); closeMobileNav(); $('#helpModal').showModal(); }
  else if (t.hasAttribute('data-close')) { closeDrawer(); }
  else if (t.dataset.qty !== undefined) {
    const it = S.cart[+t.dataset.qty]; const p = it && byId(it.id);
    if (it && p) {
      const max = (it.v || 'full') === 'full' && getVariant(p, 'full').available ? Math.max(1, p.stock || 99) : 99;
      it.qty = Math.max(1, Math.min(it.qty + +t.dataset.d, max)); saveCart(); renderDrawer();
    }
  } else if (t.dataset.remove !== undefined) { S.cart.splice(+t.dataset.remove, 1); saveCart(); renderDrawer(); }
  else if (t.dataset.unfav) { toggleFav(t.dataset.unfav); }
  else if (t.dataset.tab) { drawerTab = t.dataset.tab; renderDrawer(); }
});

$('#overlay').addEventListener('click', () => overlayClose && overlayClose());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlayClose) overlayClose(); });
$('#cartBtn').addEventListener('click', () => openDrawer('cart'));
$('#favBtn').addEventListener('click', () => openDrawer('fav'));
$('#menuBtn').addEventListener('click', () => {
  const nav = $('#mobileNav'); nav.hidden = !nav.hidden;
  $('#menuBtn').setAttribute('aria-expanded', String(!nav.hidden));
});
$('#searchToggle').addEventListener('click', () => {
  $('#header').classList.toggle('is-searching');
  if ($('#header').classList.contains('is-searching')) $('#searchInput').focus();
});
$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#searchInput').value.trim();
  location.hash = '#/catalogo' + (v ? '?q=' + encodeURIComponent(v) : '');
  $('#header').classList.remove('is-searching');
  $('#searchInput').blur();
});
$('#searchInput').addEventListener('input', (e) => {
  if (!location.hash.startsWith('#/catalogo')) return;
  F.q = e.target.value; const f = $('#filterForm'); if (f) f.q.value = F.q;
  renderResults(); writeFilters();
});

// Modal "Me ajude a escolher"
$('#helpForm').addEventListener('submit', (e) => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  const fd = new FormData(e.target);
  const notes = fd.getAll('hnotes');
  const free = (fd.get('hnotesFree') || '').trim();
  if (free) notes.push(free);
  const msg = msgHelp(fd.get('hgender'), notes.length ? joinPt(notes) : 'que combinem com o meu estilo', fd.get('hocc'));
  window.open(wa(msg), '_blank', 'noopener');
});
$('#helpModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

window.addEventListener('hashchange', route);

// ═══════════════ Início ═══════════════
(async function init() {
  try {
    await reloadCatalog();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="container section"><div class="empty">Não foi possível carregar o catálogo. Atualize a página.</div></div>`;
    return;
  }
  route();
})();
