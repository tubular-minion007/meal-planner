(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const APP_KEY = 'lena_meal_planner_v2';
  const LEGACY_APP_KEY = 'lena_meal_planner_v1';
  const PROFILE_INDEX_KEY = `${APP_KEY}:profiles`;
  const ACTIVE_PROFILE_KEY = `${APP_KEY}:activeProfile`;
  const THEME_KEY = 'lena_meal_planner_theme';
  const DATA_VERSION = 2;
  const APP_VERSION = 'v2.4.0';

  const DEMO_FOODS = {
    proteins: ['nuggets', 'oeufs', 'jambon', 'poulet pané'],
    carbs: ['riz', 'pâtes nature', 'pommes de terre', 'frites au four'],
    sides: ['carottes', 'maïs', 'concombre', 'petits pois'],
    breakfast: ['yaourt vanille', 'banane', 'céréales simples'],
    desserts: ['compote', 'yaourt', 'fruit doux']
  };

  let currentProfileId = null;
  let lastGenerated = null;

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function keyForProfile(id) {
    return `${APP_KEY}:profile:${id}`;
  }

  function localDateString(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseDateString(dateStr) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function lines(value) {
    return String(value || '')
      .split(/\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function uniqueStrings(items) {
    return [...new Set((items || []).map((x) => String(x).trim()).filter(Boolean))];
  }

  function normalizeOption(option) {
    if (!option || typeof option !== 'object') return null;
    return {
      kind: String(option.kind || ''),
      title: String(option.title || ''),
      main: String(option.main || ''),
      carb: String(option.carb || ''),
      side: String(option.side || ''),
      dessert: String(option.dessert || ''),
      note: String(option.note || '')
    };
  }

  function normalizeData(raw = {}) {
    const data = raw && typeof raw === 'object' ? raw : {};
    const historyLog = Array.isArray(data.historyLog) ? data.historyLog : [];
    return {
      version: DATA_VERSION,
      tz: String(data.tz || ''),
      sendTime: String(data.sendTime || '18:00'),
      nogos: uniqueStrings(data.nogos || []),
      repeatDays: Math.min(5, Math.max(2, Number.parseInt(data.repeatDays ?? 3, 10) || 3)),
      novelty: Math.min(2, Math.max(0, Number.parseInt(data.novelty ?? 1, 10) || 1)),
      sensory: String(data.sensory || ''),
      prep: String(data.prep || ''),
      proteins: uniqueStrings(data.proteins || []),
      carbs: uniqueStrings(data.carbs || []),
      sides: uniqueStrings(data.sides || []),
      breakfast: uniqueStrings(data.breakfast || []),
      desserts: uniqueStrings(data.desserts || []),
      history: data.history && typeof data.history === 'object' ? { ...data.history } : {},
      historyLog: historyLog
        .map((entry) => ({
          date: String(entry?.date || ''),
          choice: Number.parseInt(entry?.choice ?? 1, 10) || 1,
          option: normalizeOption(entry?.option)
        }))
        .filter((entry) => entry.date && entry.option),
      favs: uniqueStrings(data.favs || [])
    };
  }

  function migrateLegacyIfNeeded() {
    const existingIndexRaw = localStorage.getItem(PROFILE_INDEX_KEY);
    if (existingIndexRaw) return;

    const legacyProfileIndexRaw = localStorage.getItem(`${LEGACY_APP_KEY}:profiles`);
    const legacyActiveId = localStorage.getItem(`${LEGACY_APP_KEY}:activeProfile`);

    if (legacyProfileIndexRaw) {
      try {
        const legacyIndex = JSON.parse(legacyProfileIndexRaw);
        if (legacyIndex && Array.isArray(legacyIndex.profiles) && legacyIndex.profiles.length) {
          const newIndex = {
            profiles: legacyIndex.profiles.map((p, i) => ({
              id: String(p?.id || `p_${uid()}_${i}`),
              name: String(p?.name || `Profil ${i + 1}`)
            })),
            activeId: String(legacyIndex.activeId || legacyActiveId || legacyIndex.profiles[0].id)
          };
          localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(newIndex));
          for (const profile of newIndex.profiles) {
            const oldKey = `${LEGACY_APP_KEY}:profile:${profile.id}`;
            const oldValue = localStorage.getItem(oldKey);
            if (oldValue && !localStorage.getItem(keyForProfile(profile.id))) {
              localStorage.setItem(keyForProfile(profile.id), JSON.stringify(normalizeData(JSON.parse(oldValue))));
            }
          }
          localStorage.setItem(ACTIVE_PROFILE_KEY, newIndex.activeId);
          return;
        }
      } catch (error) {
        console.warn('Legacy profile migration failed', error);
      }
    }

    const legacySingle = localStorage.getItem(LEGACY_APP_KEY);
    const id = `p_${uid()}`;
    const index = { profiles: [{ id, name: 'Profil 1' }], activeId: id };
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(index));
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);

    if (legacySingle) {
      try {
        localStorage.setItem(keyForProfile(id), JSON.stringify(normalizeData(JSON.parse(legacySingle))));
      } catch {
        localStorage.setItem(keyForProfile(id), JSON.stringify(normalizeData({})));
      }
    }
  }

  function loadProfilesIndex() {
    migrateLegacyIfNeeded();
    try {
      const parsed = JSON.parse(localStorage.getItem(PROFILE_INDEX_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.profiles) || !parsed.profiles.length) throw new Error('bad index');
      const profiles = parsed.profiles.map((profile, i) => ({
        id: String(profile?.id || `p_${uid()}_${i}`),
        name: String(profile?.name || `Profil ${i + 1}`)
      }));
      const activeId = profiles.some((p) => p.id === parsed.activeId) ? parsed.activeId : profiles[0].id;
      return { profiles, activeId };
    } catch {
      const id = `p_${uid()}`;
      const index = { profiles: [{ id, name: 'Profil 1' }], activeId: id };
      localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(index));
      localStorage.setItem(ACTIVE_PROFILE_KEY, id);
      return index;
    }
  }

  function saveProfilesIndex(index) {
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(index));
  }

  function setCurrentProfile(id) {
    currentProfileId = id;
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }

  function loadProfile(profileId = currentProfileId) {
    const idx = loadProfilesIndex();
    const targetId = profileId || idx.activeId;
    if (!currentProfileId) setCurrentProfile(targetId);
    try {
      return normalizeData(JSON.parse(localStorage.getItem(keyForProfile(targetId)) || '{}'));
    } catch {
      return normalizeData({});
    }
  }

  function saveProfile(data, profileId = currentProfileId) {
    const idx = loadProfilesIndex();
    const targetId = profileId || idx.activeId;
    const normalized = normalizeData(data);
    localStorage.setItem(keyForProfile(targetId), JSON.stringify(normalized));
    return normalized;
  }

  function currentChoice() {
    if ($('choice3')?.checked) return 3;
    if ($('choice2')?.checked) return 2;
    return 1;
  }

  function updateStatus(message) {
    $('status').textContent = message;
  }

  function updateVersionBadge() {
    const el = $('versionBadge');
    if (el) el.textContent = APP_VERSION;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
  }

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function rng() {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(list, rng) {
    if (!list.length) return '';
    return list[Math.floor(rng() * list.length)];
  }

  function pickNonRepeating(proteins, history, repeatDays, dateStr, rng) {
    if (!proteins.length) return '';
    const recent = new Set();
    const base = parseDateString(dateStr);
    for (let i = 1; i <= repeatDays; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const key = localDateString(d);
      if (history[key]) recent.add(history[key]);
    }
    const candidates = proteins.filter((p) => !recent.has(p));
    return pick(candidates.length ? candidates : proteins, rng);
  }

  function makeKeepSeparateNote(sensory) {
    return /(touch|toucher|se toucher|touchent)/i.test(String(sensory || '')) ? 'séparer les aliments' : '';
  }

  function generateForDate(data, dateStr) {
    const seed = hashStr(`${dateStr}|${data.tz}|${data.nogos.join('|')}|${data.proteins.join('|')}`);
    const rng = mulberry32(seed);

    const safeMain = data.proteins[0] || pick(data.proteins, rng);
    const safeCarb = data.carbs[0] || pick(data.carbs, rng);
    const safeSide = data.sides[0] || pick(data.sides, rng);
    const safeDessert = data.desserts.length ? (data.desserts[0] || pick(data.desserts, rng)) : '';

    const main = pickNonRepeating(data.proteins, data.history, data.repeatDays, dateStr, rng) || safeMain;
    const novelty = data.novelty;

    const carbA = safeCarb;
    const sideA = safeSide;
    const carbB = novelty >= 1 ? (pick(data.carbs.slice(1).length ? data.carbs.slice(1) : data.carbs, rng) || carbA) : carbA;
    const sideB = novelty >= 1 ? (pick(data.sides.slice(1).length ? data.sides.slice(1) : data.sides, rng) || sideA) : sideA;
    const altMain = novelty >= 2 ? (pickNonRepeating(data.proteins, data.history, data.repeatDays, dateStr, rng) || main) : safeMain;
    const carbC = pick(data.carbs, rng) || carbA;
    const sideC = pick(data.sides, rng) || sideA;
    const note = makeKeepSeparateNote(data.sensory);

    return {
      date: dateStr,
      chosenMain: main,
      options: [
        { kind: 'safe', title: 'Par défaut (safe)', main: safeMain || main, carb: carbA, side: sideA, dessert: safeDessert, note },
        { kind: 'variation', title: 'Petite variation', main, carb: carbB, side: sideB, dessert: safeDessert, note },
        { kind: 'alt', title: 'Alternative', main: altMain || safeMain || main, carb: carbC, side: sideC, dessert: safeDessert, note }
      ]
    };
  }

  function detectNoGoHits(textParts, nogos) {
    const hay = textParts.join(' ').toLowerCase();
    return (nogos || []).filter((ng) => {
      const needle = String(ng).toLowerCase();
      return needle && hay.includes(needle);
    });
  }

  function kindBadge(kind) {
    if (kind === 'safe') return '<span class="badge text-bg-success">Sûr</span>';
    if (kind === 'variation') return '<span class="badge text-bg-info">Variation</span>';
    return '<span class="badge text-bg-primary">Alternative</span>';
  }

  function pill(label, cls) {
    if (!label) return '';
    return `<span class="badge rounded-pill ${cls}">${escapeHtml(label)}</span>`;
  }

  function searchUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function recipeLinks(option) {
    const terms = [option.main, option.carb, option.side].filter(Boolean);
    const base = terms.join(' ');
    if (!base) return [];

    return [
      {
        label: 'Recette simple',
        hint: 'safe / peu d’ingrédients',
        url: searchUrl(`${base} recette simple peu ingrédients`)
      },
      {
        label: 'Version douce',
        hint: 'textures simples / ingrédients limités',
        url: searchUrl(`${base} safe food simple recipe minimal ingredients`)
      },
      {
        label: 'Inspiration suisse / péruvienne',
        hint: 'pour varier sans compliquer',
        url: searchUrl(`${base} recette suisse ou péruvienne simple`)
      }
    ];
  }

  function recipeTabId(idx, tabIdx) {
    return `recipe-tab-${idx + 1}-${tabIdx + 1}`;
  }

  function renderOption(option, idx, nogoHits) {
    const nogoBlock = nogoHits.length
      ? `<div class="alert alert-danger py-2 px-3 mt-2 mb-0 small"><b>Alerte “interdit” :</b> ${escapeHtml(nogoHits.join(', '))}</div>`
      : '';
    const note = option.note
      ? `<div class="small subtle mt-2"><span class="badge text-bg-warning">Règle</span> ${escapeHtml(option.note)}</div>`
      : '';
    const links = recipeLinks(option);
    const linksBlock = links.length
      ? `
        <div class="mt-3">
          <div class="small subtle mb-2">Idées recettes :</div>
          <div class="recipe-tabs mb-2" role="tablist" aria-label="Recettes pour l'option ${idx + 1}">
            ${links.map((link, linkIdx) => `
              <button
                type="button"
                class="btn btn-sm ${linkIdx === 0 ? 'btn-secondary' : 'btn-outline-secondary'} recipe-tab-btn"
                data-recipe-tab-btn="${idx + 1}"
                data-tab-index="${linkIdx}"
                aria-selected="${linkIdx === 0 ? 'true' : 'false'}"
                aria-controls="${recipeTabId(idx, linkIdx)}"
              >${escapeHtml(link.label)}</button>`).join('')}
          </div>
          <div class="recipe-panes d-flex flex-column gap-2">
            ${links.map((link, linkIdx) => `
              <div
                id="${recipeTabId(idx, linkIdx)}"
                class="recipe-pane"
                data-recipe-pane="${idx + 1}"
                data-tab-index="${linkIdx}"
                ${linkIdx === 0 ? '' : 'hidden'}
              >
                <div class="small subtle mb-2">${escapeHtml(link.hint)}</div>
                <a class="btn btn-sm btn-outline-secondary text-start w-100" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                  Ouvrir ${escapeHtml(link.label).toLowerCase()}
                </a>
              </div>`).join('')}
          </div>
        </div>`
      : '';

    return `
      <div class="border border-secondary-subtle rounded-3 p-3 mb-2 opt">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
          <div class="fw-semibold">Option ${idx + 1} : ${escapeHtml(option.title)}</div>
          <div>${kindBadge(option.kind)}</div>
        </div>
        <div class="d-flex flex-wrap gap-2">
          ${pill(option.main, 'text-bg-primary-subtle text-primary border border-primary-subtle')}
          ${pill(option.carb, 'text-bg-info-subtle text-info border border-info-subtle')}
          ${pill(option.side, 'text-bg-success-subtle text-success border border-success-subtle')}
          ${pill(option.dessert, 'badge-dessert')}
        </div>
        ${note}
        ${linksBlock}
        ${nogoBlock}
      </div>`;
  }

  function formatOption(option) {
    if (!option) return '';
    const parts = [option.main, option.carb, option.side, option.dessert].filter(Boolean);
    let text = parts.join(' + ');
    if (option.note) text += ` (${option.note})`;
    return text;
  }

  function renderHistory(data) {
    const el = $('history');
    const items = data.historyLog.slice(0, 10);
    if (!items.length) {
      el.innerHTML = '<div class="small subtle">Aucun historique pour l’instant.</div>';
      return;
    }
    el.innerHTML = items.map((entry) => `
      <div class="border border-secondary-subtle rounded-3 p-2 mb-2">
        <div><b>${escapeHtml(entry.date)}</b> <span class="subtle">(option ${escapeHtml(String(entry.choice))})</span></div>
        <div class="small">${escapeHtml(formatOption(entry.option))}</div>
      </div>`).join('');
  }

  function renderFavs(data) {
    const el = $('favs');
    const items = data.favs.slice(0, 10);
    if (!items.length) {
      el.innerHTML = '<div class="small subtle">Aucun favori pour l’instant.</div>';
      return;
    }
    el.innerHTML = items.map((text, idx) => `
      <div class="border border-secondary-subtle rounded-3 p-2 mb-2 d-flex align-items-start justify-content-between gap-2">
        <div class="small">${escapeHtml(text)}</div>
        <button class="btn btn-outline-danger btn-sm" data-fav-del="${idx}">✖</button>
      </div>`).join('');

    el.querySelectorAll('[data-fav-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const data = loadProfile();
        const index = Number.parseInt(btn.getAttribute('data-fav-del'), 10);
        data.favs = data.favs.filter((_, i) => i !== index);
        saveProfile(data);
        renderFavs(data);
      });
    });
  }

  function renderProfileSelect(index) {
    const select = $('profileSelect');
    select.innerHTML = '';
    index.profiles.forEach((profile) => {
      const opt = document.createElement('option');
      opt.value = profile.id;
      opt.textContent = profile.name || profile.id;
      opt.selected = profile.id === currentProfileId;
      select.appendChild(opt);
    });
  }

  function uiFromData(data) {
    $('tz').value = data.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    $('sendTime').value = data.sendTime || '18:00';
    $('nogos').value = data.nogos.join('\n');
    $('repeatDays').value = String(data.repeatDays);
    $('novelty').value = String(data.novelty);
    $('sensory').value = data.sensory;
    $('prep').value = data.prep;
    $('proteins').value = data.proteins.join('\n');
    $('carbs').value = data.carbs.join('\n');
    $('sides').value = data.sides.join('\n');
    $('breakfast').value = data.breakfast.join('\n');
    $('desserts').value = data.desserts.join('\n');
    renderHistory(data);
    renderFavs(data);
  }

  function dataFromUi() {
    const existing = loadProfile();
    return normalizeData({
      ...existing,
      tz: $('tz').value.trim(),
      sendTime: $('sendTime').value.trim(),
      nogos: lines($('nogos').value),
      repeatDays: Number.parseInt($('repeatDays').value, 10),
      novelty: Number.parseInt($('novelty').value, 10),
      sensory: $('sensory').value.trim(),
      prep: $('prep').value.trim(),
      proteins: lines($('proteins').value),
      carbs: lines($('carbs').value),
      sides: lines($('sides').value),
      breakfast: lines($('breakfast').value),
      desserts: lines($('desserts').value)
    });
  }

  function hasAnyFoodData(data) {
    return ['proteins', 'carbs', 'sides', 'breakfast', 'desserts'].some(
      (key) => Array.isArray(data[key]) && data[key].length > 0
    );
  }

  function withDemoFoods(data) {
    return normalizeData({
      ...data,
      proteins: data.proteins.length ? data.proteins : DEMO_FOODS.proteins,
      carbs: data.carbs.length ? data.carbs : DEMO_FOODS.carbs,
      sides: data.sides.length ? data.sides : DEMO_FOODS.sides,
      breakfast: data.breakfast.length ? data.breakfast : DEMO_FOODS.breakfast,
      desserts: data.desserts.length ? data.desserts : DEMO_FOODS.desserts
    });
  }

  function renderToday(gen, data) {
    const sendBadge = `<span class="badge text-bg-light border">${escapeHtml(data.sendTime || '18:00')} (${escapeHtml(data.tz || 'local')})</span>`;
    const rules = [data.sensory, data.prep].filter(Boolean).join(' · ');
    const rulesLine = rules ? `<div class="small subtle mono mb-2"><span class="badge text-bg-warning">Règles</span> ${escapeHtml(rules)}</div>` : '';

    $('today').innerHTML = `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div class="fw-semibold">Aujourd’hui (${escapeHtml(gen.date)})</div>
        <div class="d-flex gap-2 align-items-center"><span class="subtle small">heure :</span> ${sendBadge}</div>
      </div>
      ${rulesLine}
      ${gen.options.map((opt, i) => renderOption(opt, i, detectNoGoHits([opt.main, opt.carb, opt.side, opt.dessert].filter(Boolean), data.nogos))).join('')}`;

    $('foot').textContent = `Principal choisi (rotation) : ${gen.chosenMain || '—'} · Stocké localement dans votre navigateur.`;
  }

  function activateRecipeTab(group, tabIndex) {
    document.querySelectorAll(`[data-recipe-tab-btn="${group}"]`).forEach((btn) => {
      const active = Number.parseInt(btn.dataset.tabIndex, 10) === tabIndex;
      btn.classList.toggle('btn-secondary', active);
      btn.classList.toggle('btn-outline-secondary', !active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    document.querySelectorAll(`[data-recipe-pane="${group}"]`).forEach((pane) => {
      const active = Number.parseInt(pane.dataset.tabIndex, 10) === tabIndex;
      pane.hidden = !active;
    });
  }

  function renderWeek(data) {
    const start = new Date();
    const html = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const dateStr = localDateString(day);
      const generated = generateForDate(data, dateStr);
      html.push(`
        <div class="border border-secondary-subtle rounded-3 p-2 mb-2">
          <div class="small subtle">${escapeHtml(dateStr)}</div>
          <div class="d-flex flex-wrap gap-2 mt-1">
            ${pill(generated.chosenMain || '(aucun principal listé)', 'text-bg-primary-subtle text-primary border border-primary-subtle')}
          </div>
        </div>`);
    }
    $('week').innerHTML = html.join('');
  }

  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function b64urlDecode(str) {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return decodeURIComponent(escape(atob(b64)));
  }

  function buildShareUrl(data) {
    const payload = b64urlEncode(JSON.stringify(data));
    return { url: `${location.origin}${location.pathname}#p=${payload}`, payloadLen: payload.length };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function applyTheme(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', resolved);
    $('themeToggle').checked = resolved === 'dark';
    $('themeLabel').textContent = resolved === 'dark' ? 'Sombre' : 'Clair';
    localStorage.setItem(THEME_KEY, resolved);
  }

  function clearRenderedPlans() {
    $('today').innerHTML = '<div class="alert alert-light border small mb-0">Générez d’abord les suggestions du jour pour afficher les options et les liens recettes.</div>';
    $('week').innerHTML = '';
    $('foot').textContent = '';
    lastGenerated = null;
  }

  function importIntoCurrentProfile(rawData, sourceLabel) {
    const data = normalizeData(rawData);
    saveProfile(data);
    uiFromData(data);
    clearRenderedPlans();
    updateStatus(`Profil importé${sourceLabel ? ` (${sourceLabel})` : ''}.`);
  }

  function maybeImportFromHash() {
    const hash = location.hash || '';
    if (!hash.startsWith('#p=')) return;

    try {
      const data = JSON.parse(b64urlDecode(hash.slice(3)));
      const ok = confirm('Importer le profil depuis le lien partagé ? (Cela remplacera le profil actif sur cet appareil.)');
      if (!ok) return;
      importIntoCurrentProfile(data, 'depuis le lien');
      history.replaceState(null, '', location.pathname);
    } catch (error) {
      console.error(error);
      alert('Lien de partage invalide.');
    }
  }

  function generateAndRender() {
    const savedData = saveProfile(dataFromUi());
    const usingDemoFoods = !hasAnyFoodData(savedData);
    const data = usingDemoFoods ? withDemoFoods(savedData) : savedData;
    const gen = generateForDate(data, localDateString());
    lastGenerated = gen;
    renderToday(gen, data);
    renderWeek(data);
    updateStatus(usingDemoFoods ? 'Généré avec des exemples réalistes (mode démo).' : 'Généré.');
  }

  function initEvents() {
    $('today').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-recipe-tab-btn]');
      if (!btn) return;
      activateRecipeTab(btn.dataset.recipeTabBtn, Number.parseInt(btn.dataset.tabIndex, 10));
    });

    $('themeToggle').addEventListener('change', (event) => {
      applyTheme(event.target.checked ? 'dark' : 'light');
    });

    $('save').addEventListener('click', () => {
      saveProfile(dataFromUi());
      updateStatus(`Enregistré à ${new Date().toLocaleString()}`);
    });

    $('reset').addEventListener('click', () => {
      if (!confirm('Réinitialiser le profil actif + l’historique sur cet appareil ?')) return;
      const cleared = normalizeData({});
      saveProfile(cleared);
      uiFromData(cleared);
      clearRenderedPlans();
      updateStatus('Réinitialisation terminée.');
    });

    $('generate').addEventListener('click', generateAndRender);

    $('markUsed').addEventListener('click', () => {
      if (!lastGenerated?.date) {
        alert('Générez d’abord des suggestions.');
        return;
      }
      const data = loadProfile();
      const choice = currentChoice();
      const option = normalizeOption(lastGenerated.options?.[choice - 1]);
      if (!option) return;

      if (lastGenerated.chosenMain) data.history[lastGenerated.date] = lastGenerated.chosenMain;
      data.historyLog = [{ date: lastGenerated.date, choice, option }, ...data.historyLog.filter((entry) => entry.date !== lastGenerated.date)].slice(0, 50);
      saveProfile(data);
      renderHistory(data);
      renderWeek(data);
      updateStatus(`Marqué comme utilisé : option ${choice} (${lastGenerated.date})`);
    });

    $('import').addEventListener('click', () => $('importFile').click());

    $('importFile').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        importIntoCurrentProfile(JSON.parse(text), 'JSON');
      } catch (error) {
        console.error(error);
        alert('Fichier JSON invalide. Essayez d’importer un fichier exporté par ce site.');
      } finally {
        event.target.value = '';
      }
    });

    $('share').addEventListener('click', async () => {
      const data = saveProfile(dataFromUi());
      const { url } = buildShareUrl(data);
      if (url.length > 7000) alert('Le lien est très long. Astuce : utilisez plutôt Exporter/Importer JSON.');
      if (await copyText(url)) updateStatus('Lien de partage copié ✅');
      else prompt('Copiez ce lien et envoyez-le :', url);
    });

    $('export').addEventListener('click', () => {
      const data = saveProfile(dataFromUi());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'profil-planificateur-repas.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('print').addEventListener('click', () => window.print());

    $('copyMenu').addEventListener('click', async () => {
      const data = loadProfile();
      if (!lastGenerated?.date) {
        alert('Générez d’abord des suggestions.');
        return;
      }
      const rules = [data.sensory, data.prep].filter(Boolean).join(' · ');
      const body = lastGenerated.options.map((option, i) => `${i + 1}) ${formatOption(option)}`).join('\n');
      let message = `🍽️ Menu du jour (${lastGenerated.date})\n\n${body}`;
      if (rules) message += `\n\n⚠️ Règles: ${rules}`;
      message += `\n\nLien: ${location.origin}${location.pathname}`;
      if (await copyText(message)) updateStatus('Menu copié ✅ (collez-le dans WhatsApp)');
      else prompt('Copiez ce message (puis collez-le dans WhatsApp) :', message);
    });

    $('profileSelect').addEventListener('change', (event) => {
      const idx = loadProfilesIndex();
      const id = event.target.value;
      if (!idx.profiles.some((p) => p.id === id)) return;
      idx.activeId = id;
      saveProfilesIndex(idx);
      setCurrentProfile(id);
      uiFromData(loadProfile(id));
      clearRenderedPlans();
      updateStatus('Profil changé.');
    });

    $('profileNew').addEventListener('click', () => {
      const idx = loadProfilesIndex();
      const name = prompt('Nom du nouveau profil :', `Profil ${idx.profiles.length + 1}`);
      if (!name) return;
      const id = `p_${uid()}`;
      idx.profiles.push({ id, name: name.trim() || `Profil ${idx.profiles.length + 1}` });
      idx.activeId = id;
      saveProfilesIndex(idx);
      setCurrentProfile(id);
      saveProfile(normalizeData({}), id);
      renderProfileSelect(idx);
      uiFromData(loadProfile(id));
      clearRenderedPlans();
      updateStatus('Nouveau profil créé.');
    });

    $('profileRename').addEventListener('click', () => {
      const idx = loadProfilesIndex();
      const profile = idx.profiles.find((p) => p.id === currentProfileId);
      if (!profile) return;
      const name = prompt('Nouveau nom :', profile.name || 'Profil');
      if (!name) return;
      profile.name = name.trim() || profile.name;
      saveProfilesIndex(idx);
      renderProfileSelect(idx);
      updateStatus('Profil renommé.');
    });

    $('profileDelete').addEventListener('click', () => {
      const idx = loadProfilesIndex();
      if (idx.profiles.length <= 1) {
        alert('Impossible : il faut au moins un profil.');
        return;
      }
      const profile = idx.profiles.find((p) => p.id === currentProfileId);
      if (!confirm(`Supprimer le profil "${profile?.name || currentProfileId}" ?`)) return;
      localStorage.removeItem(keyForProfile(currentProfileId));
      idx.profiles = idx.profiles.filter((p) => p.id !== currentProfileId);
      idx.activeId = idx.profiles[0].id;
      saveProfilesIndex(idx);
      setCurrentProfile(idx.activeId);
      renderProfileSelect(idx);
      uiFromData(loadProfile(idx.activeId));
      clearRenderedPlans();
      updateStatus('Profil supprimé.');
    });

    $('historyClear').addEventListener('click', () => {
      if (!confirm('Effacer l’historique de ce profil ?')) return;
      const data = loadProfile();
      data.history = {};
      data.historyLog = [];
      saveProfile(data);
      renderHistory(data);
      renderWeek(data);
      updateStatus('Historique effacé.');
    });

    $('favsClear').addEventListener('click', () => {
      if (!confirm('Effacer les favoris de ce profil ?')) return;
      const data = loadProfile();
      data.favs = [];
      saveProfile(data);
      renderFavs(data);
      updateStatus('Favoris effacés.');
    });

    $('favAdd').addEventListener('click', () => {
      if (!lastGenerated?.date) {
        alert('Générez d’abord des suggestions.');
        return;
      }
      const option = normalizeOption(lastGenerated.options?.[currentChoice() - 1]);
      const text = formatOption(option);
      if (!text) return;
      const data = loadProfile();
      data.favs = [text, ...data.favs.filter((fav) => fav !== text)].slice(0, 50);
      saveProfile(data);
      renderFavs(data);
      updateStatus('Ajouté aux favoris.');
    });
  }

  function init() {
    const idx = loadProfilesIndex();
    setCurrentProfile(localStorage.getItem(ACTIVE_PROFILE_KEY) || idx.activeId);
    renderProfileSelect(idx);
    uiFromData(loadProfile());
    updateVersionBadge();
    updateStatus('Prêt.');
    applyTheme(localStorage.getItem(THEME_KEY) || 'light');
    initEvents();
    maybeImportFromHash();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
