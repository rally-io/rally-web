document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons immediately for statically rendered icons
    if (window.lucide) {
      lucide.createIcons();
    }
  
    // 2. Sticky Navbar scroll effect
    const navbar = document.getElementById('main-nav');
    if (navbar) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      });
    }
  
    // 3. Simple Scroll Animation Observer (alternative to AOS to keep dependencies minimal unless specified)
    // We search for elements with [data-aos]
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, ob) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
                ob.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-aos]').forEach(el => {
        observer.observe(el);
    });
  });
