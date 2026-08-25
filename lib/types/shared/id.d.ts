/**
 * One opaque ID generator shared across the plugin's client modules.
 *
 * Three modules used to carry their own copies of this helper, kept identical
 * by convention; this is the single definition. IDs are consumed as opaque
 * strings everywhere (storage validation checks `typeof === 'string'` only),
 * so the `prefix` matters solely for the legacy non-randomUUID fallback.
 */
/** One opaque ID; prefers crypto.randomUUID, falls back to a timestamp+random string. */
export declare function newId(prefix: string): string;
