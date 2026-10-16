import { store, optimizeImage } from './store.js';
import {
  $, $$, esc, money, icon, toast, productImages, finalPrice, isSoldOut, DEFAULT_TRUST, stars, guessProductByTitle,
  PRODUCT_TYPES, VS_KINDS, SCENT_PROFILE, INTENSITY, productType, isPerfume, typeLabel,
  CONCENTRATIONS, GENDERS, FAMILIES, LONGEVITY, PROJECTION, SEASONS, OCCASIONS, VOLUMES, ORIGINS, NICHE_HOUSES, TAG_SUGGESTIONS,
} from './ui.js';

let root, ctx, data = { products: [], settings: {} }, tab = 'products', listFilter = { q: '', status: 'all' };

export async function mountAdmin(el, context) {
  root = el; ctx = context;
  await store.detectMode();
  if (!store.isLogged()) return renderLogin();
  try { await refresh(); render(); }
  catch (e) { handleError(e); }
}

async function refresh() { data = await store.adminCatalog(); }

function handleError(e) {
  if (e.status === 401) { store.logout(); renderLogin(); toast('Sessão expirada. Entre novamente.', true); return; }
  toast(e.message || 'Algo deu errado.', true);
}

const demoNote = () => store.mode === 'local'
  ? `<div class="mode-note mode-note--alert">⚠️ <strong>Atenção — o servidor não respondeu (modo demonstração).</strong> As alterações feitas aqui ficam salvas <strong>só neste navegador</strong>: clientes e outros aparelhos NÃO vão ver. Abra <a href="api/health?check=1" target="_blank" rel="noopener"><u>api/health?check=1</u></a> para ver o diagnóstico.</div>`
  : data.storage === 'temp'
    ? `<div class="mode-note mode-note--alert">⚠️ <strong>Armazenamento temporário:</strong> nenhum banco foi conectado, então produtos e fotos cadastrados aqui <strong>serão perdidos</strong>. Configure o Supabase (variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY — veja o README) e faça um novo deploy.</div>`
    : '';

