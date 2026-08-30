const DUO_LABELS = {
    RU: {
        title: 'Звездный Дуэт',
        hint: 'Выберите персонажа',
        back: 'Вернуться к выбору',
        chara: 'Стар!Чара',
        sans: 'Стар!Санс'
    },
    EN: {
        title: 'Star Duo',
        hint: 'Choose a character',
        back: 'Back to selection',
        chara: 'Star!Chara',
        sans: 'Star!Sans'
    }
};

const CHARACTER_INFO = {
    chara: './info_chara.json',
    sans: './info_sans.json'
};

/** @type {Record<string, { info: object, article: { ru: string, en: string } }>} */
const characterCache = {};

const pickerEl = document.getElementById('starDuoPicker');
const profileEl = document.getElementById('starDuoProfile');
const stageEl = document.getElementById('starDuoStage');
const hintEl = document.getElementById('starDuoHint');
const hoverNameEl = document.getElementById('starDuoHoverName');
const backBtn = document.getElementById('backToPicker');
const pickChara = document.getElementById('pickChara');
const pickSans = document.getElementById('pickSans');

/** @type {'picker' | 'chara' | 'sans'} */
let activeView = 'picker';

/** @type {{ pause: () => void, resume: () => void } | null} */
let hintCycleControls = null;

function labels() {
    return DUO_LABELS[currentLang] || DUO_LABELS.RU;
}

/** Сохранение выбора в hash (#chara / #sans).
 *  Перезагрузка страницы сохраняет hash → персонаж остаётся.
 *  Ссылка со страницы characters ведёт на star_duo/ без hash → снова выбор.
 */
function saveView(view) {
    const nextHash = (view === 'chara' || view === 'sans') ? `#${view}` : '';
    const currentHash = window.location.hash || '';
    if (currentHash === nextHash) return;
    const url = `${window.location.pathname}${window.location.search}${nextHash}`;
    history.replaceState(null, '', url);
}

