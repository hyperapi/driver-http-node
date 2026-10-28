import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		server: {
			deps: {
				// The core router reaches route modules through a runtime
				// `import()`. Externalised, that call goes to Node's own loader,
				// which hands them a second copy of test/setup.js — so every
				// server, client and port it sets up is created twice.
				inline: ['@hyperapi/core'],
			},
		},
	},
});
