import { HyperAPIError } from '@hyperapi/core';
import type { ResponseSchema } from '../types.js';
import { TEXT_ENCODER } from './text.js';

/**
 * Converts a HyperAPIError to a response.
 * @param error - The error to convert.
 * @param should_add_body - Whether to add the response body.
 * @returns -
 */
export function hyperApiErrorToResponse(
	// oxlint-disable-next-line typescript/no-explicit-any
	error: HyperAPIError<any>,
	should_add_body: boolean,
): ResponseSchema {
	// Copied, not mutated: httpHeaders belongs to the error, which may be reused.
	const headers = new Headers(error.httpHeaders);
	headers.set('Content-Type', 'application/json');

	const body = TEXT_ENCODER.encode(JSON.stringify(error.getResponse()));
	headers.set('Content-Length', String(body.length));

	return {
		status: error.httpStatus,
		headers: Object.fromEntries(headers),
		body: should_add_body ? body : undefined,
	};
}
