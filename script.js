"use strict";
/*! script.js is compiled from ts/script.ts by tools/build-ts.sh, which leaves out every
    comment but this one: the explanations are in the source. Edit ts/script.ts, never
    script.js: the build refuses to overwrite a hand edit, and its check mode fails on one. */
const siteConfig = {
    contact: {
        formsgUrl: "https://stormberry-contact-form.marcos-495.workers.dev",
        turnstileSiteKey: "0x4AAAAAACsqoaM-PpNxpS3n",
    }
};
const CONTACT_FORM_HOSTS = ['stormberry.as', 'www.stormberry.as'];
const contactFormLive = CONTACT_FORM_HOSTS.indexOf(window.location.hostname) !== -1;
let turnstileToken = '';
const TURNSTILE_API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
const TURNSTILE_WAIT_MS = 30000;
const TURNSTILE_START_EVENTS = ['focusin', 'input', 'change', 'click'];
let turnstileRequested = false;
let turnstileWaiters = [];
function showFormProblem() {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage)
        errorMessage.style.display = 'flex';
}
function settleTurnstileWaiters(token) {
    const waiters = turnstileWaiters;
    turnstileWaiters = [];
    waiters.forEach(function (resolve) { resolve(token); });
}
function startTurnstile() {
    if (!contactFormLive || turnstileRequested)
        return;
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
        script.remove();
        turnstileRequested = false;
        settleTurnstileWaiters('');
        showFormProblem();
    };
    document.head.appendChild(script);
}
function startTurnstileFromForm(event) {
    const target = event.target;
    if (!target || !target.closest)
        return;
    const selector = event.type === 'click' ? '#contact-form .submit-btn' : '#contact-form';
    if (target.closest(selector))
        startTurnstile();
}
if (contactFormLive) {
    TURNSTILE_START_EVENTS.forEach(function (type) {
        document.addEventListener(type, startTurnstileFromForm, true);
    });
}
function waitForTurnstileToken(ms) {
    if (turnstileToken)
        return Promise.resolve(turnstileToken);
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
    const render = function () {
        const tContainer = document.getElementById('turnstile-container');
        if (!tContainer || !window.turnstile || tContainer.dataset.rendered)
            return;
        tContainer.dataset.rendered = '1';
        window.turnstile.render('#turnstile-container', {
            sitekey: siteConfig.contact.turnstileSiteKey,
            callback: function (token) {
                turnstileToken = token;
                settleTurnstileWaiters(token);
            },
            'expired-callback': function () {
                turnstileToken = '';
            },
            theme: 'light'
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render, { once: true });
    }
    else {
        render();
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navLinksA = document.querySelectorAll('.nav-links a');
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            if (navLinks.classList.contains('active')) {
                mobileToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
            }
            else {
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
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            }
            else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    const protectedEmails = document.querySelectorAll('.protected-email');
    protectedEmails.forEach(el => {
        const user = el.getAttribute('data-user');
        const domain = el.getAttribute('data-domain');
        if (user && domain) {
            const address = `${user}@${domain}`;
            el.href = `mailto:${address}`;
            if (el.innerHTML.trim() === '') {
                el.textContent = address;
            }
        }
    });
    const contactForm = document.getElementById('contact-form');
    if (contactForm && !contactFormLive) {
        contactForm.style.display = 'none';
        const formPointer = document.getElementById('form-pointer');
        if (formPointer)
            formPointer.style.display = 'flex';
    }
    else if (contactForm) {
        const submitBtn = contactForm.querySelector('.submit-btn');
        const successMessage = document.getElementById('success-message');
        const errorMessage = document.getElementById('error-message');
        const waitMessage = document.getElementById('wait-message');
        let sending = false;
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (sending)
                return;
            sending = true;
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            successMessage.style.display = 'none';
            errorMessage.style.display = 'none';
            try {
                if (!turnstileToken) {
                    startTurnstile();
                    if (waitMessage)
                        waitMessage.style.display = 'flex';
                    await waitForTurnstileToken(TURNSTILE_WAIT_MS);
                    if (waitMessage)
                        waitMessage.style.display = 'none';
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
                if (!response.ok)
                    throw new Error('Network response was not ok');
                successMessage.style.display = 'flex';
                contactForm.reset();
                if (window.turnstile)
                    window.turnstile.reset();
                turnstileToken = '';
            }
            catch (error) {
                console.error('Submission error:', error);
                if (waitMessage)
                    waitMessage.style.display = 'none';
                errorMessage.style.display = 'flex';
                try {
                    if (window.turnstile)
                        window.turnstile.reset();
                }
                catch (err) { }
                turnstileToken = '';
            }
            finally {
                sending = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
    const videoThumbnails = document.querySelectorAll('.video-thumbnail-container');
    const videoModal = document.getElementById('video-modal');
    const modalVideoPlayer = document.getElementById('modal-video-player');
    const closeVideoModalBtn = document.getElementById('close-video-modal');
    if (videoThumbnails.length > 0 && videoModal && modalVideoPlayer) {
        videoThumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function () {
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
