// Shared theme helper: persists dark mode across pages using localStorage
(function () {
    const KEY = 'miniCapstone_darkMode';

    function applyTheme(isDark) {
        const root = document.body || document.documentElement;
        if (isDark) root.classList.add('dark-mode');
        else root.classList.remove('dark-mode');
    }

    // initialize
    const stored = localStorage.getItem(KEY);
    const isDark = stored === 'true';
    applyTheme(isDark);

    // expose a small API
    window.MiniCapstoneTheme = {
        isDark() { return localStorage.getItem(KEY) === 'true'; },
        setDark(v) {
            localStorage.setItem(KEY, v ? 'true' : 'false');
            applyTheme(v);
        },
        toggle() {
            const next = !this.isDark();
            this.setDark(next);
            return next;
        }
    };
})();
