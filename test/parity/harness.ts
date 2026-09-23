/**
 * A stand-in for posthog-js, and the plumbing to drive either implementation of
 * the browser module through the same scenario. PostHog's own behaviour is not
 * under test: this records what the module asks PostHog to send, after the
 * module's `before_send` has run, exactly as PostHog would hand it on.
 */
import { vi } from "vitest";

export interface Captured {
  event: string;
  properties: Record<string, unknown>;
  transport: string | undefined;
}

export interface Recorder {
  events: Captured[];
  config: Record<string, unknown> | null;
  imports: number;
}

interface InitConfig extends Record<string, unknown> {
  before_send: (event: {
    event: string;
    properties: Record<string, unknown>;
  }) => {
    event: string;
    properties: Record<string, unknown>;
  } | null;
  loaded: (ph: unknown) => void;
}

/** Mocks posthog-js for the next import. Call before importing the module. */
export function mockPosthog(): Recorder {
  const recorder: Recorder = { events: [], config: null, imports: 0 };
  vi.doMock("posthog-js", () => {
    recorder.imports += 1;
    return {
      default: {
        init(_key: string, config: InitConfig) {
          recorder.config = config;
          const ph = {
            capture(
              event: string,
              properties: Record<string, unknown>,
              options?: { transport?: string },
            ) {
              const sent = config.before_send({
                event,
                properties: { ...properties },
              });
              if (sent) {
                recorder.events.push({
                  event: sent.event,
                  properties: sent.properties,
                  transport: options?.transport,
                });
              }
            },
            startSessionRecording() {},
            stopSessionRecording() {},
          };
          config.loaded(ph);
        },
      },
    };
  });
  return recorder;
}

/** Idle and animation frames run at once, so a scenario reads top to bottom. */
export function runCallbacksImmediately(): void {
  vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
    cb();
    return 0;
  });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  // A real click on a link would navigate the test page away.
  document.addEventListener("click", (event) => event.preventDefault());
}

export function setScroll(
  scrollY: number,
  scrollHeight = 2000,
  innerHeight = 1000,
): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: innerHeight,
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: scrollY,
  });
  window.dispatchEvent(new Event("scroll"));
}
