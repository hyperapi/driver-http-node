import type { HyperAPIModuleResponse } from '@hyperapi/core/dev';

/** HTTP can carry a raw `Response` on top of what every transport carries. */
export type HyperAPINodeResponse = HyperAPIModuleResponse | Response;
