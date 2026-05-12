let pKey = '`';
let pUrl = 'https://google.com';

chrome.storage.local.get(['panicKey', 'panicUrl'], (data) => {
    if (data.panicKey) pKey = data.panicKey;
    if (data.panicUrl) pUrl = data.panicUrl;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.panicKey) pKey = changes.panicKey.newValue;
    if (changes.panicUrl) pUrl = changes.panicUrl.newValue;
});

document.addEventListener('keydown', (e) => {
    if (e.key === pKey) {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target.isContentEditable) return;
        
        e.preventDefault();
        window.location.replace(pUrl.startsWith('http') ? pUrl : `https://${pUrl}`);
    }
});

// --- Hack na auto-wysyłanie w Gemini ---
if (window.location.hostname === 'gemini.google.com') {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    if (query) {
        let attempts = 0;
        const interval = setInterval(() => {
            const editor = document.querySelector('.ql-editor[contenteditable="true"]');
            
            if (editor && editor.offsetParent !== null) {
                clearInterval(interval);
                editor.focus();
                
                document.execCommand('insertText', false, query);
                
                if (!editor.textContent.includes(query)) {
                    editor.innerHTML = `<p>${query}</p>`;
                }
                
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                const host = document.querySelector('rich-textarea');
                if (host) host.dispatchEvent(new Event('input', { bubbles: true }));

                setTimeout(() => {
                    const sendBtn = document.querySelector('button[aria-label*="Send"], button[aria-label*="Wyślij"], .send-button');
                    if (sendBtn && !sendBtn.disabled) {
                        sendBtn.click();
                    } else {
                        editor.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                        }));
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                }, 800); 
            }
            if (attempts++ > 60) clearInterval(interval);
        }, 200);
    }
}

// --- Hack na auto-wysyłanie w ChatGPT ---
if (window.location.hostname === 'chatgpt.com') {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    if (query) {
        let attempts = 0;
        const interval = setInterval(() => {
            // Szukamy edytora i przycisku wysyłania u szarego Sama Altmana
            const editor = document.querySelector('#prompt-textarea');
            const sendBtn = document.querySelector('button[data-testid="send-button"]');
            
            if (editor && sendBtn) {
                // Jak przycisk jest odblokowany (bo gpt sam wypełnił tekst z linku), to walimy w niego od razu
                if (!sendBtn.disabled) {
                    clearInterval(interval);
                    sendBtn.click();
                    window.history.replaceState({}, document.title, window.location.pathname);
                } 
                // A jak wisi puste, to rzeźbimy ręcznie
                else if (editor.innerHTML === '' || editor.value === '') {
                    clearInterval(interval);
                    editor.focus();
                    document.execCommand('insertText', false, query);
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    setTimeout(() => {
                        if (!sendBtn.disabled) sendBtn.click();
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }, 500);
                }
            }
            if (attempts++ > 60) clearInterval(interval);
        }, 200);
    }
}