// ═══════════════ Login ═══════════════
function renderLogin() {
  root.innerHTML = `<div class="page container admin">
    <div class="login">
      <img class="login__logo" src="img/brand/logo-durah.webp" alt="DURAH Perfumes & Importados" width="593" height="640"><span class="eyebrow">Área do lojista</span>
      <p class="muted">Acesse para gerenciar produtos, banner e informações da loja.</p>
      <form id="loginForm">
        <label class="label" for="pw">Senha</label>
        <div style="position:relative">
          <input class="input" id="pw" type="password" autocomplete="current-password" required autofocus>
          <button type="button" class="icon-btn" id="pwToggle" style="position:absolute;right:2px;top:1px" aria-label="Mostrar senha">${icon('eye')}</button>
        </div>
        <button class="btn btn--primary btn--block btn--lg mt-2" type="submit">Entrar</button>
        ${store.mode === 'local' ? '<p class="hint" style="text-align:center;color:var(--danger)">⚠️ Servidor não encontrado — modo demonstração (alterações ficam só neste navegador). Senha de demonstração: <strong>durah2026</strong></p>' : ''}
      </form>
    </div>
  </div>`;
  $('#pwToggle').addEventListener('click', () => { const i = $('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; });
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
    try { await store.login($('#pw').value); await refresh(); tab = 'products'; render(); toast('Bem-vindo(a) ao painel ✓'); }
    catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}

// ═══════════════ Painel ═══════════════
function render() {
  root.innerHTML = `<div class="page container admin">
    <div class="admin__top">
      <h1>Painel DURAH</h1>
      <a class="btn btn--ghost btn--sm" href="#/">${icon('eye', 'i--sm')} Ver loja</a>
      <button class="btn btn--ghost btn--sm" id="logout">${icon('logout', 'i--sm')} Sair</button>
    </div>
    ${demoNote()}
    <nav class="admin__tabs" role="tablist">
      <button data-tab="products" class="${tab === 'products' ? 'is-active' : ''}">${icon('box')} Produtos</button>
      <button data-tab="new" class="${tab === 'new' ? 'is-active' : ''}">${icon('plus')} Novo produto</button>
      <button data-tab="settings" class="${tab === 'settings' ? 'is-active' : ''}">${icon('sliders')} Banner &amp; loja</button>
      <button data-tab="reviews" class="${tab === 'reviews' ? 'is-active' : ''}">${icon('star')} Avaliações</button>
      <button data-tab="backup" class="${tab === 'backup' ? 'is-active' : ''}">${icon('download')} Backup</button>
    </nav>
    <div id="adminBody"></div>
  </div>`;
  $('#logout').addEventListener('click', () => { store.logout(); renderLogin(); });
  $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  const body = $('#adminBody');
  if (tab === 'products') renderList(body);
  else if (tab === 'new') renderForm(body, null);
  else if (tab === 'edit') renderForm(body, editing);
  else if (tab === 'settings') renderSettings(body);
  else if (tab === 'reviews') renderReviews(body);
  else renderBackup(body);
}

// ─── Lista de produtos ───
let editing = null;
function renderList(body) {
  const P = data.products;
  body.innerHTML = `
    <div class="stats">
      <div class="stat"><strong>${P.length}</strong><span>produtos</span></div>
      <div class="stat"><strong>${P.filter((p) => p.active).length}</strong><span>visíveis na loja</span></div>
      <div class="stat"><strong>${P.filter(isSoldOut).length}</strong><span>esgotados</span></div>
      <div class="stat"><strong>${P.filter((p) => p.featured).length}</strong><span>em destaque</span></div>
    </div>
    <div class="toolbar">
      <input class="input" id="aq" type="search" placeholder="Buscar por nome ou marca" value="${esc(listFilter.q)}" style="flex:1;min-width:180px">
      <select class="input" id="ast" style="width:auto">
        <option value="all">Todos</option><option value="active">Visíveis</option><option value="inactive">Ocultos</option>
        <option value="soldout">Esgotados</option><option value="featured">Destaques</option>
      </select>
      <button class="btn btn--primary" id="newBtn">${icon('plus')} Novo produto</button>
    </div>
    <div class="alist" id="alist"></div>`;
  $('#ast').value = listFilter.status;
  $('#aq').addEventListener('input', (e) => { listFilter.q = e.target.value; drawRows(); });
  $('#ast').addEventListener('change', (e) => { listFilter.status = e.target.value; drawRows(); });
  $('#newBtn').addEventListener('click', () => { tab = 'new'; render(); });
  drawRows();
}

function drawRows() {
  const q = listFilter.q.toLowerCase();
  const f = { all: () => true, active: (p) => p.active, inactive: (p) => !p.active, soldout: isSoldOut, featured: (p) => p.featured }[listFilter.status];
  const list = data.products.filter((p) => f(p) && (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q)));
  const tgl = (id, key, on, label) => `<button class="toggle ${on ? 'is-on' : ''}" data-toggle="${key}" data-id="${id}" aria-pressed="${on}">${label}</button>`;
  $('#alist').innerHTML = list.length ? list.map((p) => `<div class="arow ${p.active ? '' : 'is-inactive'}">
      <img src="${esc(productImages(p)[0])}" alt="" loading="lazy">
      <div>
        <div class="arow__name">${esc(p.name)}</div>
        <div class="arow__meta">${esc(p.brand)} · ${esc(p.volume)} · <span class="gold">R$ ${money(finalPrice(p))}</span> · estoque: ${p.stock}</div>
        <div class="arow__badges">
          ${!isPerfume(p) ? `<span class="badge">${esc(typeLabel(p))}</span>` : ''}
          ${!p.active ? '<span class="badge badge--off">Oculto</span>' : ''}
          ${isSoldOut(p) ? '<span class="badge badge--off">Esgotado</span>' : ''}
          ${p.featured ? '<span class="badge badge--solid">Destaque</span>' : ''}
          ${p.launch ? '<span class="badge">Lançamento</span>' : ''}
          ${p.niche ? '<span class="badge">Nicho</span>' : ''}
        </div>
      </div>
      <div class="arow__actions">
        ${tgl(p.id, 'active', p.active, 'Ativo')}
        ${tgl(p.id, 'featured', p.featured, 'Destaque')}
        ${tgl(p.id, 'soldout', p.status === 'esgotado', 'Esgotado')}
        <button class="btn btn--ghost btn--sm" data-edit="${p.id}">${icon('edit', 'i--sm')} Editar</button>
        <button class="btn btn--ghost btn--sm" data-dup="${p.id}" title="Duplicar">Duplicar</button>
        <button class="btn btn--danger btn--sm" data-del="${p.id}" aria-label="Excluir">${icon('trash', 'i--sm')}</button>
      </div>
    </div>`).join('') : `<div class="empty">Nenhum produto encontrado.</div>`;

  $$('[data-toggle]').forEach((b) => b.addEventListener('click', () => quickToggle(b.dataset.id, b.dataset.toggle)));
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => { editing = data.products.find((p) => p.id === b.dataset.edit); tab = 'edit'; render(); }));
  $$('[data-dup]').forEach((b) => b.addEventListener('click', () => {
    const src = data.products.find((p) => p.id === b.dataset.dup);
    editing = { ...structuredClone(src), id: undefined, slug: undefined, name: src.name + ' (cópia)', active: false };
    tab = 'edit'; render(); toast('Cópia criada — revise e salve.');
  }));
  $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const p = data.products.find((x) => x.id === b.dataset.del);
    if (!confirm(`Excluir "${p.name}" definitivamente?`)) return;
    try { await store.deleteProduct(p.id); await afterChange('Produto excluído.'); } catch (e) { handleError(e); }
  }));
}

async function quickToggle(id, key) {
  const p = structuredClone(data.products.find((x) => x.id === id));
  let note = '';
  if (key === 'soldout') {
    if (p.status === 'esgotado' || p.stock <= 0) {
      p.status = 'disponivel';
      if (p.stock <= 0) { p.stock = 1; note = ' Estoque ajustado para 1 — edite se necessário.'; }
    } else p.status = 'esgotado';
  } else p[key] = !p[key];
  try { await store.saveProduct(p); await afterChange('Atualizado ✓' + note, true); } catch (e) { handleError(e); }
}

async function afterChange(msg, keepList) {
  await refresh(); await ctx.onChange();
  if (keepList && tab === 'products') drawRows(); else render();
  toast(msg);
}

