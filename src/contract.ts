/**
 * The contract itself, with no runtime dependencies: every taxonomy version's
 * events, super properties and page types, and the baseline dashboard. For the
 * analytics app, provisioning, and any code that needs to know what a site on a
 * given version sends.
 */
import {
  EVENT_LISTS,
  VERSIONS,
  type TaxonomyVersion,
} from "./generated/contract.js";
import type { ListedEvent } from "./contract-types.js";

export * from "./generated/contract.js";
export type * from "./contract-types.js";

export function isKnownVersion(version: number): version is TaxonomyVersion {
  return (VERSIONS as readonly number[]).includes(version);
}

/** A version's events, or undefined for a version this release does not know. */
export function eventsFor(version: number): readonly ListedEvent[] | undefined {
  return isKnownVersion(version) ? EVENT_LISTS[version] : undefined;
}

export { classifyChannel, type Attribution, type Channel } from "./channels.js";
