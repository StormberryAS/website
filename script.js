const siteConfig = {
  contact: {
    formsgUrl: "https://stormberry-contact-form.marcos-495.workers.dev",
    turnstileSiteKey: "0x4AAAAAACsqoaM-PpNxpS3n",
  }
};

let turnstileToken = '';

// Turnstile starts only once someone begins using the contact form. A visitor who
// only reads the page loads nothing from challenges.cloudflare.com and gets no
// Turnstile storage. The privacy policy (section 6) promises exactly this, so do
// not put a static api.js tag back in the page head.
// CSP: script-src and frame-src already allow https://challenges.cloudflare.com,
// and a script element added from here is checked against the same list.
const TURNSTILE_API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
// How long Send waits for a token that is still on its way (an interactive
// challenge needs a click, so leave room for a person to do it).
const TURNSTILE_WAIT_MS = 30000;
const TURNSTILE_START_EVENTS = ['focusin', 'input', 'change'];
let turnstileRequested = false;
let turnstileWaiters = [];

function settleTurnstileWaiters(token) {
  const waiters = turnstileWaiters;
  turnstileWaiters = [];
  waiters.forEach(function (resolve) { resolve(token); });
}

function startTurnstile() {
  if (turnstileRequested) return;
  turnstileRequested = true;
  TURNSTILE_START_EVENTS.forEach(function (type) {
    document.removeEventListener(type, startTurnstileFromForm, true);
  });
  if (window.turnstile) {
    window.onloadTurnstileCallback();
    return;
  }
  const script = document.createElement('script');
  script.src = TURNSTILE_API_URL;
  script.async = true;
  script.onerror = function () {
    // Blocked or offline: let the next Send try again, and release anyone waiting.
    script.remove();
    turnstileRequested = false;
    settleTurnstileWaiters('');
  };
  document.head.appendChild(script);
}

function startTurnstileFromForm(event) {
  const target = event.target;
  if (target && target.closest && target.closest('#contact-form')) startTurnstile();
}

// Listening on the document (capture phase) catches the first focus or keystroke
// in the form even if it happens before DOMContentLoaded.
TURNSTILE_START_EVENTS.forEach(function (type) {
  document.addEventListener(type, startTurnstileFromForm, true);
});

function waitForTurnstileToken(ms) {
  if (turnstileToken) return Promise.resolve(turnstileToken);
  return new Promise(function (resolve) {
    const done = function (token) {
      clearTimeout(timer);
      resolve(token);
    };
    const timer = setTimeout(function () {
      turnstileWaiters = turnstileWaiters.filter(function (w) { return w !== done; });
      resolve('');
    }, ms);
    turnstileWaiters.push(done);
  });
}

window.onloadTurnstileCallback = function () {
  // api.js is async, so it can finish before the form below is parsed (Rocket Loader
  // used to hide this by delaying every script). Render once the container exists.
  const render = function () {
    const tContainer = document.getElementById('turnstile-container');
    if (!tContainer || !window.turnstile || tContainer.dataset.rendered) return;
    tContainer.dataset.rendered = '1';
    window.turnstile.render('#turnstile-container', {
      sitekey: siteConfig.contact.turnstileSiteKey,
      callback: function(token) {
        turnstileToken = token;
        settleTurnstileWaiters(token);
      },
      'expired-callback': function() {
        turnstileToken = '';
      },
      theme: 'light'
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
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
    const waitMessage = document.getElementById('wait-message');
    let sending = false;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;
      sending = true;

      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      successMessage.style.display = 'none';
      errorMessage.style.display = 'none';

      try {
        if (!turnstileToken) {
          // Someone quick, or a browser that never fired focusin, can press Send
          // before Turnstile has a token. Start it if needed, say so, and wait.
          startTurnstile();
          if (waitMessage) waitMessage.style.display = 'flex';
          await waitForTurnstileToken(TURNSTILE_WAIT_MS);
          if (waitMessage) waitMessage.style.display = 'none';
          if (!turnstileToken) {
            errorMessage.style.display = 'flex';
            return;
          }
        }

        submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Send Message...';

        const formData = {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          service: document.getElementById('service').value,
          // Optional "How did you hear about us?"; empty when not chosen.
          source: document.getElementById('source') ? document.getElementById('source').value : '',
          message: document.getElementById('message').value,
          sendCopy: document.getElementById('sendCopy').checked,
          'cf-turnstile-response': turnstileToken
        };

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
        if (waitMessage) waitMessage.style.display = 'none';
        errorMessage.style.display = 'flex';
      } finally {
        sending = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }

  // Video Modal Logic
  const videoThumbnails = document.querySelectorAll('.video-thumbnail-container');
  const videoModal = document.getElementById('video-modal');
  const modalVideoPlayer = document.getElementById('modal-video-player');
  const closeVideoModalBtn = document.getElementById('close-video-modal');

  if (videoThumbnails.length > 0 && videoModal && modalVideoPlayer) {
    videoThumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', function() {
        const videoSrc = this.getAttribute('data-video-src');
        if (videoSrc) {
          modalVideoPlayer.src = videoSrc;
          videoModal.classList.add('active');
          modalVideoPlayer.play();
        }
      });
    });

    const closeModal = () => {
      videoModal.classList.remove('active');
      modalVideoPlayer.pause();
      modalVideoPlayer.src = '';
    };

    closeVideoModalBtn.addEventListener('click', closeModal);
    
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && videoModal.classList.contains('active')) {
        closeModal();
      }
    });
  }
});
