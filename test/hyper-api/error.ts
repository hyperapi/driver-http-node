/* eslint-disable jsdoc/require-jsdoc */

import {
	HyperAPIRateLimitError,
	type HyperAPIResponse,
} from '@hyperapi/core';

class HyperAPILocalRateLimitError extends HyperAPIRateLimitError<undefined> {
	httpHeaders = {
		'Retry-After': '3600',
	};
}

export default function (): HyperAPIResponse {
	throw new HyperAPILocalRateLimitError();
}
