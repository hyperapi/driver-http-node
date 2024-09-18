import { HyperAPI } from '@hyperapi/core';
import { HyperAPINodeDriver } from '../src/main.js';

export const hyperApi = new HyperAPI({
	driver: new HyperAPINodeDriver({
		port: 18001,
		// multipart_formdata_enabled: true,
	}),
	root: new URL('hyper-api', import.meta.url).pathname,
});

export const hyperApiMultipart = new HyperAPI({
	driver: new HyperAPINodeDriver({
		port: 18002,
		multipart_formdata_enabled: true,
	}),
	root: new URL('hyper-api', import.meta.url).pathname,
});
