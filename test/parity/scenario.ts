/**
 * One scenario, run against the skill's reference `analytics.ts` and against
 * `src/browser.ts` in separate test files (each gets its own document, since
 * both attach listeners to it). Both must produce `EXPECTED` exactly, which is
 * what "behaviour matches the reference" means.
 */
import { vi } from "vitest";

import { setScroll, type Recorder } from "./harness.js";

/** The surface both implementations share. */
export interface BrowserModule {
  initAnalytics(config: {
    site: string;
    key: string | undefined;
    apiHost: string | undefined;
    spa: boolean;
    regulated: boolean;
  }): void;
  formSubmitted(formId: string): void;
  formErrorShown(
    formId: string,
    fieldName: string,
    errorType: "required" | "format" | "too_long" | "server",
  ): void;
  pageChanged(): void;
}

export const PAGE = `
  <main data-page-type="service">
    <section id="hero">
      <a href="/consultation" data-cta="hero-book-call">  Book a
        call </a>
      <button type="button" data-cta="menu-open" aria-label="Open menu"><svg></svg></button>
    </section>
    <section id="contact">
      <a href="mailto:studio@example.com">Email</a>
      <a href="https://wa.me/447000000000">WhatsApp</a>
      <a href="/files/Garden%20Brochure.PDF">Brochure</a>
      <a href="/plan.txt" download>Plan</a>
      <a href="https://partner.example.org/work?ref=site">Partner</a>
      <a href="/about-us">About</a>
      <form data-form-id="contact">
        <input name="name" />
        <input name="email" />
        <input />
      </form>
    </section>
    <footer data-cta-location="footer"><a href="tel:+441892000000">Call</a></footer>
  </main>
`;

const $ = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
};

export async function runScenario(
  mod: BrowserModule,
  recorder: Recorder,
): Promise<void> {
  document.body.innerHTML = PAGE;
  mod.initAnalytics({
    site: "replace-me",
    key: "phc_test",
    apiHost: "https://e.example.com",
    spa: true,
    regulated: false,
  });

  // Before PostHog has loaded: queued, then sent once it has.
  $<HTMLElement>("[data-cta=hero-book-call]").click();
  await vi.waitFor(() => {
    if (!recorder.config) throw new Error("not loaded");
  });

  $<HTMLElement>("[data-cta=menu-open]").click();
  $<HTMLElement>("footer a").click();
  $<HTMLElement>("a[href^=mailto]").click();
  $<HTMLElement>("a[href*='wa.me']").click();
  $<HTMLElement>("a[href$='.PDF']").click();
  $<HTMLElement>("a[download]").click();
  $<HTMLElement>("a[href^='https://partner']").click();
  $<HTMLElement>("a[href='/about-us']").click();

  setScroll(600);
  setScroll(1000);
  setScroll(1000);

  const name = $<HTMLInputElement>("input[name=name]");
  const email = $<HTMLInputElement>("input[name=email]");
  name.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  name.dispatchEvent(new Event("input", { bubbles: true }));
  email.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  $<HTMLInputElement>("form input:not([name])").dispatchEvent(
    new FocusEvent("focusin", { bubbles: true }),
  );
  mod.formErrorShown("contact", "email", "format");
  window.dispatchEvent(new Event("pagehide"));

  // A client-side route change: the form starts again and is sent this time.
  mod.pageChanged();
  name.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  mod.formSubmitted("contact");
  mod.pageChanged();

  // A visitor on a site with a banner, who accepted advertising.
  localStorage.setItem(
    "ow-consent",
    JSON.stringify({
      version: 1,
      decidedAt: Date.now(),
      advertising: true,
      recordings: false,
    }),
  );
  setScroll(1000);
  localStorage.removeItem("ow-consent");
}

const SUPER = {
  site: "replace-me",
  taxonomy_version: "2",
  page_type: "service",
  ad_consent: "unset",
};
const beacon = "sendBeacon";

export const EXPECTED = [
  {
    event: "cta_clicked",
    properties: {
      cta_id: "hero-book-call",
      cta_text: "Book a call",
      cta_location: "hero",
      ...SUPER,
    },
    transport: beacon,
  },
  {
    event: "cta_clicked",
    properties: {
      cta_id: "menu-open",
      cta_text: "Open menu",
      cta_location: "hero",
      ...SUPER,
    },
    transport: beacon,
  },
  {
    event: "contact_link_clicked",
    properties: { channel: "phone", cta_location: "footer", ...SUPER },
    transport: beacon,
  },
  {
    event: "contact_link_clicked",
    properties: { channel: "email", cta_location: "contact", ...SUPER },
    transport: beacon,
  },
  {
    event: "contact_link_clicked",
    properties: { channel: "whatsapp", cta_location: "contact", ...SUPER },
    transport: beacon,
  },
  {
    event: "file_downloaded",
    properties: {
      file_name: "Garden Brochure.PDF",
      file_type: "pdf",
      ...SUPER,
    },
    transport: beacon,
  },
  {
    event: "file_downloaded",
    properties: { file_name: "plan.txt", file_type: "txt", ...SUPER },
    transport: beacon,
  },
  {
    event: "outbound_link_clicked",
    properties: { link_domain: "partner.example.org", ...SUPER },
    transport: beacon,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 25, ...SUPER },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 50, ...SUPER },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 75, ...SUPER },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 100, ...SUPER },
    transport: undefined,
  },
  {
    event: "form_started",
    properties: { form_id: "contact", ...SUPER },
    transport: undefined,
  },
  {
    event: "form_error_shown",
    properties: {
      form_id: "contact",
      field_name: "email",
      error_type: "format",
      ...SUPER,
    },
    transport: undefined,
  },
  {
    event: "form_abandoned",
    properties: {
      form_id: "contact",
      last_field: "email",
      fields_completed: 1,
      ...SUPER,
    },
    transport: beacon,
  },
  {
    event: "form_started",
    properties: { form_id: "contact", ...SUPER },
    transport: undefined,
  },
  {
    event: "form_submitted",
    properties: { form_id: "contact", ...SUPER },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 25, ...SUPER, ad_consent: "granted" },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 50, ...SUPER, ad_consent: "granted" },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 75, ...SUPER, ad_consent: "granted" },
    transport: undefined,
  },
  {
    event: "scroll_depth_reached",
    properties: { depth_percent: 100, ...SUPER, ad_consent: "granted" },
    transport: undefined,
  },
];

/** posthog.init's options, apart from the two callbacks. */
export const EXPECTED_CONFIG = {
  api_host: "https://e.example.com",
  ui_host: "https://eu.posthog.com",
  defaults: "2026-08-30",
  cookieless_mode: "always",
  person_profiles: "never",
  capture_pageview: "history_change",
  capture_pageleave: true,
  disable_session_recording: true,
  capture_heatmaps: false,
  mask_all_text: false,
  mask_all_element_attributes: false,
};

export function configWithoutCallbacks(
  config: Record<string, unknown> | null,
): Record<string, unknown> {
  const { before_send: _b, loaded: _l, ...rest } = config ?? {};
  return rest;
}
