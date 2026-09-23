// Reference copy from the openwaters-analytics skill at taxonomy v2 (22 September 2026),
// used only by the parity tests. Deleted once the skill points at this package.
// src/lib/consent.ts. Open Waters consent store. Copied from the
// openwaters-analytics skill (references/advertising.md).
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  readConsent,
  track,
  type ConsentChoice,
} from "./analytics";

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
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: treat as refused. Nothing below grants anything.
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
const PLATFORM_COOKIES = [
  "_fbp", "_fbc",                      // Meta
  "_gcl_au", "_gcl_aw", "_gcl_dc",     // Google Ads
  "li_fat_id", "_li_ss",                // LinkedIn
  "_ttp", "_tt_enable_cookie",          // TikTok
];

function clearPlatformCookies(): void {
  const host = window.location.hostname;
  const domains = [host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of PLATFORM_COOKIES) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}
