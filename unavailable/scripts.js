/**
 * Страница/блок «временно недоступно».
 *
 * Вставка вместо другой страницы:
 * 1) Оставьте title + .button-row целевой страницы, замените контент на
 *    <p id="unavailableMessage" class="unavailable-message"></p>,
 *    подключите ../css/unavailable.css и ../unavailable/scripts.js
 * 2) Или откройте /unavailable/?from=contents (или artworks, progress, …) —
 *    скрипт скопирует .image-title и .button-row с указанной страницы.
 */
const overlay = document.getElementById('overlay');
const minimizeBtn = document.getElementById('minimize');
const restoreBtn = document.getElementById('restore');
const langToggle = document.getElementById('langToggle');
const messageEl = document.getElementById('unavailableMessage');
const yearEl = document.getElementById('year');

if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}

const MESSAGES = {
    RU: 'СТРАНИЦА ВРЕМЕННО НЕДОСТУПНА. ПРОИЗОШЕЛ СБОЙ ДАННЫХ. ОЖИДАЙТЕ.\n...\n...\n...\nОЧЕНЬ ИНТЕРЕСНО',
    EN: 'THIS PAGE IS TEMPORARILY UNAVAILABLE. A DATA ERROR HAS OCCURRED. PLEASE WAIT.\n...\n...\n...\nVERY INTERESTING'
};

const WINGDINGS_MESSAGE =
    '❄︎☟︎✋︎💧︎ 🏱︎✌︎☝︎☜︎ ✋︎💧︎ ❄︎☜︎💣︎🏱︎⚐︎☼︎✌︎☼︎✋︎☹︎✡︎ 🕆︎☠︎✌︎✞︎✌︎✋︎☹︎✌︎👌︎☹︎☜︎📬︎ ✌︎ 👎︎✌︎❄︎✌︎ ☜︎☼︎☼︎⚐︎☼︎ ☟︎✌︎💧︎ ⚐︎👍︎👍︎🕆︎☼︎☼︎☜︎👎︎📬︎ 🏱︎☹︎☜︎✌︎💧︎☜︎ 🕈︎✌︎✋︎❄︎📬︎\n📬︎📬︎📬︎\n📬︎📬︎📬︎\n📬︎📬︎📬︎\n✞︎☜︎☼︎✡︎ ✋︎☠︎❄︎☜︎☼︎☜︎💧︎❄︎✋︎☠︎☝︎';

let currentLang = typeof getStoredLang === 'function' ? getStoredLang() : 'RU';
let isGlitching = false;
let glitchWaitTimer = null;
let glitchHoldTimer = null;

if (langToggle) {
    langToggle.textContent = currentLang === 'RU' ? 'EN' : 'RU';
}

function updateLanguageAssets() {
    document.querySelectorAll('.image-title[data-src-ru], .image-title[data-src-en]').forEach((img) => {
        const src = currentLang === 'RU' ? img.dataset.srcRu : img.dataset.srcEn;
        if (src) img.src = src;
    });
}

function playGlitchAnimation() {
    if (!messageEl) return;
    messageEl.classList.remove('unavailable-message--glitch');
    void messageEl.offsetWidth;
    messageEl.classList.add('unavailable-message--glitch');
}

function showNormalMessage() {
    if (!messageEl) return;
    isGlitching = false;
    messageEl.textContent = MESSAGES[currentLang];
    playGlitchAnimation();
}

function showWingdingsMessage() {
    if (!messageEl) return;
    isGlitching = true;
    messageEl.textContent = WINGDINGS_MESSAGE;
    playGlitchAnimation();
}

function clearGlitchTimers() {
    if (glitchWaitTimer != null) {
        clearTimeout(glitchWaitTimer);
        glitchWaitTimer = null;
    }
    if (glitchHoldTimer != null) {
        clearTimeout(glitchHoldTimer);
        glitchHoldTimer = null;
    }
}

function scheduleGlitch() {
    clearGlitchTimers();
    const waitMs = 10000 + Math.random() * 5000; // 10–15 s
    glitchWaitTimer = setTimeout(() => {
        showWingdingsMessage();
        const holdMs = 2000 + Math.random() * 1000; // 2–3 s
        glitchHoldTimer = setTimeout(() => {
            showNormalMessage();
            scheduleGlitch();
        }, holdMs);
    }, waitMs);
}

function resolveNavSource() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('from');
    if (fromQuery) return fromQuery.replace(/^\/+|\/+$/g, '');
    const fromData = document.body?.dataset?.navFrom;
    if (fromData) return fromData.replace(/^\/+|\/+$/g, '');
    return '';
}

async function adoptNavigationFrom(sourceKey) {
    const titleSlot = document.getElementById('unavailableTitleSlot');
    const navSlot = document.getElementById('unavailableNavSlot');
    if (!titleSlot && !navSlot) return;

    const sourceUrl = `../${sourceKey}/`;
    try {
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`nav source ${res.status}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const sourceRoot = doc.querySelector('.fixed-overlay') || doc.body;

        const remoteTitle = sourceRoot.querySelector('.image-title');
        if (titleSlot) {
            if (remoteTitle) {
                titleSlot.replaceWith(document.importNode(remoteTitle, true));
            } else {
                titleSlot.remove();
            }
        }

        const remoteNav = sourceRoot.querySelector('.button-row');
        if (navSlot && remoteNav) {
            navSlot.replaceWith(document.importNode(remoteNav, true));
        }

        const pageTitle = doc.querySelector('title')?.textContent?.trim();
        if (pageTitle) document.title = pageTitle;
    } catch (err) {
        console.error('Failed to copy navigation from', sourceKey, err);
    }
}

if (langToggle) {
    langToggle.addEventListener('click', () => {
        if (currentLang === 'RU') {
            currentLang = 'EN';
            langToggle.textContent = 'RU';
        } else {
            currentLang = 'RU';
            langToggle.textContent = 'EN';
        }
        if (typeof setStoredLang === 'function') setStoredLang(currentLang);
        updateLanguageAssets();
        if (!isGlitching) {
            messageEl.textContent = MESSAGES[currentLang];
        }
    });
}

if (minimizeBtn && overlay && restoreBtn) {
    minimizeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        restoreBtn.style.display = 'flex';
    });

    restoreBtn.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        restoreBtn.style.display = 'none';
    });
}

(async function initUnavailable() {
    const navFrom = resolveNavSource();
    if (navFrom) {
        await adoptNavigationFrom(navFrom);
    }
    updateLanguageAssets();
    if (messageEl) {
        messageEl.textContent = MESSAGES[currentLang];
        scheduleGlitch();
    }
})();
