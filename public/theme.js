// Tema da interface. É um script comum no <head> (e não um módulo) para rodar
// antes da primeira pintura, e usa localStorage porque chrome.storage é
// assíncrono: em ambos os casos a tela piscaria na cor errada ao abrir.
(() => {
  const KEY = 'ampulheta-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const listeners = new Set();

  function get() {
    try {
      return localStorage.getItem(KEY) ?? 'system';
    } catch {
      return 'system';
    }
  }

  function apply() {
    const theme = get();
    document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && system.matches));
    listeners.forEach((listener) => listener());
  }

  function set(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Sem armazenamento, o tema vale só até fechar a página.
    }
    apply();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  window.ampulhetaTheme = { get, set, subscribe };
  system.addEventListener('change', apply);
  addEventListener('storage', apply); // outras páginas da extensão abertas
  apply();
})();