// ─── Componente de tags/notas ───
function tagInput(el, values = [], suggestions = []) {
  let vals = [...values];
  const draw = () => {
    el.innerHTML = `<div class="tag-input">${vals.map((v, i) => `<span class="chip">${esc(v)}<button type="button" data-rm="${i}" aria-label="Remover ${esc(v)}">${icon('x')}</button></span>`).join('')}<input type="text" placeholder="${vals.length ? '' : 'Digite e pressione Enter'}" enterkeyhint="done"></div>
      ${suggestions.length ? `<div class="chips mt-1">${suggestions.filter((s) => !vals.includes(s)).map((s) => `<button type="button" class="pill" data-sug="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div>` : ''}`;
    const input = $('input', el);
    $('.tag-input', el).addEventListener('click', () => input.focus());
    $$('[data-rm]', el).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); vals.splice(+b.dataset.rm, 1); draw(); $('input', el).focus(); }));
    $$('[data-sug]', el).forEach((b) => b.addEventListener('click', () => { vals.push(b.dataset.sug); draw(); }));
    const commit = () => {
      const parts = input.value.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return false;
      parts.forEach((p) => { if (!vals.some((v) => v.toLowerCase() === p.toLowerCase())) vals.push(p); });
      draw(); $('input', el).focus(); return true;
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
      else if (e.key === 'Backspace' && !input.value && vals.length) { vals.pop(); draw(); $('input', el).focus(); }
    });
    input.addEventListener('blur', () => { if (input.value.trim()) commit(); });
  };
  draw();
  return { get: () => { const pending = $('input', el)?.value.trim(); if (pending) pending.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => vals.includes(p) || vals.push(p)); return vals; } };
}

// ─── Upload de fotos ───
function uploader(el, images, max = 4) {
  let imgs = [...images];
  const draw = () => {
    el.innerHTML = `<div class="uploader">${Array.from({ length: max }, (_, i) => imgs[i]
      ? `<div class="uslot"><img src="${esc(imgs[i])}" alt="Foto ${i + 1}">
          <div class="uslot__actions">${i ? `<button type="button" data-main="${i}" title="Usar como capa">${icon('star')}</button>` : ''}<button type="button" data-rmimg="${i}" title="Remover">${icon('trash')}</button></div>
          ${i === 0 ? '<span class="badge badge--solid uslot__main">Capa</span>' : ''}</div>`
      : `<div class="uslot" data-slot="${i}"><label>${icon('upload')}<span>${i === imgs.length ? 'Adicionar foto' : 'Vazio'}</span><input type="file" accept="image/*" ${max > 1 ? 'multiple' : ''}></label></div>`).join('')}</div>
      <p class="hint">Até ${max} ${max > 1 ? 'imagens' : 'imagem'}. Elas são otimizadas automaticamente (WebP, até 1400px). A primeira é a capa.</p>`;
    $$('[data-rmimg]', el).forEach((b) => b.addEventListener('click', () => { imgs.splice(+b.dataset.rmimg, 1); draw(); }));
    $$('[data-main]', el).forEach((b) => b.addEventListener('click', () => { const [m] = imgs.splice(+b.dataset.main, 1); imgs.unshift(m); draw(); }));
    $$('input[type=file]', el).forEach((inp) => inp.addEventListener('change', async () => {
      const files = [...inp.files].slice(0, max - imgs.length);
      const slot = inp.closest('.uslot'); slot.classList.add('is-loading');
      for (const f of files) {
        try {
          const local = store.mode === 'local';
          const dataUrl = await optimizeImage(f, local ? 900 : 1400, local ? 0.78 : 0.84);
          imgs.push(await store.uploadImage(dataUrl));
        } catch (e) { handleError(e); }
      }
      draw();
    }));
  };
  draw();
  return { get: () => imgs };
}

// ─── Formulário de produto ───
function renderForm(body, p) {
  const isNew = !p || !p.id;
  p = p || { gender: 'Masculino', concentration: 'Eau de Parfum', volume: '100ml', status: 'disponivel', stock: 1, active: true, imported: true, notes: {}, references: [], seasons: [], occasions: [], tags: [], images: [] };
  const brands = [...new Set(data.products.map((x) => x.brand).filter(Boolean))];
  const opt = (arr, v, empty) => (empty ? `<option value="">${empty}</option>` : '') + arr.map((a) => `<option ${a === v ? 'selected' : ''}>${esc(a)}</option>`).join('');
  const checks = (name, arr, sel) => `<div class="chips">${arr.map(([a, i]) => `<label class="chip-check"><input type="checkbox" name="${name}" value="${esc(a)}" ${(sel || []).includes(a) ? 'checked' : ''}><span>${icon(i, 'i--sm')} ${esc(a)}</span></label>`).join('')}</div>`;
  const sw = (name, label, on, hint) => `<label class="chip-check" title="${esc(hint)}"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span>${label}</span></label>`;

  body.innerHTML = `<form id="pform" novalidate>
    <h2 class="h2" style="margin-bottom:16px">${isNew ? 'Novo produto' : 'Editar: ' + esc(p.name)}</h2>

    <section class="fsection"><h2>${icon('tag')} Informações principais</h2>
      <div class="form-grid form-grid--2">
        <div class="field"><label class="label" for="f-type">Tipo de produto</label>
          <select class="input" id="f-type" name="type">${PRODUCT_TYPES.map(([v, l]) => `<option value="${v}" ${productType(p) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
          <p class="hint" data-only="simple">Ficha simples: sem pirâmide, referências ou decants — só “Como é o cheiro”.</p></div>
        <div class="field" data-only="vs"><label class="label" for="f-vskind">Linha</label>
          <select class="input" id="f-vskind" name="vsKind">${VS_KINDS.map(([v, l]) => `<option value="${v}" ${(p.vsKind || 'body-splash') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid form-grid--2">
        <div class="field"><label class="label" for="f-name">Nome do produto *</label><input class="input" id="f-name" name="name" required value="${esc(p.name)}" placeholder="Ex.: Aurum Noir"></div>
        <div class="field"><label class="label" for="f-brand">Marca / casa de perfumaria *</label><input class="input" id="f-brand" name="brand" list="dl-brands" required value="${esc(p.brand)}" placeholder="Ex.: Maison Durand Paris"></div>
      </div>
      <div class="form-grid form-grid--3">
        <div class="field"><label class="label" for="f-price">Preço (R$) *</label><input class="input" id="f-price" name="price" type="number" step="0.01" min="0" inputmode="decimal" required value="${p.price ?? ''}"></div>
        <div class="field"><label class="label" for="f-promo">Preço promocional (R$)</label><input class="input" id="f-promo" name="promoPrice" type="number" step="0.01" min="0" inputmode="decimal" value="${p.promoPrice ?? ''}" placeholder="Opcional"></div>
        <div class="field" data-only="perfume"><label class="label" for="f-d5">Preço decant 5ml (R$)</label><input class="input" id="f-d5" name="decant5Price" type="number" step="0.01" min="0" inputmode="decimal" value="${p.decant5Price ?? ''}" placeholder="Vazio = não vende"></div>
        <div class="field" data-only="perfume"><label class="label" for="f-d10">Preço decant 10ml (R$)</label><input class="input" id="f-d10" name="decant10Price" type="number" step="0.01" min="0" inputmode="decimal" value="${p.decant10Price ?? ''}" placeholder="Vazio = não vende"></div>
        <div class="field"><label class="label" for="f-vol">Tamanho / volume</label><input class="input" id="f-vol" name="volume" list="dl-vol" value="${esc(p.volume)}" placeholder="Ex.: 100ml"></div>
        <div class="field" data-only="perfume"><label class="label" for="f-conc">Concentração</label><select class="input" id="f-conc" name="concentration">${opt(CONCENTRATIONS, p.concentration)}</select></div>
        <div class="field"><label class="label" for="f-gender">Gênero</label><select class="input" id="f-gender" name="gender">${opt(GENDERS, p.gender)}</select></div>
        <div class="field"><label class="label" for="f-origin">Origem</label><input class="input" id="f-origin" name="origin" list="dl-origin" value="${esc(p.origin)}" placeholder="Ex.: França"></div>
        <div class="field"><label class="label" for="f-stock">Estoque (quantidade)</label><input class="input" id="f-stock" name="stock" type="number" min="0" step="1" inputmode="numeric" value="${p.stock ?? 0}"></div>
        <div class="field"><label class="label" for="f-status">Status</label><select class="input" id="f-status" name="status"><option value="disponivel" ${p.status !== 'esgotado' ? 'selected' : ''}>Disponível</option><option value="esgotado" ${p.status === 'esgotado' ? 'selected' : ''}>Esgotado</option></select></div>
      </div>
      <p class="hint">Com estoque de 1 a 3 unidades, o selo “Últimas unidades” aparece automaticamente. Com estoque 0, o frasco aparece como esgotado.<br>
      <span data-only="perfume"><strong class="gold">Decants:</strong> preencha o preço do decant de 5ml e/ou 10ml para o cliente poder escolher entre frasco completo e decant na página do produto. Deixe vazio para não oferecer. Os decants continuam à venda mesmo com o frasco esgotado.</span></p>
    </section>

    <section class="fsection"><h2>${icon('upload')} Fotos</h2><div id="f-images"></div></section>

    <section class="fsection"><h2>${icon('sparkles')} Descrição</h2>
      <div class="field"><label class="label" for="f-desc">Descrição geral (storytelling do perfume)</label>
        <textarea class="input" id="f-desc" name="description" rows="7" placeholder="Conte a história da fragrância: abertura, acorde principal, drydown, sillage…">${esc(p.description)}</textarea></div>
    </section>

    <section class="fsection" data-only="simple"><h2>${icon('sparkles')} Como é o cheiro</h2>
      <div class="field"><span class="label">Perfil do aroma (marque quantos quiser)</span>
        <div class="chips">${SCENT_PROFILE.map(([n, e]) => `<label class="chip-check"><input type="checkbox" name="scentProfile" value="${esc(n)}" ${(p.scentProfile || []).includes(n) ? 'checked' : ''}><span>${e} ${esc(n)}</span></label>`).join('')}</div></div>
      <div class="field"><label class="label" for="f-int">Intensidade</label>
        <select class="input" id="f-int" name="intensity" style="max-width:260px"><option value="">Não informar</option>${INTENSITY.map((i) => `<option ${p.intensity === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>
      <p class="hint">Aparece na página do produto como “Como é o cheiro”, ex.: “Um aroma doce e frutado”.</p>
    </section>

    <section class="fsection" data-only="perfume"><h2>${icon('layers')} Pirâmide olfativa</h2>
      <div class="field"><span class="label">Notas de topo / saída</span><div id="f-top"></div></div>
      <div class="field"><span class="label">Notas de coração / corpo</span><div id="f-heart"></div></div>
      <div class="field"><span class="label">Notas de fundo / base</span><div id="f-base"></div></div>
      <p class="hint">Digite cada nota e pressione Enter (ou separe por vírgula).</p>
    </section>

    <section class="fsection" data-only="perfume"><h2>${icon('drop')} Perfil olfativo</h2>
      <div class="form-grid form-grid--3">
        <div class="field"><label class="label" for="f-fam">Família olfativa</label><select class="input" id="f-fam" name="family">${opt(FAMILIES, p.family, 'Selecione…')}</select></div>
        <div class="field"><label class="label" for="f-perf">Perfumista / nariz</label><input class="input" id="f-perf" name="perfumer" value="${esc(p.perfumer)}" placeholder="Opcional"></div>
        <div class="field"><label class="label" for="f-year">Ano de lançamento</label><input class="input" id="f-year" name="year" type="number" min="1900" max="2100" value="${p.year ?? ''}" placeholder="Opcional"></div>
        <div class="field"><label class="label" for="f-lon">Fixação</label><select class="input" id="f-lon" name="longevity">${opt(LONGEVITY, p.longevity, 'Selecione…')}</select></div>
        <div class="field"><label class="label" for="f-proj">Projeção</label><select class="input" id="f-proj" name="projection">${opt(PROJECTION, p.projection, 'Selecione…')}</select></div>
      </div>
      <div class="field"><span class="label">Estações ideais</span>${checks('seasons', SEASONS, p.seasons)}</div>
      <div class="field"><span class="label">Ocasiões</span>${checks('occasions', OCCASIONS, p.occasions)}</div>
    </section>

    <section class="fsection" data-only="perfume"><h2>${icon('star')} Referências olfativas — “Para quem gosta de…”</h2>
      <div id="f-refs"></div>
      <button type="button" class="btn btn--outline btn--sm" id="addRef">${icon('plus', 'i--sm')} Adicionar referência</button>
      <p class="hint">Ex.: Aventus — Creed · Layton — Parfums de Marly. Exibido como “Para quem gosta de Aventus (Creed) ou Layton (Parfums de Marly)”.</p>
    </section>

    <section class="fsection"><h2>${icon('tag')} Tags</h2><div id="f-tags"></div></section>

    <section class="fsection"><h2>${icon('eye')} Vitrine e selos</h2>
      <div class="switches">
        ${sw('active', 'Ativo (visível na loja)', p.active, 'Desmarque para ocultar o produto da loja')}
        ${sw('featured', '★ Destaque', p.featured, 'Aparece na seção Destaques da página inicial')}
        ${sw('imported', 'Importado', p.imported, 'Selo Importado')}
        ${sw('niche', 'Nicho', p.niche, 'Selo Nicho e categoria Nicho')}
        ${sw('launch', 'Lançamento', p.launch, 'Selo Lançamento e categoria Lançamentos')}
        <span data-only="perfume">${sw('decant', 'Decant / miniatura', p.decant, 'Categoria Decants/Miniaturas')}</span>
      </div>
    </section>

    <datalist id="dl-brands">${brands.map((b) => `<option value="${esc(b)}">`).join('')}</datalist>
    <datalist id="dl-vol">${VOLUMES.map((v) => `<option value="${v}">`).join('')}</datalist>
    <datalist id="dl-origin">${ORIGINS.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>
    <datalist id="dl-houses">${NICHE_HOUSES.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>

    <div class="form-actions">
      <button type="button" class="btn btn--ghost" id="cancel">Cancelar</button>
      <button type="submit" class="btn btn--primary">${icon('check')} ${isNew ? 'Cadastrar produto' : 'Salvar alterações'}</button>
    </div>
  </form>`;

  const n = p.notes || {};
  const imgs = uploader($('#f-images'), p.images || []);
  const top = tagInput($('#f-top'), n.top || []);
  const heart = tagInput($('#f-heart'), n.heart || []);
  const base = tagInput($('#f-base'), n.base || []);
  const tags = tagInput($('#f-tags'), p.tags || [], TAG_SUGGESTIONS);

  const refsEl = $('#f-refs');
  const addRefRow = (r = {}) => {
    const row = document.createElement('div'); row.className = 'ref-row';
    row.innerHTML = `<input class="input" data-r="name" placeholder="Perfume (ex.: Aventus)" value="${esc(r.name)}"><input class="input" data-r="house" list="dl-houses" placeholder="Casa (ex.: Creed)" value="${esc(r.house)}"><button type="button" class="icon-btn" aria-label="Remover">${icon('trash')}</button>`;
    $('button', row).addEventListener('click', () => row.remove());
    refsEl.appendChild(row);
  };
  (p.references && p.references.length ? p.references : [{}]).forEach(addRefRow);
  $('#addRef').addEventListener('click', () => addRefRow());

  const syncType = () => {
    const t = $('#f-type').value;
    $$('[data-only="perfume"]', body).forEach((el) => { el.hidden = t !== 'perfume'; });
    $$('[data-only="simple"]', body).forEach((el) => { el.hidden = t === 'perfume'; });
    $$('[data-only="vs"]', body).forEach((el) => { el.hidden = t !== 'victorias-secret'; });
    if (t === 'victorias-secret' && !$('#f-brand').value.trim()) $('#f-brand').value = "Victoria's Secret";
  };
  $('#f-type').addEventListener('change', syncType);
  syncType();

  $('#cancel').addEventListener('click', () => { tab = 'products'; editing = null; render(); });
  $('#pform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f);
    if (!fd.get('name').trim()) { toast('Informe o nome do perfume.', true); f.name.focus(); return; }
    if (!fd.get('brand').trim()) { toast('Informe a marca.', true); f.brand.focus(); return; }
    if (!(parseFloat(fd.get('price')) > 0)) { toast('Informe o preço.', true); f.price.focus(); return; }
    const promo = parseFloat(fd.get('promoPrice'));
    if (promo && promo >= parseFloat(fd.get('price'))) { toast('O preço promocional deve ser menor que o preço normal.', true); f.promoPrice.focus(); return; }
    const out = {
      ...p,
      name: fd.get('name').trim(), brand: fd.get('brand').trim(),
      price: parseFloat(fd.get('price')), promoPrice: promo || null,
      type: fd.get('type'), vsKind: fd.get('type') === 'victorias-secret' ? fd.get('vsKind') : '',
      scentProfile: fd.get('type') === 'perfume' ? [] : fd.getAll('scentProfile'), intensity: fd.get('type') === 'perfume' ? '' : fd.get('intensity'),
      decant5Price: fd.get('type') === 'perfume' ? (parseFloat(fd.get('decant5Price')) || null) : null,
      decant10Price: fd.get('type') === 'perfume' ? (parseFloat(fd.get('decant10Price')) || null) : null,
      volume: fd.get('volume').trim().replace(/\s+/g, '').replace(/ML$/i, 'ml'),
      concentration: fd.get('concentration'), gender: fd.get('gender'), origin: fd.get('origin').trim(),
      stock: parseInt(fd.get('stock'), 10) || 0, status: fd.get('status'),
      description: fd.get('description').trim(),
      images: imgs.get(),
      notes: { top: top.get(), heart: heart.get(), base: base.get() },
      family: fd.get('family'), perfumer: fd.get('perfumer').trim(), year: parseInt(fd.get('year'), 10) || null,
      longevity: fd.get('longevity'), projection: fd.get('projection'),
      seasons: fd.getAll('seasons'), occasions: fd.getAll('occasions'),
      references: $$('.ref-row', refsEl).map((r) => ({ name: $('[data-r=name]', r).value.trim(), house: $('[data-r=house]', r).value.trim() })).filter((r) => r.name || r.house),
      tags: tags.get(),
      active: !!fd.get('active'), featured: !!fd.get('featured'), imported: !!fd.get('imported'),
      niche: !!fd.get('niche'), launch: !!fd.get('launch'), decant: !!fd.get('decant'),
    };
    if (out.stock <= 0 && out.status === 'disponivel') out.status = 'esgotado';
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await store.saveProduct(out);
      tab = 'products'; editing = null;
      await afterChange(isNew ? 'Produto cadastrado ✓' : 'Alterações salvas ✓');
    } catch (err) { handleError(err); btn.disabled = false; }
  });
}

// ─── Banner & informações da loja ───
function renderSettings(body) {
  const s = data.settings || {}, b = s.banner || {}, a = s.announcement || {};
  const t = { ...DEFAULT_TRUST, ...(s.trust || {}) };
  const promoId = b.productId || (guessProductByTitle(data.products, b.title) || {}).id || '';
  body.innerHTML = `<form id="sform">
    <section class="fsection"><h2>${icon('sparkles')} Barra de anúncio (topo do site)</h2>
      <label class="chip-check"><input type="checkbox" name="annActive" ${a.active ? 'checked' : ''}><span>Exibir barra de anúncio</span></label>
      <div class="field mt-1"><label class="label" for="s-ann">Texto</label><input class="input" id="s-ann" name="annText" value="${esc(a.text)}" maxlength="200"></div>
    </section>

    <section class="fsection"><h2>${icon('star')} Banner de promoções (página inicial)</h2>
      <label class="chip-check"><input type="checkbox" name="bActive" ${b.active ? 'checked' : ''}><span>Exibir banner</span></label>
      <div class="field mt-1"><label class="label" for="s-prod">Produto em promoção</label>
        <select class="input" id="s-prod" name="bProduct">
          <option value="">— Nenhum (banner só com texto) —</option>
          ${data.products.map((p) => `<option value="${esc(p.id)}" ${p.id === promoId ? 'selected' : ''}>${esc(p.name)} — R$ ${money(finalPrice(p))}${p.promoPrice ? ` (de R$ ${money(p.price)})` : ''}</option>`).join('')}
        </select>
        <p class="hint">O banner mostra a foto, o preço “de / por” e o botão de compra direta pelo WhatsApp. O preço “de / por” vem do <strong>preço promocional</strong> do produto. Se o título ficar vazio, aparece o nome do perfume.</p>
      </div>
      <div class="form-grid form-grid--2">
        <div class="field"><label class="label" for="s-tag">Etiqueta</label><input class="input" id="s-tag" name="bTag" value="${esc(b.tag)}" placeholder="Ex.: Promoção da semana"></div>
        <div class="field"><label class="label" for="s-title">Título</label><input class="input" id="s-title" name="bTitle" value="${esc(b.title)}"></div>
      </div>
      <div class="field"><label class="label" for="s-text">Texto</label><textarea class="input" id="s-text" name="bText" rows="3">${esc(b.text)}</textarea></div>
      <div class="form-grid form-grid--2">
        <div class="field"><label class="label" for="s-cta">Texto do botão</label><input class="input" id="s-cta" name="bCta" value="${esc(b.cta)}"></div>
        <div class="field"><label class="label" for="s-link">Link do botão (quando não há produto)</label>
          <select class="input" id="s-link" name="bLink">
            <option value="#/catalogo">Catálogo completo</option>
            <option value="#/catalogo?cat=lancamentos">Lançamentos</option>
            <option value="#/catalogo?cat=decants">Decants/Miniaturas</option>
            ${data.products.map((p) => `<option value="#/produto/${esc(p.slug)}">Produto: ${esc(p.name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><span class="label">Imagem do banner (opcional — se vazio, usa a foto do produto)</span><div id="s-img"></div></div>
    </section>

    <section class="fsection"><h2>${icon('shield')} Confiança (aparece perto dos produtos e botões de compra)</h2>
      <div class="form-grid form-grid--2">
        <div class="field"><label class="label" for="s-auth">Autenticidade</label><input class="input" id="s-auth" name="tAuth" value="${esc(t.authenticity)}" maxlength="80"></div>
        <div class="field"><label class="label" for="s-pay">Formas de pagamento</label><input class="input" id="s-pay" name="tPay" value="${esc(t.payment)}" maxlength="80"></div>
        <div class="field"><label class="label" for="s-inst">Parcelas sem juros (máx.)</label><input class="input" id="s-inst" name="tInst" type="number" min="1" max="24" value="${esc(t.installments)}"><p class="hint">Use 1 para não mostrar parcelamento.</p></div>
        <div class="field"><label class="label" for="s-ship">Prazo de envio</label><input class="input" id="s-ship" name="tShip" value="${esc(t.shipping)}" maxlength="80"></div>
        <div class="field"><label class="label" for="s-back">Prazo “sob encomenda” (produto sem estoque)</label><input class="input" id="s-back" name="tBack" value="${esc(t.backorder)}" maxlength="40" placeholder="5 dias úteis"><p class="hint">Aparece no botão “Sob encomenda (…)” e na mensagem do WhatsApp.</p></div>
      </div>
    </section>

    <section class="fsection"><h2>${icon('chat')} Contato e atendimento</h2>
      <div class="form-grid form-grid--2">
        <div class="field"><label class="label" for="s-wa">WhatsApp (com DDI e DDD)</label><input class="input" id="s-wa" name="whatsapp" inputmode="numeric" value="${esc(s.whatsapp)}" placeholder="5548991154821"></div>
        <div class="field"><label class="label" for="s-ig">Instagram (sem @)</label><input class="input" id="s-ig" name="instagram" value="${esc(s.instagram)}"></div>
        <div class="field"><label class="label" for="s-hours">Horário de atendimento</label><input class="input" id="s-hours" name="hours" value="${esc(s.hours)}"></div>
        <div class="field"><label class="label" for="s-city">Localização / envio</label><input class="input" id="s-city" name="city" value="${esc(s.city)}"></div>
      </div>
    </section>
    <div class="form-actions"><button class="btn btn--primary" type="submit">${icon('check')} Salvar</button></div>
  </form>`;
  const sel = $('#s-link');
  if (b.link && ![...sel.options].some((o) => o.value === b.link)) sel.insertAdjacentHTML('beforeend', `<option value="${esc(b.link)}">${esc(b.link)}</option>`);
  sel.value = b.link || '#/catalogo';
  const img = uploader($('#s-img'), b.image ? [b.image] : [], 1);

  $('#sform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const wa = String(fd.get('whatsapp')).replace(/\D/g, '');
    if (wa.length < 12) { toast('WhatsApp inválido. Use DDI + DDD + número, ex.: 5548991154821', true); return; }
    const out = {
      ...s, whatsapp: wa, instagram: String(fd.get('instagram')).trim().replace(/^@/, ''),
      hours: fd.get('hours').trim(), city: fd.get('city').trim(),
      announcement: { active: !!fd.get('annActive'), text: fd.get('annText').trim() },
      banner: { active: !!fd.get('bActive'), productId: fd.get('bProduct') || '', tag: fd.get('bTag').trim(), title: fd.get('bTitle').trim(), text: fd.get('bText').trim(), cta: fd.get('bCta').trim(), link: fd.get('bLink'), image: img.get()[0] || '' },
      trust: { authenticity: fd.get('tAuth').trim(), payment: fd.get('tPay').trim(), installments: parseInt(fd.get('tInst'), 10) || 1, shipping: fd.get('tShip').trim(), backorder: fd.get('tBack').trim() },
    };
    try { await store.saveSettings(out); await afterChange('Configurações salvas ✓'); } catch (err) { handleError(err); }
  });
}

// ─── Avaliações de clientes ───
function renderReviews(body) {
  const s = data.settings || {};
  const list = s.reviews || [];
  body.innerHTML = `<div class="mode-note">${icon('star', 'i--sm')} Cadastre <strong>avaliações reais</strong> de clientes (por exemplo, mensagens recebidas no WhatsApp ou comentários no Instagram). Avaliações inventadas são consideradas propaganda enganosa pelo Código de Defesa do Consumidor.</div>
    <section class="fsection"><h2>${icon('plus')} Nova avaliação</h2>
      <form id="rform">
        <div class="form-grid form-grid--3">
          <div class="field"><label class="label" for="r-name">Nome do cliente</label><input class="input" id="r-name" name="name" required maxlength="60" placeholder="Ex.: Mariana S."></div>
          <div class="field"><label class="label" for="r-city">Cidade (opcional)</label><input class="input" id="r-city" name="city" maxlength="60" placeholder="Ex.: Florianópolis/SC"></div>
          <div class="field"><label class="label" for="r-rating">Nota</label><select class="input" id="r-rating" name="rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${stars(n)} (${n})</option>`).join('')}</select></div>
        </div>
        <div class="field"><label class="label" for="r-prod">Perfume avaliado (opcional)</label>
          <select class="input" id="r-prod" name="productId"><option value="">— Avaliação geral da loja —</option>${data.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="r-text">Comentário</label><textarea class="input" id="r-text" name="text" rows="3" required maxlength="600" placeholder="O que o cliente disse"></textarea></div>
        <button class="btn btn--primary" type="submit">${icon('check')} Adicionar avaliação</button>
      </form>
    </section>
    <div class="alist">${list.length ? list.map((r, i) => `<div class="arow" style="grid-template-columns:1fr auto">
        <div><div class="arow__name"><span class="gold">${stars(r.rating)}</span> ${esc(r.name)}${r.city ? ` · <span class="muted">${esc(r.city)}</span>` : ''}</div>
        <div class="arow__meta">${r.productName ? esc(r.productName) + ' — ' : ''}“${esc(r.text)}”</div></div>
        <div class="arow__actions"><button class="btn btn--danger btn--sm" data-rdel="${i}" aria-label="Excluir">${icon('trash', 'i--sm')}</button></div>
      </div>`).join('') : '<div class="empty">Nenhuma avaliação cadastrada. Enquanto não houver avaliações, a seção fica oculta no site.</div>'}</div>`;

  const save = async (reviews, msg) => {
    try { await store.saveSettings({ ...s, reviews }); await afterChange(msg); } catch (err) { handleError(err); }
  };
  $('#rform').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const prod = data.products.find((p) => p.id === fd.get('productId'));
    const r = { id: 'r' + Date.now().toString(36), name: fd.get('name').trim(), city: fd.get('city').trim(), rating: +fd.get('rating'), text: fd.get('text').trim(), productId: prod ? prod.id : '', productName: prod ? prod.name : '', date: new Date().toISOString().slice(0, 10) };
    save([r, ...list], 'Avaliação adicionada ✓');
  });
  $$('[data-rdel]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Excluir esta avaliação?')) return;
    save(list.filter((_, i) => i !== +b.dataset.rdel), 'Avaliação excluída.');
  }));
}

// ─── Backup ───
function renderBackup(body) {
  body.innerHTML = `<section class="fsection"><h2>${icon('download')} Exportar</h2>
      <p class="muted">Baixe uma cópia de todos os produtos e configurações (arquivo .json).</p>
      <button class="btn btn--primary mt-2" id="exp">${icon('download')} Baixar backup</button>
    </section>
    <section class="fsection"><h2>${icon('upload')} Importar</h2>
      <p class="muted">Restaura um backup exportado anteriormente. <strong class="gold">Substitui</strong> todos os produtos atuais.</p>
      <label class="btn btn--outline mt-2">${icon('upload')} Escolher arquivo<input type="file" id="imp" accept="application/json,.json" hidden></label>
    </section>
    <section class="fsection"><h2>${icon('sparkles')} Perfumes de exemplo</h2><p class="muted">${store.mode === 'local' ? 'Restaura os 6 perfumes de exemplo, apagando as alterações feitas neste navegador.' : 'Adiciona de volta os 6 perfumes de exemplo (seus produtos cadastrados são mantidos).'}</p><button class="btn btn--outline mt-2" id="reset">Restaurar exemplos</button></section>`;
  $('#exp').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `durah-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#imp').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!confirm(`Importar ${json.products?.length ?? 0} produtos e substituir o catálogo atual?`)) return;
      await store.importBackup(json); await afterChange('Backup importado ✓');
    } catch (err) { handleError(err.status ? err : new Error('Arquivo inválido.')); }
  });
  $('#reset')?.addEventListener('click', async () => {
    if (!confirm('Restaurar os produtos de exemplo?')) return;
    await store.resetDemo(); await afterChange('Exemplos restaurados ✓');
  });
}
