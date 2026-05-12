const defaultAliases = {
    'yt': 'https://www.youtube.com/results?search_query=',
    'w': 'https://pl.wikipedia.org/wiki/Specjalna:Szukaj?search=',
    'r': 'https://www.reddit.com/search/?q=',
    'g': 'https://gemini.google.com/app?q=',
    'gpt': 'https://chatgpt.com/?q=',
    'ale': 'https://allegro.pl/listing?string=',
    'ali': 'https://pl.aliexpress.com/wholesale?SearchText=',
    'ama': 'https://www.amazon.pl/s?k='
};

const S = {
    city: 'Rawicz', format24: true, dateFormat: 'pl', showCity: false, greet: '',
    darkText: false, bgColor: '#000000', dim: 0, blur: 0, clockScale: 1, topbarScale: 1,
    bgData: null, bgType: null, forceBgClear: 0, glitchEffect: false, particlesBg: false,
    rageMode: false, workMode: false, blacklist: '',
    panicKey: '`', panicUrl: 'https://google.com',
    aliases: {}, clockColor: '#dddddd', topbarColor: '#666666', quoteColor: '#444444',
    rateType: 'hourly', rateValue: 50
};

let weatherData = { temp: '--', desc: 'offline' };
let currentWindowTree = []; 
let searchHistory = [];

let loadTime = Date.now();
let baseWastedMsToday = 0;
let baseWastedMsTotal = 0;

// Cichy zapis biedy co 3 sekundy
setInterval(() => {
    const sessionMs = Date.now() - loadTime;
    chrome.storage.local.set({
        wastedMsToday: baseWastedMsToday + sessionMs,
        wastedMsTotal: baseWastedMsTotal + sessionMs
    });
}, 3000);

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('blocked')) document.getElementById('blocked-alert').style.display = 'flex';

function updateSystemStats() {
    chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
        if (!response) return;
        document.getElementById('sys-stats').innerText = `CPU: ${response.cpu}% | RAM: ${response.ram}%`;
        document.getElementById('tab-count').innerText = `KARTY: ${response.tabs} | OKNA: ${response.windows}`;
        currentWindowTree = response.windowTree;
    });
}
setInterval(updateSystemStats, 2000); setTimeout(updateSystemStats, 500);

const tmModal = document.getElementById('tab-manager-modal');
const treeContainer = document.getElementById('tab-tree-container');

function renderTabTree() {
    let html = '';
    currentWindowTree.forEach((win, wIdx) => {
        html += `<div class="window-group"><div class="window-header"><span>OKNO ${wIdx + 1} (${win.tabs.length} KART)</span><button class="close-btn" data-type="window" data-id="${win.id}" title="Zamknij okno">X</button></div>`;
        win.tabs.forEach(tab => {
            html += `<div class="tab-item"><span class="tab-title" title="${tab.title}">${tab.active ? '👉 ' : ''}${tab.title}</span><button class="close-btn" data-type="tab" data-id="${tab.id}" title="Zamknij kartę">X</button></div>`;
        });
        html += `</div>`;
    });
    treeContainer.innerHTML = html;
}

document.getElementById('tab-control').addEventListener('click', () => { renderTabTree(); tmModal.classList.add('show'); });
document.getElementById('close-tm').addEventListener('click', () => tmModal.classList.remove('show'));
treeContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-btn')) {
        const id = parseInt(e.target.dataset.id);
        const type = e.target.dataset.type;
        if (type === 'tab') chrome.runtime.sendMessage({ action: "closeTab", tabId: id });
        if (type === 'window') chrome.runtime.sendMessage({ action: "closeWindow", windowId: id });
        e.target.closest(type === 'tab' ? '.tab-item' : '.window-group').style.display = 'none';
    }
});
document.getElementById('nuke-btn-real').addEventListener('click', () => {
    if (confirm("NA PEWNO KURWA?\nRozjebiesz wszystkie otwarte karty we wszystkich oknach, zniknie wszystko poza tą stroną.")) {
        chrome.runtime.sendMessage({ action: "nukeTabs" });
        tmModal.classList.remove('show');
    }
});

