const E = (id) => document.getElementById(id);

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        E(btn.dataset.tab).classList.add('active');
    });
});

function bindRealtime(id, key, type = 'value') {
    const el = E(id);
    if (!el) return;
    const eventType = (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'range' || el.type === 'color' || el.type === 'number')) ? 'input' : 'change';
    el.addEventListener(eventType, (e) => {
        const val = type === 'checked' ? e.target.checked : e.target.value;
        chrome.storage.local.set({ [key]: val });
    });
}

bindRealtime('city', 'city');
bindRealtime('format24', 'format24', 'checked');
bindRealtime('dim-slider', 'dim');
bindRealtime('blur-slider', 'blur');
bindRealtime('clock-scale', 'clockScale');
bindRealtime('topbar-scale', 'topbarScale');
bindRealtime('panic-key', 'panicKey');
bindRealtime('panic-url', 'panicUrl');
bindRealtime('rage-mode', 'rageMode', 'checked');
bindRealtime('work-mode', 'workMode', 'checked');
bindRealtime('blacklist', 'blacklist');
bindRealtime('glitch-effect', 'glitchEffect', 'checked');
bindRealtime('particles-bg', 'particlesBg', 'checked');

bindRealtime('clock-color', 'clockColor');
bindRealtime('topbar-color', 'topbarColor');
bindRealtime('quote-color', 'quoteColor');

bindRealtime('rate-type', 'rateType');
bindRealtime('rate-value', 'rateValue'); 

const swatches = document.querySelectorAll('.swatch');
swatches.forEach(s => s.addEventListener('click', (e) => {
    const hex = e.target.dataset.color;
    swatches.forEach(el => el.classList.remove('active'));
    e.target.classList.add('active');
    chrome.storage.local.set({ bgColor: hex });
}));

chrome.storage.local.get(null, (d) => {
    if (d.city !== undefined) E('city').value = d.city;
    if (d.format24 !== undefined) E('format24').checked = d.format24;
    if (d.dim !== undefined) E('dim-slider').value = d.dim;
    if (d.blur !== undefined) E('blur-slider').value = d.blur;
    if (d.clockScale !== undefined) E('clock-scale').value = d.clockScale;
    if (d.topbarScale !== undefined) E('topbar-scale').value = d.topbarScale;
    if (d.panicKey !== undefined) E('panic-key').value = d.panicKey;
    if (d.panicUrl !== undefined) E('panic-url').value = d.panicUrl;
    if (d.rageMode !== undefined) E('rage-mode').checked = d.rageMode;
    if (d.workMode !== undefined) E('work-mode').checked = d.workMode;
    if (d.blacklist !== undefined) E('blacklist').value = d.blacklist;
    if (d.glitchEffect !== undefined) E('glitch-effect').checked = d.glitchEffect;
    if (d.particlesBg !== undefined) E('particles-bg').checked = d.particlesBg;
    
    if (d.rateType !== undefined) E('rate-type').value = d.rateType;
    if (d.rateValue !== undefined) E('rate-value').value = d.rateValue;
    
    if (d.clockColor) E('clock-color').value = d.clockColor;
    if (d.topbarColor) E('topbar-color').value = d.topbarColor;
    if (d.quoteColor) E('quote-color').value = d.quoteColor;

    if (d.bgColor) {
        swatches.forEach(s => {
            if(s.dataset.color === d.bgColor) s.classList.add('active');
        });
    }
});

let fileData = null, fileType = null;
E('media-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return alert("Za duże pliki. Max 50MB.");
    const reader = new FileReader();
    reader.onload = (ev) => {
        fileData = ev.target.result;
        fileType = file.type.startsWith('video') ? 'video' : 'image';
        document.querySelector('.file-btn').innerText = "Załadowano. Zapisz.";
    };
    reader.readAsDataURL(file);
});

E('clear-bg').addEventListener('click', () => {
    chrome.storage.local.remove(['bgData', 'bgType'], () => {
        fileData = null; fileType = null;
        document.querySelector('.file-btn').innerText = "Wgraj Plik";
        chrome.storage.local.set({ forceBgClear: Date.now() });
    });
});

E('save').addEventListener('click', () => {
    if (fileData) chrome.storage.local.set({ bgData: fileData, bgType: fileType });
    E('save').innerText = 'Zapisano';
    setTimeout(() => E('save').innerText = 'Zapisz Ustawienia', 1000);
});

// LOGIKA RESETU BIEDY
E('reset-poverty').addEventListener('click', () => {
    if (confirm("NA PEWNO KURWA?\nChcesz wyczyścić sumienie i udawać, że nie przejebałeś tego czasu? Hajs zostanie wyzerowany.")) {
        chrome.storage.local.set({
            wastedMsToday: 0,
            wastedMsTotal: 0,
            lastDate: new Date().toLocaleDateString()
        });
        const btn = E('reset-poverty');
        btn.innerText = "Wyzerowano!";
        setTimeout(() => btn.innerText = "Wyzeruj Hajs (Rozgrzeszenie)", 2000);
    }
});

let aliases = {};
function renderAliases() {
    const list = E('aliases-list');
    list.innerHTML = '';
    for (let key in aliases) {
        list.innerHTML += `<div class="alias-item"><span style="color:#fff;font-weight:bold;">!${key}</span> <span style="color:#888;overflow:hidden;text-overflow:ellipsis;">${aliases[key]}</span> <button class="del-alias" data-key="${key}">x</button></div>`;
    }
    document.querySelectorAll('.del-alias').forEach(btn => {
        btn.addEventListener('click', (e) => {
            delete aliases[e.target.dataset.key];
            chrome.storage.local.set({ aliases });
            renderAliases();
        });
    });
}

chrome.storage.local.get(['aliases'], (d) => {
    aliases = d.aliases || {};
    renderAliases();
});

E('add-alias-btn').addEventListener('click', () => {
    const c = E('new-alias-cmd').value.trim().toLowerCase();
    const u = E('new-alias-url').value.trim();
    if (c && u) {
        aliases[c] = u; chrome.storage.local.set({ aliases });
        E('new-alias-cmd').value = ''; E('new-alias-url').value = '';
        renderAliases();
    }
});