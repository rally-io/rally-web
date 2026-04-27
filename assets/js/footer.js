document.addEventListener('DOMContentLoaded', () => {
  const footerHTML = `
    <footer class="bg-slate-900 border-t border-white/10 pt-16 pb-8 mt-20">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <!-- Brand -->
          <div class="col-span-1 md:col-span-2">
            <a href="./index.html" class="flex items-center gap-2 mb-4">
              <img src="./assets/img/logo.jpeg" alt="Rally Logo" class="w-8 h-8 rounded-full object-cover">
              <span class="text-xl font-bold tracking-tight text-white">Rally</span>
            </a>
            <p class="text-gray-400 max-w-sm" data-i18n="hero.subheadline">
              Find courts, manage tournaments, and run your club in one comprehensive app.
            </p>
          </div>

          <!-- Links -->
          <div>
            <h3 class="text-white font-semibold mb-4 text-lg">מוצרים</h3>
            <ul class="space-y-3">
              <li><a href="./app.html" class="text-gray-400 hover:text-electric-green transition-colors" data-i18n="nav.app">App</a></li>
              <li><a href="./crm.html" class="text-gray-400 hover:text-electric-green transition-colors" data-i18n="nav.crm">CRM</a></li>
              <li><a href="./pricing.html" class="text-gray-400 hover:text-electric-green transition-colors" data-i18n="nav.pricing">Pricing</a></li>
            </ul>
          </div>

          <!-- Legal & Contact -->
          <div>
            <h3 class="text-white font-semibold mb-4 text-lg">מידע</h3>
            <ul class="space-y-3">
              <li><a href="./privacy.html" class="text-gray-400 hover:text-electric-green transition-colors" data-i18n="footer.privacy">Privacy Policy</a></li>
              <li><a href="./terms.html" class="text-gray-400 hover:text-electric-green transition-colors" data-i18n="footer.terms">Terms of Service</a></li>
              <li><a href="./contact.html" class="text-gray-400 hover:text-electric-green transition-colors" data-i18n="nav.contact">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div class="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-gray-500 text-sm">
            &copy; ${new Date().getFullYear()} <span data-i18n="footer.rights">All rights reserved Rally</span>.
          </p>
          <div class="flex gap-4">
            <a href="#" class="text-gray-400 hover:text-white transition-colors"><i data-lucide="twitter" class="w-5 h-5"></i></a>
            <a href="#" class="text-gray-400 hover:text-white transition-colors"><i data-lucide="instagram" class="w-5 h-5"></i></a>
            <a href="#" class="text-gray-400 hover:text-white transition-colors"><i data-lucide="linkedin" class="w-5 h-5"></i></a>
          </div>
        </div>
      </div>
    </footer>
  `;

  const placeholder = document.getElementById('footer-placeholder');
  if (placeholder) {
    placeholder.innerHTML = footerHTML;
    
    // Re-trigger icon rendering
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Apply translations
    if(window.applyTranslations) {
      window.applyTranslations();
    }
  }
});
