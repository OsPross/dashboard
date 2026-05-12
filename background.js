let lastCpu = null;
let lastTick = Date.now();

// Kradniemy czas za każdym razem, gdy skrypt cokolwiek przetwarza
function stealTime() {
    const now = Date.now();
    const diff = now - lastTick;
    lastTick = now;

    // Naliczamy tylko, jeśli minęła minimum sekunda, ale mniej niż 6 godzin na raz
    // (żeby nie nabijało długu, jeśli fizycznie wyłączysz komputer lub zamkniesz Chrome'a całkowicie na noc)
    if (diff > 1000 && diff < 21600000) {
        chrome.storage.local.get(['wastedMsToday', 'wastedMsTotal', 'lastDate'], (d) => {
            const todayStr = new Date().toLocaleDateString();
            let msToday = d.wastedMsToday || 0;
            let msTotal = d.wastedMsTotal || 0;

            if (d.lastDate !== todayStr) msToday = 0; // Reset na nowy dzień

            msToday += diff;
            msTotal += diff;

            chrome.storage.local.set({ wastedMsToday: msToday, wastedMsTotal: msTotal, lastDate: todayStr });
        });
    }
}

// 1. Zwykła pętla - działa dopóki Chrome nie uśpi wtyczki w tle
setInterval(stealTime, 4000);

// 2. Podpięcie pod WSZYSTKO co robisz. Nawet jak skrypt uśnie podczas długiego czytania, 
// to kliknięcie w inną kartę lub okno go obudzi i doliczy cały czas z uśpienia.
chrome.tabs.onActivated.addListener(stealTime);
chrome.tabs.onUpdated.addListener(stealTime);
chrome.windows.onFocusChanged.addListener(stealTime);
chrome.runtime.onStartup.addListener(() => { lastTick = Date.now(); stealTime(); });

// 3. Budzik systemowy jako ostateczne zabezpieczenie (wymaga uprawnienia "alarms")
chrome.alarms.get("povertyTimer", (alarm) => {
    if (!alarm) chrome.alarms.create("povertyTimer", { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "povertyTimer") stealTime();
});

// Zablokowane strony
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.storage.local.get(['workMode', 'blacklist'], (data) => {
            if (data.workMode && data.blacklist) {
                const url = new URL(changeInfo.url);
                const isBlocked = data.blacklist.split(',').some(site => site.trim() !== '' && url.hostname.includes(site.trim()));
                if (isBlocked) {
                    chrome.tabs.update(tabId, { url: 'chrome://newtab?blocked=true' });
                }
            }
        });
    }
});

// Statystyki systemu i zarządzanie kartami
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getStats") {
        chrome.system.memory.getInfo(mem => {
            const used = mem.capacity - mem.availableCapacity;
            const memPct = ((used / mem.capacity) * 100).toFixed(0);

            chrome.system.cpu.getInfo(cpu => {
                let total = 0, idle = 0;
                cpu.processors.forEach(p => { total += p.usage.total; idle += p.usage.idle; });
                let cpuPct = 0;
                if (lastCpu) {
                    const dTotal = total - lastCpu.total;
                    const dIdle = idle - lastCpu.idle;
                    cpuPct = dTotal > 0 ? ((1 - dIdle / dTotal) * 100).toFixed(0) : 0;
                }
                lastCpu = { total, idle };
                
                chrome.windows.getAll({ populate: true }, (windows) => {
                    let tabCount = 0;
                    windows.forEach(w => tabCount += w.tabs.length);
                    sendResponse({ 
                        cpu: cpuPct, ram: memPct, 
                        tabs: tabCount, windows: windows.length, 
                        windowTree: windows 
                    });
                });
            });
        });
        return true; 
    }
    
    if (request.action === "closeTab") chrome.tabs.remove(request.tabId);
    if (request.action === "closeWindow") chrome.windows.remove(request.windowId);
    
    if (request.action === "nukeTabs") {
        chrome.tabs.query({}, (tabs) => {
            chrome.tabs.query({active: true, currentWindow: true}, (activeTabs) => {
                if (activeTabs.length > 0) {
                    const keepTabId = activeTabs[0].id;
                    tabs.forEach(tab => {
                        if (tab.id !== keepTabId) chrome.tabs.remove(tab.id);
                    });
                }
            });
        });
    }
});