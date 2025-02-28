import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerOptions,
} from 'node:http';
import {
	HyperAPIError,
	type HyperAPIDriver,
	type HyperAPIDriverHandler,
} from '@hyperapi/core';
import { IP } from '@kirick/ip';
import { parseArguments } from './utils/parse.js';
import { type HyperAPINodeRequest } from './request.js';
import { ResponseSchema } from './types.js';
import { hyperApiErrorToResponse } from './utils/hyperapi-error.js';
import {
	isHttpMethodSupported,
	isResponseBodyRequired,
} from './utils/http.js';

interface Config {
	port: number;
	path?: string;
	multipart_formdata_enabled?: boolean;
	options?: ServerOptions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HyperAPINodeDriver implements HyperAPIDriver<HyperAPINodeRequest<any>> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handler: HyperAPIDriverHandler<HyperAPINodeRequest<any>> | null = null;
	private port: number;
	private path: string;
	private multipart_formdata_enabled: boolean;
	private server: Server | null = null;
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
		this.port = port;
		this.path = path;
		this.multipart_formdata_enabled = multipart_formdata_enabled;
		this.server_options = options;
	}

	/**
	 * Starts the server.
	 * @param handler - The handler to use.
	 */
	start(handler: HyperAPIDriverHandler<HyperAPINodeRequest>) {
		this.handler = handler;
		this.server = createServer(
			this.server_options,
			async (req, res) => {
				let response: ResponseSchema;

				try {
					response = await this.processRequest(req);
				}
				catch (error) {
					if (error instanceof HyperAPIError) {
						response = hyperApiErrorToResponse(
							error,
							isResponseBodyRequired(req.method),
						);
					}
					else {
						// eslint-disable-next-line no-console
						console.error('Unhandled error in @hyperapi/driver-node:');
						// eslint-disable-next-line no-console
						console.error(error);

						response = { status: 500 };
					}
				}

				res.writeHead(
					response.status,
					response.headers ?? {},
				);

				if (response.body !== undefined) {
					res.write(response.body);
				}

				res.end();
			},
		);
		this.server.listen(this.port);
	}

	/** Stops the server. */
	stop() {
		this.server?.close();
	}

	/**
	 * Handles the HTTP request.
	 * @param req - NodeJS request.
	 * @returns -
	 */
	private async processRequest(req: IncomingMessage): Promise<ResponseSchema> {
		if (!this.handler) {
			throw new Error('No handler available.');
		}

		const http_method = req.method;
		if (isHttpMethodSupported(http_method) !== true) {
			return { status: 405 };
		}

		if (typeof req.url !== 'string') {
			throw new TypeError('Request URL is not a string.');
		}

		const url = new URL(
			req.url,
			`http://${req.headers.host ?? 'unknown'}`,
		);
		if (url.pathname.startsWith(this.path) !== true) {
			return { status: 404 };
		}

		const hyperapi_method = url.pathname.slice(
			this.path.length,
		);

		const hyperapi_args = await parseArguments(
			req,
			url as URL,
			this.multipart_formdata_enabled,
		);

		const ip_string = req.socket.remoteAddress;
		if (typeof ip_string !== 'string') {
			throw new TypeError('Remote address is not a string.');
		}

		const hyperapi_response = await this.handler({
			method: http_method,
			path: hyperapi_method,
			args: hyperapi_args,
			url: url as URL,
			headers: req.headers,
			ip: new IP(ip_string),
		});

		if (hyperapi_response instanceof HyperAPIError) {
			throw hyperapi_response;
		}

		if (hyperapi_response instanceof Response) {
			throw new TypeError('Response is not supported in this driver');
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
}

export { type HyperAPINodeRequest } from './request.js';
