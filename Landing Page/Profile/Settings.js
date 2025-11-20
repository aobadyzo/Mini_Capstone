window.addEventListener('scroll', function() {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});
document.querySelector('.settings-form').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Settings saved successfully!');
});
document.addEventListener('DOMContentLoaded', function(){
  try{
    const stored = localStorage.getItem('dark_mode_enabled');
    const isDark = stored === 'true';
    if(typeof applyDarkMode === 'function') applyDarkMode(isDark);
    if(typeof initDarkMode === 'function'){
      try{ initDarkMode(); }catch(e){  }
    }
    const toggle = document.getElementById('darkModeToggle');
    if(toggle){
      if (!toggle.getAttribute('role')) toggle.setAttribute('role','button');
      if (!toggle.hasAttribute('tabindex')) toggle.setAttribute('tabindex','0');
      toggle.addEventListener('click', function(evt){
        try{
          console.log('Settings: darkModeToggle clicked');
          if(typeof toggleDarkMode === 'function'){
            toggleDarkMode(evt);
          } else if(typeof applyDarkMode === 'function'){
            const nowDark = !document.body.classList.contains('dark-mode');
            applyDarkMode(nowDark);
          } else {
            const nowDark = !document.body.classList.contains('dark-mode');
            if(nowDark) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
            localStorage.setItem('dark_mode_enabled', nowDark ? 'true' : 'false');
          }
          try{ if(document.body.classList.contains('dark-mode')) toggle.classList.add('active'); else toggle.classList.remove('active'); }catch(e){}
        }catch(e){ console.warn('Error toggling dark mode (fallback):', e); }
      });
      if(document.body.classList.contains('dark-mode')) toggle.classList.add('active'); else toggle.classList.remove('active');
    }
  }catch(e){  }
});
