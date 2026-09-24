/**
 * Open Waters analytics in the browser: loads PostHog after the page is idle,
 * cookieless, and records clicks, forms and scroll depth with one set of
 * listeners on `document`, so a site only needs data attributes.
 *
 * Behaviour is the openwaters-analytics skill's reference `analytics.ts` at
 * taxonomy v2, with one change: the site's slug is passed to `initAnalytics`
 * instead of being edited into the file. Parity with the reference is tested.
 *
 * Importing this module loads nothing else: `posthog-js` is only ever fetched
 * through the dynamic import below, after the load event, and only when a key
 * and host are configured and the visitor has not objected.
 */
import type { PostHogInterface } from "posthog-js";

import {
  TAXONOMY_VERSION,
  type BrowserEvents,
  type PageType,
} from "./generated/contract.js";

export { TAXONOMY_VERSION };
export type {
  BrowserEvents,
  PageType,
  ServerEvents,
} from "./generated/contract.js";

type FormErrorType = BrowserEvents["form_error_shown"]["error_type"];

export interface AnalyticsConfig {
  /** The client's slug in the analytics app's registry, e.g. "luxury-gardens". */
  site: string;
  key: string | undefined;
  /** The managed reverse proxy, e.g. https://e.example.com */
  apiHost: string | undefined;
  /** true for client-side routing (Next.js), false for full page loads (Astro) */
  spa: boolean;
  /** Masks element text and attributes in autocapture. True for regulated clients */
  regulated: boolean;
  /**
   * Aggregate click and scroll heatmaps. Off unless exactly `true`.
   *
   * A per-client decision, never a default: aggregate heatmaps can fall under
   * the ICO's statistical purposes exception ("hits on sections of a page"),
   * but only viewed in aggregate, and the site's AGENTS.md must record why they
   * are on. See the openwaters-analytics skill. Replay is different in kind and
   * always needs consent; this does not touch it.
   */
  heatmaps?: boolean;
}

const MAX_QUEUED = 100;
const OBJECTION_KEY = "ow-analytics-objection";

// The consent store's shape. Written only on sites with a banner (the
// `/consent` entry point); read here so every event can carry ad_consent.
export const CONSENT_STORAGE_KEY = "ow-consent";
/** Bump when a category is added, so everyone is asked again. */
export const CONSENT_VERSION = 1;
/** The ICO suggests asking again after about six months. */
const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182;

export interface ConsentChoice {
  version: number;
  decidedAt: number;
  advertising: boolean;
  recordings: boolean;
}

/**
 * Latest `defaults` date posthog-js 1.433.10 accepts (its `ConfigDefaults`
 * type), checked when this package was created. Bump it in a release, not per
 * site, so every client runs the same PostHog behaviour.
 */
const POSTHOG_DEFAULTS = "2026-08-30";
const DEPTHS = [25, 50, 75, 100] as const;
const FILE_PATTERN = /\.(pdf|docx?|xlsx?|pptx?|zip|csv)$/i;

let enabled = false;
let site = "";
let client: PostHogInterface | null = null;
let queue: ((ph: PostHogInterface) => void)[] = [];

interface FormState {
  submitted: boolean;
  lastField: string | null;
  touched: Set<string>;
}
const forms = new Map<string, FormState>();
const depthsReached = new Set<number>();
let scrollFrame = false;

