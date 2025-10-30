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
import type { ResponseSchema } from './types.js';
import { isHttpMethodSupported, isResponseBodyRequired } from './utils/http.js';
import { hyperApiErrorToResponse } from './utils/hyperapi-error.js';
import { parseArguments } from './utils/parse.js';

interface Config {
	port: number;
	path?: string;
	multipart_formdata_enabled?: boolean;
	options?: ServerOptions;
}

export class HyperAPINodeDriver extends HyperAPIDriver<HyperAPINodeRequest> {
	private port: number;
	private path: string;
	private multipart_formdata_enabled: boolean;
	private server: Server;
	private server_options: ServerOptions;

	/**
	 * @param options -
	 * @param options.port - HTTP server port. Default: `8001`.
	 * @param [options.path] - Path to serve. Default: `/api/`.
	 * @param [options.multipart_formdata_enabled] - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
	 * @param [options.options] - NodeJS server options.
	 */
	constructor({
		port,
		path = '/api/',
		multipart_formdata_enabled = false,
		options = {},
	}: Config) {
		super();

		this.port = port;
		this.path = path;
		this.multipart_formdata_enabled = multipart_formdata_enabled;
		this.server_options = options;

		this.server = createServer(this.server_options, async (req, res) => {
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

		// bugged vitest executes file twice, so ignore EADDRINUSE error.
		if (process.env.NODE_ENV === 'test') {
			this.server.on('error', (error) => {
				if (error && 'code' in error && error.code === 'EADDRINUSE') {
					// ignore
				} else {
					throw error;
				}
			});
		}

		this.server.listen(this.port);
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
		if (url.pathname.startsWith(this.path) !== true) {
			return { status: 404 };
		}

		const hyperapi_method = url.pathname.slice(this.path.length);

		const hyperapi_args = await parseArguments(
			req,
			url as URL,
			this.multipart_formdata_enabled,
		);

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

		const hyperapi_response = await this.emitRequest({
			method: http_method,
			path: hyperapi_method,
			args: hyperapi_args,
			url: url as URL,
			headers,
			ip: new IP(ip_string),
		});

		if (hyperapi_response instanceof HyperAPIError) {
			throw hyperapi_response;
		}

		return {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: isResponseBodyRequired(http_method)
				? JSON.stringify(hyperapi_response)
				: undefined,
		};
	}

	/** Stops the server. */
	override destroy(): void {
		this.server?.close();

		super.destroy();
	}
}

export { type HyperAPINodeRequest } from './request.js';