document.addEventListener('mousedown', (e) => {
    if (S.rageMode) {
        const target = e.target.closest('.rage-target');
        if (target) {
            target.classList.add('shattered'); document.body.classList.add('glitch');
            setTimeout(() => document.body.classList.remove('glitch'), 100);
        }
    }
});
setInterval(() => {
    if (S.glitchEffect && Math.random() > 0.95) { 
        document.body.classList.add('glitch'); setTimeout(() => document.body.classList.remove('glitch'), 200);
    }
}, 3000);

const pCanvas = document.getElementById('particles'); const pCtx = pCanvas ? pCanvas.getContext('2d') : null;
let particlesArr = []; let pAnimId;
function initParticles() {
    if (pAnimId) cancelAnimationFrame(pAnimId); 
    if (!S.particlesBg || !pCanvas) { if(pCanvas) pCanvas.style.display = 'none'; return; }
    pCanvas.style.display = 'block'; pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight;
    particlesArr = Array.from({length: 80}, () => ({ x: Math.random() * pCanvas.width, y: Math.random() * pCanvas.height, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, size: Math.random() * 2 }));
    animateParticles();
}
function animateParticles() {
    if(!S.particlesBg) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height); pCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    particlesArr.forEach(p => { p.x += p.vx; p.y += p.vy; if(p.x < 0 || p.x > pCanvas.width) p.vx *= -1; if(p.y < 0 || p.y > pCanvas.height) p.vy *= -1; pCtx.beginPath(); pCtx.arc(p.x, p.y, p.size, 0, Math.PI*2); pCtx.fill(); });
    pAnimId = requestAnimationFrame(animateParticles);
}

function renderTheme() {
    document.body.classList.toggle('dark-ui', S.darkText); document.body.style.backgroundColor = S.bgColor;
    const overlay = document.getElementById('bg-overlay');
    if (overlay) { overlay.style.backgroundColor = `rgba(0, 0, 0, ${S.dim / 10})`; overlay.style.backdropFilter = `blur(${S.blur}px)`; }
    document.getElementById('clock').style.color = S.clockColor || '#ddd';
    document.getElementById('motivational-quote').style.color = S.quoteColor || '#444';
    const topBar = document.getElementById('top-bar-container');
    if(topBar) { topBar.style.color = S.topbarColor || '#666'; topBar.querySelectorAll('span').forEach(span => span.style.color = S.topbarColor || '#666'); }
    document.getElementById('clock').style.fontSize = `calc(72px * ${S.clockScale})`;
    
    if (S.bgData) {
        const image = document.getElementById('bg-image'); const video = document.getElementById('bg-video');
        if (S.bgType === 'video') { video.src = S.bgData; video.style.display = 'block'; image.style.display = 'none'; }
        else { image.style.backgroundImage = `url('${S.bgData}')`; image.style.display = 'block'; video.style.display = 'none'; }
    }
    initParticles();
}

function renderTime() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').innerText = now.toLocaleDateString('pl-PL');
}

async function fetchWeather() {
    try {
        const res = await fetch(`https://wttr.in/${S.city}?format=j1`); const data = await res.json();
        weatherData.temp = data.current_condition[0].temp_C;
        weatherData.desc = data.current_condition[0].lang_pl ? data.current_condition[0].lang_pl[0].value : data.current_condition[0].weatherDesc[0].value;
        document.getElementById('weather').innerText = `${weatherData.temp}°C | ${weatherData.desc}`;
    } catch(e) {}
}

chrome.storage.local.get(null, (data) => {
    Object.assign(S, data);
    S.aliases = { ...defaultAliases, ...(data.aliases || {}) };
    
    baseWastedMsToday = data.wastedMsToday || 0;
    baseWastedMsTotal = data.wastedMsTotal || 0;
    searchHistory = data.searchHistory || [];
    loadTime = Date.now();
    
    renderTheme(); renderTime(); fetchWeather();
    setInterval(renderTime, 1000); setInterval(fetchWeather, 15 * 60 * 1000);
});

