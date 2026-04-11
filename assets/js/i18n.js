const defaultLang = 'he';
const supportedLangs = ['he', 'en'];

// Load language preference or set default
let currentLang = localStorage.getItem('rallyLang') || defaultLang;

// Caches for the dictionaries
const i18nCache = {};

async function loadTranslations(lang) {
  if (i18nCache[lang]) return i18nCache[lang];
  try {
    const response = await fetch(`/assets/locales/${lang}.json`);
    const data = await response.json();
    i18nCache[lang] = data;
    return data;
  } catch (error) {
    console.error(`Could not load translations for lang ${lang}`, error);
    return null;
  }
}

function updateDOM(translations) {
  if (!translations) return;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const keyString = el.getAttribute('data-i18n');
    const keys = keyString.split('.');
    
    // Traverse the nested JSON
    let text = translations;
    for (const key of keys) {
      text = text ? text[key] : null;
    }
    
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });
}

function setDocumentLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

async function changeLanguage(lang) {
  if (!supportedLangs.includes(lang)) lang = defaultLang;
  currentLang = lang;
  localStorage.setItem('rallyLang', lang);
  setDocumentLang(lang);
  
  const translations = await loadTranslations(lang);
  updateDOM(translations);

  // Update toggle buttons if they exist
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.textContent = lang === 'he' ? 'EN | עב' : 'עב | EN';
    btn.dataset.targetLang = lang === 'he' ? 'en' : 'he';
  });
}

// Ensure translation runs when components (like nav or footer) are dynamically injected
window.applyTranslations = async function() {
  const translations = await loadTranslations(currentLang);
  updateDOM(translations);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  changeLanguage(currentLang);
});
