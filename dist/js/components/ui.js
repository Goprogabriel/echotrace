export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    diagonal: '<path d="M5 19 19 5M5 5h14v14"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    file: '<path d="M14 2H5v20h14V7zM14 2v6h5M8 13h8m-8 4h5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    wave: '<path d="M2 12h3l2-8 4 16 3-13 3 5h5"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
    plane: '<path d="m21 3-6 18-4-8-8-4 18-6ZM11 13l5-5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/><rect x="9" y="9" width="6" height="6"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 10 9 5 9-5m-18 5 9 5 9-5"/>',
    reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
};
export function icon(name, cls = '') {
    return `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.wave}</svg>`;
}
export function logo() {
    return `<a href="#/" class="logo" aria-label="Echotrace — forside"><span class="brand-mark" aria-hidden="true"><svg width="38" height="38" viewBox="0 0 38 38" fill="none"><path class="brand-orbit" d="M29.7 9.7a14 14 0 1 0 0 18.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path class="brand-echo" d="M25.5 13.2a8.7 8.7 0 1 0 0 11.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path class="brand-wave" d="M10 19h4l2.5-7 4 14 3.5-18 3 15 2-4H34" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg></span><span class="brand-word">echo<span>trace</span></span></a>`;
}
export function header(lab = false) {
    return `<header class="site-header"><div class="header-inner">${logo()}<nav aria-label="Hovedmenu">${lab ? '<a href="#/" class="nav-back">Til forsiden</a><a href="#/method">Metoden</a>' : '<button data-scroll="how">Sådan virker det</button><a href="#/method">Metoden</a><a href="#/privacy">Privatliv</a>'}</nav><button class="btn btn-primary btn-small" data-action="upload">${icon('upload')}<span>Analyser video</span></button></div></header>`;
}
export function footer() {
    return `<footer class="site-footer">${logo()}<nav aria-label="Sideinformation"><a href="#/method">Metoden</a><a href="#/privacy">Privatliv</a><a href="https://github.com/Goprogabriel/echotrace" target="_blank" rel="noopener noreferrer">GitHub</a></nav></footer>`;
}
export function field(label, name, value, props = '', help = '') {
    return `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${props}>${help ? `<small>${help}</small>` : ''}</label>`;
}
export const seconds = (value) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
export const formatUTC = (t) => `${new Date(t * 1000).toLocaleString('da-DK', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC`;
export function startReveals(root = document) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    }), { threshold: .08 });
    root.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
}
