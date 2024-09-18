/* eslint-disable jsdoc/require-jsdoc */

import { type HyperAPIResponse } from '@hyperapi/core';
import { Blob } from 'node:buffer';
import { type HyperAPINodeRequest } from '../../src/main.js';

export default async function (request: HyperAPINodeRequest<{ name: Blob }>): Promise<HyperAPIResponse> {
	const name = await request.args.name.text();

	return {
		method: 'ALL',
		message: `Hello, ${name}!`,
	};
}
