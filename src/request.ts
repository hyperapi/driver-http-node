import type { IncomingMessage } from 'node:http';
import type {
	EmptyObject,
	HyperAPIRequest,
	UnknownRecord,
} from '@hyperapi/core/dev';
import type { IP } from '@kirick/ip';

interface HyperAPINodeRequestBase {
	url: URL;
	headers: Headers;
	ip: IP;
}

export interface HyperAPINodeRequestWithArgs<
	A extends UnknownRecord = EmptyObject,
> extends HyperAPIRequest<A>,
		HyperAPINodeRequestBase {
	args: A;
}

export interface HyperAPINodeRequestWithRequest
	extends HyperAPIRequest<EmptyObject>,
		HyperAPINodeRequestBase {
	/**
	 * The unread request stream. Unlike a `Request`, it cannot be cloned, so it
	 * may only be consumed once.
	 */
	req: IncomingMessage;
}

export type HyperAPINodeRequest<
	P extends boolean = true,
	A extends UnknownRecord = EmptyObject,
> = P extends true
	? HyperAPINodeRequestWithArgs<A>
	: HyperAPINodeRequestWithRequest;