chrome.storage.onChanged.addListener((changes) => {
    let themeChanged = false;
    
    for (let key in changes) {
        S[key] = changes[key].newValue;
        // TU JEST FIX: ignorujemy zmiany w śmieciach, reagujemy tylko na wygląd
        if (!['wastedMsToday', 'wastedMsTotal', 'lastDate', 'scratchData', 'searchHistory'].includes(key)) {
            themeChanged = true;
        }
    }
    
    if(changes.aliases) S.aliases = { ...defaultAliases, ...changes.aliases.newValue };
    if (changes.wastedMsToday) { baseWastedMsToday = changes.wastedMsToday.newValue; loadTime = Date.now(); }
    if (changes.wastedMsTotal) { baseWastedMsTotal = changes.wastedMsTotal.newValue; }
    
    if (themeChanged) renderTheme();
});

const searchInput = document.getElementById('search');
const dropBox = document.getElementById('dropdown-box');

function renderSearchHistory() {
    const val = searchInput.value.toLowerCase().trim();
    const filtered = searchHistory.filter(q => q.toLowerCase().includes(val));
    
    if(filtered.length === 0) { dropBox.style.display = 'none'; return; }
    
    dropBox.innerHTML = filtered.map(q => 
        `<div class="dd-item" data-q="${q}">${q} <span class="del-hist" data-del="${q}">×</span></div>`
    ).join('');
    dropBox.style.display = 'block';
}

searchInput.addEventListener('focus', renderSearchHistory);
searchInput.addEventListener('input', renderSearchHistory);

document.addEventListener('click', (e) => {
    if(!e.target.closest('.search-container')) dropBox.style.display = 'none';
    
    if(e.target.classList.contains('dd-item')) {
        executeSearch(e.target.dataset.q);
    }
    if(e.target.classList.contains('del-hist')) {
        e.stopPropagation();
        const toDel = e.target.dataset.del;
        searchHistory = searchHistory.filter(item => item !== toDel);
        chrome.storage.local.set({ searchHistory });
        renderSearchHistory();
        searchInput.focus();
    }
});

function executeSearch(query) {
    if (!query) return;
    
    if (!query.startsWith('!')) {
        searchHistory.unshift(query);
        searchHistory = [...new Set(searchHistory)].slice(0, 15);
        chrome.storage.local.set({ searchHistory });
    }

    if (query.startsWith('!')) {
        const parts = query.split(' ');
        const cmd = parts[0].slice(1).toLowerCase();
        if (S.aliases[cmd]) { window.location.href = S.aliases[cmd] + encodeURIComponent(parts.slice(1).join(' ')); return; }
    }
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeSearch(e.target.value.trim()); });

const helpModal = document.getElementById('help-modal');
document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === 's' || k === '/') { e.preventDefault(); searchInput.focus(); }
    if (k === 'h' && helpModal && !tmModal.classList.contains('show')) { e.preventDefault(); helpModal.classList.toggle('show'); }
    if (k === 'escape') { if (helpModal) helpModal.classList.remove('show'); tmModal.classList.remove('show'); }
    if (e.key === S.panicKey) { e.preventDefault(); window.location.replace(S.panicUrl.startsWith('http') ? S.panicUrl : `https://${S.panicUrl}`); }
});

const helpBtn = document.getElementById('help-btn');
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => helpModal.classList.add('show'));
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.remove('show'); });
}

const pad = document.getElementById('scratchpad');
chrome.storage.local.get(['scratchData'], (d) => { if(d.scratchData) pad.value = d.scratchData; });
pad.addEventListener('input', (e) => { chrome.storage.local.set({ scratchData: e.target.value }); });