function readSavedView() {
    const h = (window.location.hash || '').replace(/^#/, '');
    return h === 'chara' || h === 'sans' ? h : null;
}

// Старый localStorage больше не используется — сбрасываем, чтобы не путал при тестах
try {
    localStorage.removeItem('chaoticverse_star_duo_view');
} catch (e) {
    /* ignore */
}

function updateChromeLabels() {
    const L = labels();
    if (hintEl) {
        const hintText = hintEl.querySelector('.star-duo-hint__text');
        if (hintText) hintText.textContent = L.hint;
        else hintEl.textContent = L.hint;
    }
    if (backBtn) backBtn.textContent = L.back;
    if (pickChara) pickChara.setAttribute('aria-label', L.chara);
    if (pickSans) pickSans.setAttribute('aria-label', L.sans);

    if (activeView === 'picker' && characterHeader) {
        characterHeader.textContent = L.title;
    } else if (characterHeader) {
        characterHeader.textContent = currentLang === 'RU' ? characterHeaderRU : characterHeaderEN;
    }

    if (hoverNameEl && stageEl) {
        if (stageEl.classList.contains('is-hover-chara')) {
            hoverNameEl.textContent = L.chara;
        } else if (stageEl.classList.contains('is-hover-sans')) {
            hoverNameEl.textContent = L.sans;
        }
    }
}

function setHover(side) {
    if (!stageEl) return;
    stageEl.classList.toggle('is-hover-chara', side === 'chara');
    stageEl.classList.toggle('is-hover-sans', side === 'sans');

    if (!hoverNameEl) return;
    const L = labels();
    if (side === 'chara') {
        hoverNameEl.textContent = L.chara;
        hoverNameEl.classList.add('is-visible');
        hoverNameEl.classList.toggle('is-chara', true);
        hoverNameEl.classList.toggle('is-sans', false);
    } else if (side === 'sans') {
        hoverNameEl.textContent = L.sans;
        hoverNameEl.classList.add('is-visible');
        hoverNameEl.classList.toggle('is-chara', false);
        hoverNameEl.classList.toggle('is-sans', true);
    } else {
        hoverNameEl.textContent = '';
        hoverNameEl.classList.remove('is-visible', 'is-chara', 'is-sans');
    }
}

async function showPicker() {
    activeView = 'picker';
    saveView('picker');
    pickerEl.hidden = false;
    profileEl.hidden = true;
    clearOverlayCharacterPanelTheme();
    document.getElementById('infobox')?.replaceChildren();
    const article = document.getElementById('Article');
    if (article) article.innerHTML = '';
    setHover(null);
    updateChromeLabels();
    hintCycleControls?.resume();
}

async function loadCharacterIntoPage(key) {
    const infoPath = CHARACTER_INFO[key];
    if (!infoPath) return;

    let cached = characterCache[key];
    if (!cached) {
        await ensureSchema();
        const info = await loadJSON(infoPath);
        const article = { ru: '', en: '' };
        const art = info.data.article;
        if (art?.ru) article.ru = await loadArticle(art.ru);
        if (art?.en) article.en = await loadArticle(art.en);
        cached = { info, article };
        characterCache[key] = cached;
    }

    infoData = cached.info;
    characterHeaderEN = cached.info.data.en_name;
    characterHeaderRU = cached.info.data.ru_name;
    characterArticle = {
        ru: cached.article.ru,
        en: cached.article.en
    };
    loadPromise = Promise.resolve();
}

async function openCharacter(key) {
    const infoPath = CHARACTER_INFO[key];
    if (!infoPath) return;

    activeView = key;
    saveView(key);
    hintCycleControls?.pause();
    clearHintFxLayers();
    setHover(null);
    pickerEl.hidden = true;
    profileEl.hidden = false;

    // Дать браузеру отрисовать смену вида до тяжёлого рендера infobox
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    await loadCharacterIntoPage(key);
    if (characterHeader) {
        characterHeader.textContent = currentLang === 'RU' ? characterHeaderRU : characterHeaderEN;
    }
    await applyLanguageUI();
    updateChromeLabels();
}

function bindHoverFallback() {
    if (!stageEl) return;

    pickChara?.addEventListener('pointerenter', () => setHover('chara'));
    pickSans?.addEventListener('pointerenter', () => setHover('sans'));
    pickChara?.addEventListener('pointerleave', () => setHover(null));
    pickSans?.addEventListener('pointerleave', () => setHover(null));
    stageEl.addEventListener('pointerleave', () => setHover(null));
}

pickChara?.addEventListener('click', () => openCharacter('chara'));
pickSans?.addEventListener('click', () => openCharacter('sans'));
backBtn?.addEventListener('click', () => showPicker());

window.CharacterPage.onLanguageChange = () => {
    updateChromeLabels();
};

bindHoverFallback();
updateChromeLabels();
if (langToggle) {
    langToggle.textContent = currentLang === 'RU' ? 'EN' : 'RU';
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearHintFxLayers() {
    if (!hintEl) return;
    const burst = hintEl.querySelector('.star-duo-hint__burst');
    const bolts = hintEl.querySelector('.star-duo-hint__bolts');
    if (burst) burst.replaceChildren();
    if (bolts) bolts.replaceChildren();
}

/** Много мелких вспышек из разных точек, с разными дистанциями/размерами. */
function spawnHintExplosions() {
    const burst = hintEl?.querySelector('.star-duo-hint__burst');
    if (!burst || activeView !== 'picker') return;
    burst.replaceChildren();

    const frag = document.createDocumentFragment();
    const pops = 16 + Math.floor(Math.random() * 12);
    const rings = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < pops; i++) {
        const el = document.createElement('span');
        el.className = 'star-duo-hint__pop';
        const ox = 12 + Math.random() * 76;
        const oy = 18 + Math.random() * 64;
        const stretchX = 0.35 + Math.random() * 1.8;
        const stretchY = 0.25 + Math.random() * 1.6;
        const dist = 8 + Math.random() * 54;
        const angle = Math.random() * Math.PI * 2;
        el.style.setProperty('--ox', `${ox}%`);
        el.style.setProperty('--oy', `${oy}%`);
        el.style.setProperty('--x', `${Math.cos(angle) * dist * stretchX}px`);
        el.style.setProperty('--y', `${Math.sin(angle) * dist * stretchY}px`);
        el.style.setProperty('--s', `${1.5 + Math.random() * 6.5}px`);
        el.style.setProperty('--d', `${Math.random() * 0.28}s`);
        el.style.setProperty('--dur', `${0.4 + Math.random() * 0.55}s`);
        frag.appendChild(el);
    }

    for (let i = 0; i < rings; i++) {
        const el = document.createElement('span');
        el.className = 'star-duo-hint__pop-ring';
        const ox = 18 + Math.random() * 64;
        const oy = 22 + Math.random() * 56;
        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * 22;
        el.style.setProperty('--ox', `${ox}%`);
        el.style.setProperty('--oy', `${oy}%`);
        el.style.setProperty('--x', `${Math.cos(angle) * dist * (0.5 + Math.random())}px`);
        el.style.setProperty('--y', `${Math.sin(angle) * dist * (0.4 + Math.random() * 1.3)}px`);
        el.style.setProperty('--s', `${4 + Math.random() * 10}px`);
        el.style.setProperty('--d', `${Math.random() * 0.22}s`);
        el.style.setProperty('--dur', `${0.45 + Math.random() * 0.4}s`);
        frag.appendChild(el);
    }

    burst.appendChild(frag);
}

/** Много тонких молний/дуг — как ток по буквам. */
function spawnHintLightning() {
    const bolts = hintEl?.querySelector('.star-duo-hint__bolts');
    if (!bolts || activeView !== 'picker') return;
    bolts.replaceChildren();

    const frag = document.createDocumentFragment();
    const verticals = 14 + Math.floor(Math.random() * 10);
    const arcs = 10 + Math.floor(Math.random() * 8);

    for (let i = 0; i < verticals; i++) {
        const el = document.createElement('span');
        el.className = 'star-duo-hint__bolt';
        el.style.setProperty('--lx', `${6 + Math.random() * 88}%`);
        el.style.setProperty('--ly', `${8 + Math.random() * 35}%`);
        el.style.setProperty('--w', `${0.7 + Math.random() * 1.4}px`);
        el.style.setProperty('--h', `${18 + Math.random() * 38}%`);
        el.style.setProperty('--rot', `${-28 + Math.random() * 56}deg`);
        el.style.setProperty('--d', `${Math.random() * 0.45}s`);
        el.style.setProperty('--dur', `${0.55 + Math.random() * 0.5}s`);
        frag.appendChild(el);
    }

    for (let i = 0; i < arcs; i++) {
        const el = document.createElement('span');
        el.className = 'star-duo-hint__bolt star-duo-hint__bolt--arc';
        el.style.setProperty('--lx', `${4 + Math.random() * 88}%`);
        el.style.setProperty('--ly', `${28 + Math.random() * 44}%`);
        el.style.setProperty('--w', `${10 + Math.random() * 28}%`);
        el.style.setProperty('--h', `${0.7 + Math.random() * 1.1}px`);
        el.style.setProperty('--rot', `${-22 + Math.random() * 44}deg`);
        el.style.setProperty('--d', `${Math.random() * 0.4}s`);
        el.style.setProperty('--dur', `${0.45 + Math.random() * 0.45}s`);
        frag.appendChild(el);
    }

    bolts.appendChild(frag);
}

function startHintColorCycle() {
    if (!hintEl) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const HOLD_MS = 10000;
    const FIRST_DELAY_MS = 4000;
    const EXPLODE_MS = 950;
    const LIGHTNING_MS = 1050;

    /** @type {'red' | 'purple'} */
    let color = Math.random() < 0.5 ? 'red' : 'purple';
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    let paused = false;
    let generation = 0;

    hintEl.classList.toggle('star-duo-hint--red', color === 'red');
    hintEl.classList.toggle('star-duo-hint--purple', color === 'purple');
    hintEl.classList.remove('star-duo-hint--explode', 'star-duo-hint--lightning');
    clearHintFxLayers();

    function clearTimer() {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    async function flip() {
        if (paused || activeView !== 'picker') return;
        const gen = generation;
        const next = color === 'red' ? 'purple' : 'red';
        const fx = color === 'red' ? 'explode' : 'lightning';
        const fxMs = fx === 'explode' ? EXPLODE_MS : LIGHTNING_MS;

        if (!reduceMotion) {
            if (fx === 'explode') spawnHintExplosions();
            else spawnHintLightning();
            hintEl.classList.add(fx === 'explode' ? 'star-duo-hint--explode' : 'star-duo-hint--lightning');
            await wait(Math.round(fxMs * 0.32));
            if (paused || gen !== generation) return;
        }

        hintEl.classList.toggle('star-duo-hint--red', next === 'red');
        hintEl.classList.toggle('star-duo-hint--purple', next === 'purple');
        color = next;

        if (!reduceMotion) {
            await wait(Math.round(fxMs * 0.68));
            if (paused || gen !== generation) return;
            hintEl.classList.remove('star-duo-hint--explode', 'star-duo-hint--lightning');
            clearHintFxLayers();
        }

        if (!paused && activeView === 'picker') {
            timer = setTimeout(flip, HOLD_MS);
        }
    }

    function schedule(delay) {
        clearTimer();
        if (paused || activeView !== 'picker') return;
        timer = setTimeout(flip, delay);
    }

    hintCycleControls = {
        pause() {
            paused = true;
            generation += 1;
            clearTimer();
            hintEl.classList.remove('star-duo-hint--explode', 'star-duo-hint--lightning');
            clearHintFxLayers();
        },
        resume() {
            if (!paused && timer != null) return;
            paused = false;
            schedule(HOLD_MS);
        }
    };

    if (activeView === 'picker') {
        schedule(FIRST_DELAY_MS);
    } else {
        paused = true;
    }
}

(async function initStarDuo() {
    const saved = readSavedView();
    if (saved) {
        await openCharacter(saved);
    } else {
        await showPicker();
    }
    startHintColorCycle();
})();

window.addEventListener('hashchange', () => {
    const view = readSavedView();
    if (view) openCharacter(view);
    else showPicker();
});
