/* eslint-disable n/no-unpublished-import */
/* eslint-disable no-restricted-exports */

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'dist/vitest/**/*.test.js',
		],
		exclude: [],
	},
});
