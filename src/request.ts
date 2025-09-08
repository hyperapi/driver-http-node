import type { HyperAPIRequest } from '@hyperapi/core';
import type { IP } from '@kirick/ip';
import type { EmptyObject } from 'type-fest';

export interface HyperAPINodeRequest<
	A extends Record<string, unknown> = EmptyObject,
> extends HyperAPIRequest<A> {
	// request: Request;
	url: URL;
	headers: Headers;
	ip: IP;
}
