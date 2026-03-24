const siteConfig = {
  contact: {
    formsgUrl: "https://stormberry-contact-form.marcos-495.workers.dev",
    turnstileSiteKey: "0x4AAAAAACsqoaM-PpNxpS3n",
  }
};

let turnstileToken = '';

window.onloadTurnstileCallback = function () {
  const tContainer = document.getElementById('turnstile-container');
  if (tContainer && window.turnstile) {
    window.turnstile.render('#turnstile-container', {
      sitekey: siteConfig.contact.turnstileSiteKey,
      callback: function(token) {
        turnstileToken = token;
      },
      'expired-callback': function() {
        turnstileToken = '';
      },
      theme: 'light'
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navLinksA = document.querySelectorAll('.nav-links a');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      if (navLinks.classList.contains('active')) {
        mobileToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      } else {
        mobileToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
      }
    });

    navLinksA.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
      });
    });
  }

  // Navbar Scroll
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // Email Obfuscator
  const protectedEmails = document.querySelectorAll('.protected-email');
  protectedEmails.forEach(el => {
    const user = el.getAttribute('data-user');
    const domain = el.getAttribute('data-domain');
    if (user && domain) {
      const address = `${user}@${domain}`;
      el.href = `mailto:${address}`;
      if(el.innerHTML.trim() === '') {
        el.textContent = address;
      }
    }
  });

  // Contact Form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const submitBtn = contactForm.querySelector('.submit-btn');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!turnstileToken) {
        errorMessage.style.display = 'flex';
        return;
      }

      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Send Message...';
      successMessage.style.display = 'none';
      errorMessage.style.display = 'none';

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        service: document.getElementById('service').value,
        message: document.getElementById('message').value,
        sendCopy: document.getElementById('sendCopy').checked,
        'cf-turnstile-response': turnstileToken
      };

      try {
        const response = await fetch(siteConfig.contact.formsgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Network response was not ok');

        successMessage.style.display = 'flex';
        contactForm.reset();
        if (window.turnstile) window.turnstile.reset();
        turnstileToken = '';

      } catch (error) {
        console.error('Submission error:', error);
        errorMessage.style.display = 'flex';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});
