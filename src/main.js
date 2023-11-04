/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
// @ts-ignore

import HyperAPIError 		     from '@hyperapi/core/error';
import HyperAPIDriver            from '@hyperapi/core/driver';
import HyperAPIRequest           from '@hyperapi/core/request';
import { HyperAPIInternalError } from '@hyperapi/core/api-errors';
import { createServer }          from 'node:http';
import IP                        from '@kirick/ip';

import {
	parseAcceptHeader,
	parseArguments,
	parseResponseTo }            from './parse.js';

export default class HyperAPIHttpDriver extends HyperAPIDriver {
	#httpserver;

	constructor({
		path = '/api/',
		port,
	}) {
		if (typeof path !== 'string') {
			throw new TypeError('Property "path" must be a string.');
		}
		if (typeof port !== 'number') {
			throw new TypeError('Property "port" must be a number.');
		}

		super();
		this.#httpserver = createServer(async (request, response) => {
			const url = new URL(request.url, 'http://localhost');

			if (url.pathname.startsWith(path) !== true) {
				response.writeHead(404);
				response.end();
				return;
			}

			const method = url.pathname.slice(path.length);
			let args = {};

			args = await parseArguments(request, url);

			const preffered_format = parseAcceptHeader(
				request.headers.accept,
			);

			if (args === null) {
				response.writeHead(415);
				response.end();
				return;
			}
			if (args instanceof HyperAPIError) {
				response.writeHead(
					400,
					{
						'Content-Type': 'application/' + preffered_format,
					},
				);
				response.end(
					parseResponseTo(
						preffered_format,
						args.getResponse(),
					),
				);
				return;
			}

			// вот здесь

			const hyperApiRequest = new HyperAPIRequest(method, args);
			hyperApiRequest.set('request', request);
			hyperApiRequest.set('url', url);
			hyperApiRequest.set(
				'ip',
				new IP(
					request.socket.remoteAddress,
				),
			);

			const hyperAPIResponse = await this.onRequest(hyperApiRequest);

			if (
				hyperAPIResponse.is_success === false
				&& hyperAPIResponse.error.httpStatus === undefined
			) {
				const internal_error = new HyperAPIInternalError();

				response.writeHead(
					500,
					{
						'Content-Type': 'application/' + preffered_format,
					},
				);
				response.end(
					parseResponseTo(
						preffered_format,
						internal_error.getResponse(),
					),
				);
				return;
			}

			response.writeHead(
				hyperAPIResponse.error?.httpStatus ?? 200,
				{
					'Content-Type': 'application/' + preffered_format,
				},
			);

			if (request.method === 'HEAD') {
				response.end();
				return;
			}

			response.end(
				parseResponseTo(
					preffered_format,
					hyperAPIResponse.getResponse(),
				),
			);
		});

		this.#httpserver.listen(port, () => {
			console.log(`HyperAPI server running at http://localhost:${port}/`);
		});
	}

	destroy() {
		this.#httpserver.close();
	}
}
