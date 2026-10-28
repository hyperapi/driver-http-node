import { HyperAPIInvalidParametersError } from '@hyperapi/core';
import * as v from 'valibot';
import type { HyperAPINodeRequestWithRequest } from '../../src/request.js';
import { toText } from '../../src/main.js';
import { HyperAPIInvalidSignature } from '../hyperapi-error.js';
import {
	generateHmacSha256,
	hyperApiWithoutParse,
	type ValiBaseSchema,
} from '../setup.js';

export const SECRET = 'secret';

export default hyperApiWithoutParse
	.module()
	.use(verifyAndParse(v.object({ name: v.string() })))
	.action((request) => {
		return {
			method: 'echo-sign',
			message: `Hello, ${request.args.name}!`,
		};
	});

/**
 * Verifies the body signature, then parses the body it already read.
 *
 * Bun's driver can do this in two middlewares because a `Request` clones; an
 * `IncomingMessage` is a one-shot stream, so both steps share a single read.
 * @param schema - The Valibot schema to validate the body against.
 * @returns A middleware function that verifies and parses the request body.
 */
function verifyAndParse<S extends ValiBaseSchema>(schema: S) {
	return async (request: HyperAPINodeRequestWithRequest) => {
		const text = await toText(request.req);

		if (
			request.headers.get('X-Signature') !== generateHmacSha256(SECRET, text)
		) {
			throw new HyperAPIInvalidSignature();
		}

		const result = v.safeParse(schema, JSON.parse(text));
		if (result.success) {
			return { args: result.output };
		}

		throw new HyperAPIInvalidParametersError();
	};
}
