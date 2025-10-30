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

type ValiBaseSchema = Parameters<typeof v.parser>[0];

/**
 * Valibot validator for HyperAPI requests.
 * @param schema - The Valibot schema to validate the request against.
 * @returns A middleware function that validates the request arguments using the provided schema.
 */
export function valibot<S extends ValiBaseSchema>(schema: S) {
	return (request: HyperAPIRequest) => {
		const result = v.safeParse(schema, request.args);
		if (result.success) {
			return { args: result.output };
		}

		throw new HyperAPIInvalidParametersError();
	};
}
