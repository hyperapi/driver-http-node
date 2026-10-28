import { request } from 'node:http';
import { Readable } from 'node:stream';
import { HyperAPI } from '@hyperapi/core';
import { describe, expect, test } from 'vitest';
import { HyperAPINodeDriver, toText, toUint8Array } from './main.js';
import '../test/setup.js';
import { SECRET } from '../test/hyper-api/sign+post.js';
import { generateHmacSha256 } from '../test/setup.js';

describe('args', () => {
	test('GET', async () => {
		const response = await fetch('http://localhost:18001/echo?name=world', {
			headers: {
				'x-test-header': 'test-value',
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('Content-Length')).toBe('55');

		const body = await response.json();
		expect(body).toStrictEqual({
			message: 'Hello, world!',
			header_value: 'test-value',
		});
	});

	test('HEAD', async () => {
		const response = await fetch('http://localhost:18001/echo?name=world', {
			method: 'HEAD',
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('Content-Length')).toBe('47');

		const body = await response.arrayBuffer();
		expect(body.byteLength).toStrictEqual(0);
	});

	describe('POST', () => {
		test('JSON', async () => {
			const response = await fetch('http://localhost:18001/echo', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'foo',
				}),
			});

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				message: 'Hello, foo!',
			});
		});

		test('form', async () => {
			const response = await fetch('http://localhost:18001/echo', {
				method: 'POST',
				body: new URLSearchParams({
					name: 'bar bar',
				}),
			});

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				message: 'Hello, bar bar!',
			});
		});

		test('multipart', async () => {
			const form_data = new FormData();
			form_data.append(
				'file',
				new Blob(['baz'], { type: 'text/plain' }),
				'greeting.txt',
			);

			const response = await fetch('http://localhost:18002/multipart', {
				method: 'POST',
				body: form_data,
			});

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				message: 'Hello, baz!',
				// A Blob would have dropped this.
				filename: 'greeting.txt',
			});
		});

		test('response', async () => {
			const response = await fetch('http://localhost:18001/response?name=foo');

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('text/plain');

			const body = await response.text();
			expect(body).toEqual('Hello, foo!');
		});
	});
});

describe('without body parsing', () => {
	describe('POST', () => {
		const request_body = JSON.stringify({
			name: 'foo',
		});

		test('echo with valid signature', async () => {
			const sign = generateHmacSha256(SECRET, request_body);
			const response = await fetch('http://localhost:18003/sign', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Signature': sign,
				},
				body: request_body,
			});

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				method: 'echo-sign',
				message: `Hello, foo!`,
			});
		});

		test('echo with invalid signature', async () => {
			const sign = 'intentionally-invalid-signature';
			const response = await fetch('http://localhost:18003/sign', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Signature': sign,
				},
				body: request_body,
			});

			expect(response.status).toBe(403);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				code: 101,
				description: 'Invalid signature',
			});
		});
	});
});

describe('body helpers', () => {
	test('toUint8Array returns the raw bytes', async () => {
		const expected = new TextEncoder().encode('héllo');
		const bytes = await toUint8Array(Readable.from([expected]) as never);

		expect(bytes).toStrictEqual(expected);
	});

	test('toText decodes multi-byte UTF-8 across chunks', async () => {
		// The two halves of a single 2-byte character arrive separately.
		const text = await toText(
			Readable.from([
				Uint8Array.from([0x68, 0xc3]),
				Uint8Array.from([0xa9, 0x6c]),
			]) as never,
		);

		expect(text).toBe('hél');
	});
});

test('HyperAPIError with HTTP headers', async () => {
	const response = await fetch('http://localhost:18001/error');

	expect(response.status).toBe(429);
	expect(response.headers.get('Content-Type')).toBe('application/json');
	expect(response.headers.get('Retry-After')).toBe('3600');

	const body = await response.json();
	expect(body).toStrictEqual({
		code: 7,
		description: 'Rate limit exceeded',
	});
});

describe('errors', () => {
	test('unsupported HTTP method', async () => {
		// Through node:http, not fetch: undici refuses to send a method outside
		// its own fixed list, so the server would never see it.
		const status = await rawRequestStatus('TRACE', '/echo?name=world');

		expect(status).toBe(405);
	});

	test('invalid path', async () => {
		const response = await fetch('http://localhost:18001/echoo');

		expect(response.status).toBe(404);
	});

	describe('invalid body', () => {
		test('malformed JSON', async () => {
			const response = await fetch('http://localhost:18001/echo', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: '{',
			});

			expect(response.status).toBe(400);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				code: 2,
				description: 'One of the parameters specified was missing or invalid',
				data: {
					message: 'Could not parse body',
				},
			});
		});

		test('JSON array', async () => {
			const response = await fetch('http://localhost:18001/echo', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: '[1]',
			});

			expect(response.status).toBe(400);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				code: 2,
				description: 'One of the parameters specified was missing or invalid',
				data: {
					message: 'JSON body must be an object',
				},
			});
		});

		// malformed forms isn't a thing with URLSearchParams

		test('multipart disabled', async () => {
			const form_data = new FormData();
			form_data.append('name', new Blob(['baz'], { type: 'text/plain' }));

			const response = await fetch('http://localhost:18001/multipart', {
				method: 'POST',
				body: form_data,
			});

			expect(response.status).toBe(415);
			expect(response.headers.get('Content-Type')).toBe('application/json');

			const body = await response.json();
			expect(body).toStrictEqual({
				code: 2,
				description: 'One of the parameters specified was missing or invalid',
				data: {
					message: 'Unsupported body type: multipart/form-data',
				},
			});
		});
	});
});

test('destroy', async () => {
	// Its own port: the shared servers in test/setup.ts outlive every test.
	const hyperApi = new HyperAPI(
		new HyperAPINodeDriver({ port: 18004 }),
		new URL('../test/hyper-api', import.meta.url).pathname,
	);

	// Unlike Bun.serve, `listen` is asynchronous, so the port is not up yet.
	const response = await waitForServer(
		'http://localhost:18004/echo?name=world',
	);
	expect(response.status).toBe(200);
	await response.json();

	await hyperApi.destroy();

	await expect(
		fetch('http://localhost:18004/echo?name=world'),
	).rejects.toThrow();
});

/**
 * Fetches a URL, retrying while the server is still coming up.
 * @param url - The URL to fetch.
 * @returns -
 */
async function waitForServer(url: string): Promise<Response> {
	// Sequential by nature: each attempt only happens because the last failed.
	// oxlint-disable no-await-in-loop
	for (let attempt = 0; attempt < 50; attempt++) {
		try {
			return await fetch(url);
		} catch {
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
		}
	}
	// oxlint-enable no-await-in-loop

	throw new Error(`Server at ${url} did not come up.`);
}

/**
 * Sends a request with an arbitrary HTTP method and returns the status code.
 * @param method - The HTTP method to send.
 * @param path - The request path.
 * @returns -
 */
function rawRequestStatus(method: string, path: string): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const req = request(
			{ hostname: 'localhost', port: 18001, path, method },
			(res) => {
				res.resume();
				res.on('end', () => resolve(res.statusCode ?? 0));
			},
		);

		req.on('error', reject);
		req.end();
	});
}
