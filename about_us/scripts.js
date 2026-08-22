const overlay = document.getElementById('overlay');
const minimizeBtn = document.getElementById('minimize');
const restoreBtn = document.getElementById('restore');
const langToggle = document.getElementById('langToggle');
const textAboutUsDiv = document.getElementById('textAboutUs');
document.getElementById("year").innerText = new Date().getFullYear();

let currentLang = getStoredLang();
langToggle.textContent = currentLang === 'RU' ? 'EN' : 'RU';
let peopleData = {};

async function loadLanguage(lang) {
    const fileName = lang.toLowerCase() + '.html';
    try {
        const response = await fetch(fileName);
        if (!response.ok) {
            console.error('Не удалось загрузить файл ' + fileName);
            return;
        }
        textAboutUsDiv.innerHTML = await response.text();

        peopleData = await loadPeopleData('');

        fillTitle(lang)
        fillSlot("poster", "poster-template");
        fillSlot("navigation", "navigation-template");
        fillSlot("27uvs-pic", "27uvs-pic-template");
        fillSlot("delta-pic", "delta-pic-template");
        fillSlot("raf-pic", "raf-pic-template");
        fillSlot("scripters", "scripters-template");
        fillSlot("editors", "editors-template");
        fillSlot("artists", "artists-template");
        fillSlot("partners", "partners-template");
        fillSlot("ex-participants", "ex-participants-template");

        const scriptersContainer = document.getElementById('scripters');
        const editorsContainer = document.getElementById('editors');
        const artistsContainer = document.getElementById('artists');
        const partnersContainer = document.getElementById('partners');
        const exParticipantsContainer = document.getElementById('ex-participants');

        renderPeople(scriptersContainer, editorsContainer, artistsContainer, partnersContainer, exParticipantsContainer)

    } catch (err) {
        console.error('Ошибка при загрузке языка:', err);
    }
}

function fillSlot(slotName, templateId) {
    const slot = textAboutUsDiv.querySelector(`[data-slot="${slotName}"]`);
    const tpl = document.getElementById(templateId);
    if (slot && tpl) {
        slot.replaceWith(tpl.content.cloneNode(true));
    }
}

const titles = {
    RU: "../images/titles/O_nas.webp",
    EN: "../images/titles/About_us.webp"
};

function fillTitle(lang) {
    const slot = document.querySelector('[data-i18n="title"]');
    if (!slot) return;

    const img = document.createElement("img");
    img.src = titles[lang];
    img.className = "image-title";
    slot.replaceWith(img);
}

loadLanguage(currentLang);

langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'RU' ? 'EN' : 'RU';
    langToggle.textContent = currentLang === 'RU' ? 'EN' : 'RU';
    setStoredLang(currentLang);
    loadLanguage(currentLang);
});

minimizeBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    restoreBtn.style.display = 'flex';
});

restoreBtn.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    restoreBtn.style.display = 'none';
});

function renderPeople(scriptersContainer, editorsContainer, artistsContainer, partnersContainer, exParticipantsContainer) {
    scriptersContainer.innerHTML = '';
    editorsContainer.innerHTML = '';
    artistsContainer.innerHTML = '';
    partnersContainer.innerHTML = '';
    exParticipantsContainer.innerHTML = '';

    renderGroup(peopleData.scripters, scriptersContainer);
    renderGroup(peopleData.editors, editorsContainer);
    renderArtists(peopleData.artists, artistsContainer);
    renderGroup(peopleData.partners, partnersContainer);
    renderGroup(peopleData.exparticipants, exParticipantsContainer);
}

const ARTIST_TYPE_COLUMNS = [
    { type: "all", ru: "Универсальные", en: "All-round" },
    { type: "comic", ru: "Иллюстраторы", en: "Illustrators" },
    { type: "orig", ru: "Авторские", en: "Original" },
    { type: "extra", ru: "Специфические", en: "Specific" }
];

function renderArtists(artists, container) {
    const lang = currentLang.toLowerCase();

    ARTIST_TYPE_COLUMNS.forEach(col => {
        const people = artists.filter(person => person.type === col.type);
        if (people.length === 0) return;

        const column = document.createElement("div");
        column.className = "artists-column";

        const title = document.createElement("h3");
        title.className = "artists-column-title";
        title.textContent = lang === "ru" ? col.ru : col.en;
        column.appendChild(title);

        const list = document.createElement("div");
        list.className = "artists-column-list";
        renderGroup(people, list);
        column.appendChild(list);

        container.appendChild(column);
    });
}

/** Avatars: images/people/ plus filename (one shared folder for all roles). */
function renderGroup(group, container) {
    group.forEach(person => {
        const card = document.createElement('div');
        card.className = 'person-group-card';

        const lang = currentLang.toLowerCase();
        const name = person[lang]?.name || person.en.name; // fallback на en
        const link = resolvePersonLink(person, lang);

        let extraTitle = "";
        if (person.id === "unknown_team") {
            extraTitle = (lang === "ru")
                ? "Отвечает за дизайн интерфейса сайта"
                : "Responsible for website interface design";
        }

        card.innerHTML = `
            <div class="person-group-icon">
                <a href="${link}" target="_blank">
                    <img src="../images/people/${person.image}" 
                         alt="${person.alt}"
                         ${extraTitle ? `title="${extraTitle}"` : ""}>
                </a>
            </div>
            <div class="person-group-text">
                <div class="person-group-name"><a href="${link}">${name}</a></div>
            </div>
        `;
        container.appendChild(card);
    });
}