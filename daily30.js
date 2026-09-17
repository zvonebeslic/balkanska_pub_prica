/* KvizToGo loader: zadrzava Dnevnih 30 i ABC integraciju. */
document.write('<script src="daily30-core.js?v=20260917-1"><\/script><script src="abc-integration.js?v=20260917-1"><\/script>');

/*
 * Online-kviz safety bootstrap.
 * Ovaj file se ucitava prije glavnog inline JS-a, pa njegov DOMContentLoaded
 * listener ulazi u red prije glavnog INIT listenera. Time osnovni gumbi dobiju
 * handlere cak i ako neka druga inicijalizacija stranice kasnije baci gresku.
 */
document.addEventListener('DOMContentLoaded', function () {
  document.documentElement.classList.remove('kviz-initial-loading');

  var initializers = [
    'initModeSwitch',
    'initThemedUI',
    'initAbcUI',
    'initButtons'
  ];

  initializers.forEach(function (name) {
    try {
      if (typeof window[name] === 'function') window[name]();
    } catch (err) {
      console.error('[KvizToGo bootstrap] ' + name + ' failed:', err);
    }
  });

  /* Profil/avatar mora ostati klikabilan neovisno o ostatku INIT-a. */
  var profileBtn = document.getElementById('profile-button') ||
                   document.getElementById('profile-btn') ||
                   document.querySelector('.login-btn');
  if (profileBtn && !profileBtn.dataset.kvizFallbackBound) {
    profileBtn.dataset.kvizFallbackBound = '1';
    profileBtn.addEventListener('click', function () {
      try {
        if (typeof window.openProfile === 'function') {
          window.openProfile();
        }
      } catch (err) {
        console.error('[KvizToGo bootstrap] profile failed:', err);
      }
    });
  }
}, { once: true });
