import type { HyperAPIRequest } from '@hyperapi/core';
import type { IP }              from '@kirick/ip';

export interface HyperAPINodeRequest<A extends Record<string, unknown> = Omit<{ p: unknown }, 'p'>> extends HyperAPIRequest<A> {
	// request: Request;
	url: URL;
	headers: Record<string, unknown>;
	ip: IP;
}
