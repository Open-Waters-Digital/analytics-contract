/**
 * The consent store, for sites with a consent banner: recording a visitor's
 * choice per category, running consent-gated code (ad platforms, replay) only
 * once it is granted, and cleaning up when it is withdrawn.
 *
 * Behaviour is the consent store in the openwaters-analytics skill's
 * `references/advertising.md`, with two corrections:
 *
 * - When storage is blocked the choice cannot be kept, so it is treated as
 *   refused: no consent-gated code runs. The reference still ran listeners.
 * - Withdrawal clears platform cookies on every parent domain of the host. The
 *   reference used the last two labels, which on `www.example.co.uk` is
 *   `.co.uk` and misses `.example.co.uk`, where the platforms set them.
 *
 * Reading a stored choice lives in `/browser`, because every event carries
 * `ad_consent`; this module adds writing, listening and clean-up.
 */
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  readConsent,
  track,
  type ConsentChoice,
} from "./browser.js";

export { readConsent, type ConsentChoice };

export type ConsentCategory = "advertising" | "recordings";

type Listener = (choice: ConsentChoice) => void;
const listeners = new Set<Listener>();

export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

/**
 * Record a choice from the banner or the settings control. Withdrawing a
 * category that was granted reloads the page, because a loaded pixel cannot
 * be reliably unloaded.
 */
export function saveConsent(
  choice: Omit<ConsentChoice, "version" | "decidedAt">,
  source: "banner" | "settings",
): void {
  const previous = readConsent();
  const next: ConsentChoice = {
    ...choice,
    version: CONSENT_VERSION,
    decidedAt: Date.now(),
  };
  let stored = true;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    stored = false;
  }
  track("consent_updated", {
    advertising: next.advertising,
    recordings: next.recordings,
    source,
  });

  const withdrew =
    (previous?.advertising && !next.advertising) ||
    (previous?.recordings && !next.recordings);
  if (withdrew) {
    clearPlatformCookies();
    window.location.reload();
    return;
  }
  // A choice that could not be stored is not a choice that can be honoured
  // later, so nothing is granted on the strength of it.
  if (!stored) return;
  for (const listener of listeners) listener(next);
}

/** Runs now if already granted, otherwise when the visitor grants it. */
export function onConsent(category: ConsentCategory, run: () => void): void {
  if (hasConsent(category)) {
    run();
    return;
  }
  const listener: Listener = (choice) => {
    if (choice[category]) {
      listeners.delete(listener);
      run();
    }
  };
  listeners.add(listener);
}

/** First-party cookies the supported platforms set. Extend when adding one. */
export const PLATFORM_COOKIES = [
  // Meta
  "_fbp",
  "_fbc",
  // Google Ads
  "_gcl_au",
  "_gcl_aw",
  "_gcl_dc",
  // LinkedIn
  "li_fat_id",
  "_li_ss",
  // TikTok
  "_ttp",
  "_tt_enable_cookie",
] as const;

/**
 * Every domain a cookie for this host could have been set on: the host itself,
 * and each parent. Browsers ignore the ones that are public suffixes, so there
 * is no need to know the suffix list.
 */
export function cookieDomains(host: string): string[] {
  const labels = host.split(".");
  const domains: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join(".");
    domains.push(domain, `.${domain}`);
  }
  return domains;
}

function clearPlatformCookies(): void {
  const domains = cookieDomains(window.location.hostname);
  for (const name of PLATFORM_COOKIES) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}
