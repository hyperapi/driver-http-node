import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerOptions,
} from 'node:http';
import { HyperAPIError } from '@hyperapi/core';
import { HyperAPIDriver } from '@hyperapi/core/dev';
import { IP } from '@kirick/ip';
import type { HyperAPINodeRequest } from './request.js';
import type { HyperAPINodeResponse } from './response.js';
import type { ResponseSchema } from './types.js';
import { isHttpMethodSupported, isResponseBodyRequired } from './utils/http.js';
import { hyperApiErrorToResponse } from './utils/hyperapi-error.js';
import { parseArguments, type RequestArgs } from './utils/parse.js';
import { TEXT_ENCODER } from './utils/text.js';

interface Config<P extends boolean = true> {
	port?: number;
	path?: string;
	multipart_formdata_enabled?: boolean;
	parse_body?: P;
	server_options?: ServerOptions;
}

export class HyperAPINodeDriver<
	P extends boolean = true,
> extends HyperAPIDriver<
	HyperAPINodeRequest<P, RequestArgs>,
	HyperAPINodeResponse
> {
	#path: string;
	#multipart_formdata_enabled: boolean;
	#parse_body: P;
	#server: Server;

	/**
	 * @param options -
	 * @param options.port - HTTP server port. If not provided, the server listens on a port the OS picks.
	 * @param options.path - Path to serve. Default: `/`.
	 * @param options.multipart_formdata_enabled - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
	 * @param options.parse_body - If `true`, server would parse the request body into `args`. If `false`, the unread request is handed over as `request` instead. Default: `true`.
	 * @param options.server_options - Options passed to `http.createServer`.
	 */
	constructor({
		port,
		path = '/',
		multipart_formdata_enabled = false,
		parse_body = true as P,
		server_options = {},
	}: Config<P>) {
		super();

		this.#path = path;
		this.#multipart_formdata_enabled = multipart_formdata_enabled;
		this.#parse_body = parse_body;

		this.#server = createServer(server_options, async (req, res) => {
			let response: ResponseSchema;

			try {
				response = await this.processRequest(req);
			} catch (error) {
				if (error instanceof HyperAPIError) {
					response = hyperApiErrorToResponse(
						error,
						isResponseBodyRequired(req.method),
					);
				} else {
					// oxlint-disable-next-line no-console
					console.error('Unhandled error in @hyperapi/driver-node:');
					// oxlint-disable-next-line no-console
					console.error(error);

					response = { status: 500 };
				}
			}

			res.writeHead(response.status, response.headers ?? {});

			if (response.body !== undefined) {
				res.write(response.body);
			}

			res.end();
		});

		this.#server.listen(port);
	}

	/**
	 * Accepts anything HTTP can carry: this transport adds a raw `Response` to
	 * the core floor.
	 * @param response - The value a module returned.
	 * @returns -
	 */
	// oxlint-disable-next-line class-methods-use-this
	override isValidResponse(
		response: unknown,
	): response is HyperAPINodeResponse {
		return response instanceof Response || super.isValidResponse(response);
	}

	/**
	 * Handles the HTTP request.
	 * @param req - NodeJS request.
	 * @returns -
	 */
	private async processRequest(req: IncomingMessage): Promise<ResponseSchema> {
		const http_method = req.method;
		if (isHttpMethodSupported(http_method) !== true) {
			return { status: 405 };
		}

		if (typeof req.url !== 'string') {
			throw new TypeError('Request URL is not a string.');
		}

		const url = new URL(req.url, `http://${req.headers.host ?? 'unknown'}`);
		if (url.pathname.startsWith(this.#path) !== true) {
			return { status: 404 };
		}

		// HEAD is served by the GET module: the router knows no HEAD routes, and
		// the body is dropped further down anyway.
		const hyperapi_http_method = http_method === 'HEAD' ? 'GET' : http_method;

		const hyperapi_method = url.pathname.slice(this.#path.length);

		const ip_string = req.socket.remoteAddress;
		if (typeof ip_string !== 'string') {
			throw new TypeError('Remote address is not a string.');
		}

		const headers = new Headers();
		for (const [key, value] of Object.entries(req.headers)) {
			if (typeof value === 'string') {
				headers.set(key, value);
			} else if (Array.isArray(value)) {
				for (const item of value) {
					headers.append(key, item);
				}
			}
		}

		const hyperapi_request_base = {
			method: hyperapi_http_method,
			path: hyperapi_method,
			url: url as URL,
			headers,
			ip: new IP(ip_string),
		};

		let hyperapi_request: HyperAPINodeRequest<P, RequestArgs>;
		if (this.#parse_body) {
			const hyperapi_args = await parseArguments(
				req,
				url as URL,
				this.#multipart_formdata_enabled,
			);

			hyperapi_request = {
				...hyperapi_request_base,
				args: hyperapi_args,
			} as HyperAPINodeRequest<P, RequestArgs>;
		} else {
			hyperapi_request = {
				...hyperapi_request_base,
				args: {},
				req,
			} as HyperAPINodeRequest<P, RequestArgs>;
		}

		const hyperapi_response = await this.fetch(hyperapi_request);

		if (hyperapi_response instanceof HyperAPIError) {
			throw hyperapi_response;
		}

		// The body is built either way: a HEAD response carries the headers its
		// GET would carry, Content-Length included (RFC 9110), and only then
		// drops the body.
		const should_add_body = isResponseBodyRequired(req.method);

		if (hyperapi_response instanceof Response) {
			// `arrayBuffer`, not `text`: the module may well be returning
			// something that is not text at all.
			const body = new Uint8Array(await hyperapi_response.arrayBuffer());

			return {
				status: hyperapi_response.status,
				headers: {
					...Object.fromEntries(hyperapi_response.headers),
					'Content-Length': String(body.length),
				},
				body: should_add_body ? body : undefined,
			};
		}

		const body = TEXT_ENCODER.encode(JSON.stringify(hyperapi_response) ?? '');

		return {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': String(body.length),
			},
			body: should_add_body ? body : undefined,
		};
	}

	/** Stops the server. */
	override async destroy(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			this.#server.close((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});

			// `close` alone waits for every keep-alive socket to go idle on its
			// own, which a client holding one open never does.
			this.#server.closeIdleConnections();
		});

		await super.destroy();
	}
}

export type {
	HyperAPINodeRequest,
	HyperAPINodeRequestWithArgs,
	HyperAPINodeRequestWithRequest,
} from './request.js';
export { type HyperAPINodeResponse } from './response.js';
export { toText } from './utils/parse/text.js';
export { toUint8Array } from './utils/parse/uint8array.js';
