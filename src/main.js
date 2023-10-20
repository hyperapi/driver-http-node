/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
// @ts-ignore

import HyperAPIDriver            from '@hyperapi/core/driver';
import HyperAPIRequest           from '@hyperapi/core/request';
import HyperAPIResponse          from '@hyperapi/core/response';
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
			const args = parseArguments(request, url);
			const preffered_format = parseAcceptHeader(
				request.headers.accept,
			);

			if (args === 'UNSUPPORTED_CONTENT_TYPE') {
				response.writeHead(415);
				response.end();
				return;
			}

			const hyperApiRequest = new HyperAPIRequest(method, args);
			hyperApiRequest.set('request', request);
			hyperApiRequest.set('url', url);
			hyperApiRequest.set(
				'ip',
				new IP(
					request.connection.remoteAddress,
				),
			);

			const hyperAPIResponse = await this.onRequest(hyperApiRequest);

			if (
				hyperAPIResponse.is_success === false
				&& hyperAPIResponse.error.httpStatus === undefined
			) {
				const internal_error = new HyperAPIResponse(
					new HyperAPIInternalError(),
				);

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
