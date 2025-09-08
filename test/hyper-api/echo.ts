/* eslint-disable jsdoc/require-jsdoc */

import { type HyperAPIResponse } from '@hyperapi/core';
import { type HyperAPINodeRequest } from '../../src/main.js';

export default function (
	request: HyperAPINodeRequest<{ name: string }>,
): HyperAPIResponse {
	return {
		method: 'ALL',
		message: `Hello, ${request.args.name}!`,
		header_value: request.headers.get('x-test-header'),
	};
}