export function initAnalytics(config: AnalyticsConfig): void {
  const { key, apiHost } = config;
  if (typeof window === "undefined" || hasObjected()) return;
  if (enabled || !key || !apiHost) return;
  enabled = true;
  site = config.site;
  listen();

  const load = () => {
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: apiHost,
        ui_host: "https://eu.posthog.com",
        defaults: POSTHOG_DEFAULTS,
        cookieless_mode: "always",
        // No person profiles: these sites measure the site, not people.
        // Without this PostHog sends $set alongside events, which can create a
        // profile even though nobody is identified.
        person_profiles: "never",
        capture_pageview: config.spa ? "history_change" : true,
        capture_pageleave: true,
        disable_session_recording: true,
        // Always set, never left to PostHog: an explicit capture_heatmaps
        // decides, and the project's own heatmaps setting is only read when it
        // is unset (Heatmaps.isEnabled in posthog-js 1.433.10,
        // lib/src/heatmaps.js). So a project setting cannot switch heatmaps on
        // behind a site's back. `=== true`, because a setting read from an
        // environment variable arrives as a string, and "false" is truthy.
        capture_heatmaps: config.heatmaps === true,
        mask_all_text: config.regulated,
        mask_all_element_attributes: config.regulated,
        before_send: (event) => {
          if (event) {
            event.properties = {
              ...event.properties,
              site,
              taxonomy_version: TAXONOMY_VERSION,
              page_type: currentPageType(),
              ad_consent: adConsent(),
            };
          }
          return event;
        },
        loaded: (ph) => {
          client = ph;
          for (const send of queue) send(ph);
          queue = [];
        },
      });
    });
  };

  // Idle loading keeps PostHog off the critical path. The cost: a visitor who
  // leaves within the first second or two is not counted.
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(load, { timeout: 2000 });
    } else {
      setTimeout(load, 1000); // Browsers without requestIdleCallback.
    }
  };
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}

export function track<E extends keyof BrowserEvents>(
  event: E,
  properties: BrowserEvents[E],
  options: { beacon?: boolean } = {},
): void {
  if (!enabled) return;
  const send = (ph: PostHogInterface) => {
    ph.capture(
      event,
      properties,
      options.beacon ? { transport: "sendBeacon" } : undefined,
    );
  };
  if (client) send(client);
  else if (queue.length < MAX_QUEUED) queue.push(send);
}

export function hasObjected(): boolean {
  try {
    return localStorage.getItem(OBJECTION_KEY) === "1";
  } catch {
    return false;
  }
}

/** null means no choice, or one that has expired or predates the categories. */
export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const choice = JSON.parse(raw) as ConsentChoice;
    if (choice.version !== CONSENT_VERSION) return null;
    if (Date.now() - choice.decidedAt > CONSENT_MAX_AGE_MS) return null;
    return choice;
  } catch {
    return null;
  }
}

/** "unset" on every site without a banner, and for visitors yet to answer one. */
function adConsent(): "granted" | "denied" | "unset" {
  const choice = readConsent();
  if (!choice) return "unset";
  return choice.advertising ? "granted" : "denied";
}

/**
 * The privacy page's "don't measure my visit" control, which the ICO
 * statistical purposes exception requires. The choice is stored, which is the
 * only way to honour it, and the page reloads so PostHog either never loads or
 * loads fresh.
 */
export function setAnalyticsObjection(objected: boolean): void {
  try {
    if (objected) localStorage.setItem(OBJECTION_KEY, "1");
    else localStorage.removeItem(OBJECTION_KEY);
  } catch {
    // Storage blocked: the visitor's browser is already refusing storage.
  }
  window.location.reload();
}

/**
 * Consent only. Call when the visitor accepts the recordings category, and
 * stopRecording() when they withdraw. Prototype it per site first: PostHog
 * does not document replay in cookieless mode.
 */
export function startRecording(): void {
  if (!enabled) return;
  if (client) client.startSessionRecording();
  else queue.push((ph) => ph.startSessionRecording());
}

export function stopRecording(): void {
  client?.stopSessionRecording();
}

/** Call from the form's own code once the server confirms success. */
export function formSubmitted(formId: string): void {
  const state = forms.get(formId);
  if (state) state.submitted = true;
  track("form_submitted", { form_id: formId });
}

/** Call wherever a validation message is shown to the visitor. */
export function formErrorShown(
  formId: string,
  fieldName: string,
  errorType: FormErrorType,
): void {
  track("form_error_shown", {
    form_id: formId,
    field_name: fieldName,
    error_type: errorType,
  });
}

/** SPA only: call on every client-side route change. */
export function pageChanged(): void {
  flushAbandonedForms();
  depthsReached.clear();
}