const quotes = [
    "Zrób coś pożytecznego.", "Ambicje popełniły samobójstwo?", "Wypierdalaj do pracy.", 
    "Internet cię nie potrzebuje.", "Bierz się za robotę, śmieciu.", "Kolejny dzień bycia gównem?",
    "Scrolluj dalej, na pewno od tego awansujesz.", "Miałeś plany, a znowu walisz w chuja.",
    "Twoje wymówki są żałosne.", "Pieniądze same się nie zarobią.", "Czekasz na cud? Cud nie przyjdzie.",
    "Robota leży, a ty gapisz się w ekran.", "Z takim podejściem zdechniesz w biedzie.",
    "Nie klikaj, tylko myśl.", "Każda sekunda tutaj to dowód na twoje lenistwo.",
    "Matka na pewno jest dumna z twojego scrollowania.", "Ile dzisiaj już przejebałeś czasu?",
    "Zamiast narzekać, zacznij zapierdalać.", "Kolejny zmarnowany dzień zaliczony.", "Wyłącz to i zrób coś ze swoim życiem."
];
document.getElementById('motivational-quote').innerText = quotes[Math.floor(Math.random() * quotes.length)];

function updateDoomBar() {
    const now = new Date(); const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msPassed = now - startOfDay; const totalMsInDay = 24 * 60 * 60 * 1000;
    const percentage = ((msPassed / totalMsInDay) * 100).toFixed(1);
    document.getElementById('doom-fill').style.width = percentage + '%';
    document.getElementById('doom-text').innerText = `ZMARNOWANO: ${percentage}% DNIA`;
}
setInterval(updateDoomBar, 1000); updateDoomBar();

const itemsData = [
    { name: "Guma kulka", price: 0.50 },
    { name: "Harnaś w puszce", price: 3.50 },
    { name: "Bilet ulgowy", price: 4.00 },
    { name: "Paczka fajek", price: 18.00 },
    { name: "Kebab u turka", price: 25.00 },
    { name: "Zgrzewka Monsterów", price: 50.00 },
    { name: "Miesiąc na siłowni", price: 120.00 },
    { name: "Dobra dziwka (godzina)", price: 250.00 },
    { name: "Gra AAA na premierę", price: 350.00 },
    { name: "Karta graficzna", price: 1500.00 },
    { name: "Używany Passat w gnoju", price: 4000.00 },
    { name: "MacBook Pro", price: 12000.00 },
    { name: "Kawalerka w Radomiu", price: 150000.00 },
    { name: "Nowe Porsche 911", price: 700000.00 },
    { name: "Kawalerka w Warszawie", price: 1000000.00 }
];

function updatePovertyCounter() {
    const rawVal = parseFloat(S.rateValue) || 50;
    const rate = S.rateType === 'monthly' ? (rawVal / 168) : rawVal; 
    
    document.getElementById('pov-rate-val').innerText = rate.toFixed(2);

    const sessionMs = Date.now() - loadTime;
    const totalMsToday = baseWastedMsToday + sessionMs;
    const totalMsOverall = baseWastedMsTotal + sessionMs;

    const msToMoney = rate / 3600000;
    const moneyToday = totalMsToday * msToMoney;
    const moneyTotal = totalMsOverall * msToMoney;

    document.getElementById('pov-today').innerText = moneyToday.toFixed(4) + " PLN";
    document.getElementById('pov-total').innerText = moneyTotal.toFixed(2) + " PLN";
    document.getElementById('pov-handle-text').innerText = "PRZEJEBANE: " + moneyTotal.toFixed(2) + " PLN";

    const list = document.getElementById('pov-list');
    list.innerHTML = '';
    
    const affordable = [...itemsData]
        .reverse()
        .map(item => ({ name: item.name, count: Math.floor(moneyToday / item.price) }))
        .filter(item => item.count > 0)
        .slice(0, 5);

    affordable.forEach(item => {
        list.innerHTML += `<li>${item.name} <span>x${item.count}</span></li>`;
    });
    
    if (list.innerHTML === '') {
        list.innerHTML = `<li style="color:#666; font-style:italic;">Na razie gówno. Oby tak dalej.</li>`;
    }
}
setInterval(updatePovertyCounter, 50);

const onboarding = document.getElementById('onboarding');
if (onboarding) {
    if (!localStorage.getItem('void_setup_done')) {
        setTimeout(() => { onboarding.style.opacity = '0'; setTimeout(() => onboarding.style.display = 'none', 1000); localStorage.setItem('void_setup_done', 'true'); }, 2000);
    } else onboarding.style.display = 'none';
}