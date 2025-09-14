import { HyperAPI, HyperAPIInvalidParametersError } from '@hyperapi/core';
import type { HyperAPIRequest } from '@hyperapi/core/dev';
import * as v from 'valibot';
import { HyperAPINodeDriver } from '../src/main.js';

const ROOT = new URL('hyper-api', import.meta.url).pathname;

export const hyperApi = new HyperAPI(
	new HyperAPINodeDriver({
		port: 18001,
	}),
	ROOT,
);

export const hyperApiMultipart = new HyperAPI(
	new HyperAPINodeDriver({
		port: 18002,
		multipart_formdata_enabled: true,
	}),
	ROOT,
);

// eslint-disable-next-line jsdoc/require-jsdoc, @typescript-eslint/no-explicit-any
export function valibot<S extends v.BaseSchema<any, any, any>>(schema: S) {
	return (request: HyperAPIRequest) => {
		const result = v.safeParse(schema, request.args);
		if (result.success) {
			return { args: result.output };
		}

		throw new HyperAPIInvalidParametersError();
	};
}