function listen(): void {
  document.addEventListener("click", onClick, { capture: true, passive: true });
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("input", onInput);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pagehide", flushAbandonedForms);
}

function onClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const cta = event.target.closest<HTMLElement>("[data-cta]");
  if (cta?.dataset["cta"]) {
    track(
      "cta_clicked",
      {
        cta_id: cta.dataset["cta"],
        cta_text: ctaText(cta),
        cta_location: locationOf(cta),
      },
      { beacon: true },
    );
  }

  const link = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!link) return;

  const channel = contactChannel(link);
  if (channel) {
    track(
      "contact_link_clicked",
      { channel, cta_location: locationOf(link) },
      { beacon: true },
    );
    return;
  }

  if (link.hasAttribute("download") || FILE_PATTERN.test(link.pathname)) {
    const fileName = decodeURIComponent(link.pathname.split("/").pop() ?? "");
    track(
      "file_downloaded",
      {
        file_name: fileName,
        file_type: fileName.split(".").pop()?.toLowerCase() ?? "unknown",
      },
      { beacon: true },
    );
    return;
  }

  const isWeb = link.protocol === "https:" || link.protocol === "http:";
  if (isWeb && link.hostname !== window.location.hostname) {
    track(
      "outbound_link_clicked",
      { link_domain: link.hostname },
      { beacon: true },
    );
  }
}

/** Visible text, or the accessible name for an icon-only control. */
function ctaText(element: HTMLElement): string {
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  const label = (element.getAttribute("aria-label") ?? "").trim();
  return (text || label).slice(0, 80);
}

function contactChannel(
  link: HTMLAnchorElement,
): BrowserEvents["contact_link_clicked"]["channel"] | null {
  if (link.protocol === "tel:") return "phone";
  if (link.protocol === "mailto:") return "email";
  if (link.hostname === "wa.me" || link.hostname === "api.whatsapp.com") {
    return "whatsapp";
  }
  return null;
}

function locationOf(element: Element): string | undefined {
  const explicit = element.closest<HTMLElement>("[data-cta-location]");
  return explicit?.dataset["ctaLocation"] ?? element.closest("section[id]")?.id;
}

function currentPageType(): PageType {
  const value =
    document.querySelector<HTMLElement>("[data-page-type]")?.dataset[
      "pageType"
    ];
  return (value as PageType | undefined) ?? "other";
}

function trackedField(
  target: EventTarget | null,
): { formId: string; field: string | null } | null {
  if (!(target instanceof Element)) return null;
  const form = target.closest<HTMLFormElement>("form[data-form-id]");
  const formId = form?.dataset["formId"];
  if (!formId) return null;
  return { formId, field: target.getAttribute("name") };
}

function onFocusIn(event: FocusEvent): void {
  const hit = trackedField(event.target);
  if (!hit) return;
  let state = forms.get(hit.formId);
  if (!state) {
    state = { submitted: false, lastField: null, touched: new Set() };
    forms.set(hit.formId, state);
    track("form_started", { form_id: hit.formId });
  }
  if (hit.field) state.lastField = hit.field;
}

function onInput(event: Event): void {
  const hit = trackedField(event.target);
  if (!hit?.field) return;
  forms.get(hit.formId)?.touched.add(hit.field);
}

function flushAbandonedForms(): void {
  for (const [formId, state] of forms) {
    if (state.submitted) continue;
    track(
      "form_abandoned",
      {
        form_id: formId,
        last_field: state.lastField,
        fields_completed: state.touched.size,
      },
      { beacon: true },
    );
  }
  forms.clear();
}

function onScroll(): void {
  if (scrollFrame) return;
  scrollFrame = true;
  window.requestAnimationFrame(() => {
    scrollFrame = false;
    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const percent = (window.scrollY / scrollable) * 100;
    for (const depth of DEPTHS) {
      const reached = depth === 100 ? percent >= 99 : percent >= depth;
      if (reached && !depthsReached.has(depth)) {
        depthsReached.add(depth);
        track("scroll_depth_reached", { depth_percent: depth });
      }
    }
  });
}
