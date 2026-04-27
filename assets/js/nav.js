document.addEventListener('DOMContentLoaded', () => {
  const navHTML = `
    <nav id="main-nav" class="fixed w-full z-50 transition-all duration-300 py-4">
      <div class="container mx-auto px-4 flex justify-between items-center">
        <!-- Logo -->
        <a href="./index.html" class="flex items-center gap-2 group">
          <img src="./assets/img/logo.jpeg" alt="Rally Logo" class="w-10 h-10 rounded-full group-hover:scale-110 transition-transform object-cover">
          <span class="text-2xl font-bold tracking-tight text-white">Rally</span>
        </a>
        
        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center gap-8">
          <a href="./app.html" class="text-gray-300 hover:text-white transition-colors" data-i18n="nav.app">App</a>
          <a href="./crm.html" class="text-gray-300 hover:text-white transition-colors" data-i18n="nav.crm">CRM</a>
          <a href="./level.html" class="text-gray-300 hover:text-white transition-colors" data-i18n="nav.level">Level</a>
          <a href="./pricing.html" class="text-gray-300 hover:text-white transition-colors" data-i18n="nav.pricing">Pricing</a>
          <a href="./contact.html" class="text-gray-300 hover:text-white transition-colors" data-i18n="nav.contact">Contact</a>
        </div>

        <!-- Right / Language details -->
        <div class="flex items-center gap-4">
          <button class="lang-toggle text-sm font-medium border border-gray-600 rounded-full px-4 py-1.5 hover:bg-gray-800 transition-colors text-white">
            EN | עב
          </button>
          
          <!-- Mobile Menu Button -->
          <button id="mobile-menu-btn" class="md:hidden text-gray-300 hover:text-white focus:outline-none">
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
        </div>
      </div>
      
      <div id="mobile-menu" class="hidden md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-white/10 flex-col items-center py-4 space-y-4 shadow-lg backdrop-blur-md">
        <a href="./app.html" class="text-gray-300 hover:text-white text-lg" data-i18n="nav.app">App</a>
        <a href="./crm.html" class="text-gray-300 hover:text-white text-lg" data-i18n="nav.crm">CRM</a>
        <a href="./level.html" class="text-gray-300 hover:text-white text-lg" data-i18n="nav.level">Level</a>
        <a href="./pricing.html" class="text-gray-300 hover:text-white text-lg" data-i18n="nav.pricing">Pricing</a>
        <a href="./contact.html" class="text-gray-300 hover:text-white text-lg" data-i18n="nav.contact">Contact</a>
      </div>
    </nav>
  `;

  const placeholder = document.getElementById('navbar-placeholder');
  if (placeholder) {
    placeholder.innerHTML = navHTML;
    
    // Setup mobile menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      mobileMenu.classList.toggle('flex');
    });

    // Language toggle event listeners
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target.dataset.targetLang;
        if(window.changeLanguage && target) {
           window.changeLanguage(target);
        }
      });
    });

    // Re-trigger icon rendering
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Apply translations now that nav is in DOM
    if(window.applyTranslations) {
      window.applyTranslations();
    }
  }
});
