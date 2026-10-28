/**
 * Shared across requests: neither coder holds per-call state.
 *
 * The types are spelled through `InstanceType` because these are globals, which
 * the Node type definitions declare in a way that leaves no nameable type.
 */
export const TEXT_ENCODER: InstanceType<typeof TextEncoder> = new TextEncoder();
export const TEXT_DECODER: InstanceType<typeof TextDecoder> = new TextDecoder();
