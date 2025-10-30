import { HyperAPIError } from '@hyperapi/core';
import type { ResponseSchema } from '../types.js';

/**
 * Converts a HyperAPIError to a Response.
 * @param error - The error to convert.
 * @param add_body - Whether to add the response body.
 * @returns -
 */
export function hyperApiErrorToResponse(
	// oxlint-disable-next-line typescript/no-explicit-any
	error: HyperAPIError<any>,
	add_body: boolean,
): ResponseSchema {
	if (typeof error.httpStatus !== 'number') {
		// oxlint-disable-next-line no-console
		console.warn(
			`No HTTP status code provided for error ${error.name}, using 500.`,
		);
	}

	const headers: ResponseSchema['headers'] = {
		'Content-Type': 'application/json',
	};
	if (error.httpHeaders) {
		for (const [header, value] of Object.entries(error.httpHeaders)) {
			headers[header] = value;
		}
	}

	let body;
	if (add_body) {
		body = JSON.stringify(error.getResponse());
	}

	return {
		status: error.httpStatus ?? 500,
		headers,
		body,
	};
}
