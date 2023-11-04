/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */

import { decode, encode } from 'cbor-x';
import { HyperAPIInvalidParametersError } from '@hyperapi/core/api-errors';
function getMIME(type) {
	if (typeof type === 'string') {
		const index = type.indexOf(';');
		if (index !== -1) {
			return type.slice(0, index);
		}
	}

	return type;
}

export async function parseArguments(request, url) {
	let args = {};
	if (request.method === 'GET' || request.method === 'HEAD') {
		args = Object.fromEntries(
			url.searchParams.entries(),
		);
	}
	else {
		// get body from request
		const body = await new Promise((resolve, reject) => {
			const chunks = [];
			request.on('data', (chunk) => {
				chunks.push(chunk);
			});
			request.on('end', () => {
				resolve(Buffer.concat(chunks).toString());
			});
			request.on('error', reject);
		});
		const type_header = request.headers['content-type'];
		const MIME_header = getMIME(type_header);

		try {
			switch (MIME_header) {
				case 'application/json':
					args = JSON.parse(body);
					break;
				case 'application/x-www-form-urlencoded':
					console.log(body);
					args = Object.fromEntries(
						new URLSearchParams(
							body,
						),
					);
					break;
				case 'application/cbor':
					args = decode(body);
					break;
				default:
					return null;
			}
		}
		catch (error) {
			console.error(error);
			return new HyperAPIInvalidParametersError();
		}
	}

	return args;
}

export function parseAcceptHeader(header) {
	if (typeof header === 'string') {
		for (const type of header.split(',')) {
			switch (getMIME(type.trim())) {
				case 'application/json':
				case 'application/*':
					return 'json';
				case 'application/cbor':
					return 'cbor';
				// no default
			}
		}
	}

	return 'json';
}

export function parseResponseTo(format, body) {
	if (format === 'json') {
		return JSON.stringify(body);
	}
	if (format === 'cbor') {
		return encode(body);
	}
	throw new Error('parseResponseTo: Unknown format - ' + format);
}

