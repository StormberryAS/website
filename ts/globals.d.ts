// Types for the globals the site's scripts share with the page and with Cloudflare Turnstile.
// Type information only: nothing in this file is compiled into script.js or calendar.js.
//
// Only the parts of Turnstile's api.js that script.ts uses are described here, after
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/ .

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

interface Turnstile {
  // Returns the widget id (undefined when the container is not found).
  render(container: string | HTMLElement, options: TurnstileRenderOptions): string | undefined;
  reset(widgetId?: string): void;
}

interface Window {
  // Set by Turnstile's api.js once it has loaded; absent until then.
  turnstile?: Turnstile;
  // Defined by script.ts; api.js calls it by name (the ?onload= parameter of its URL).
  onloadTurnstileCallback: () => void;
}
