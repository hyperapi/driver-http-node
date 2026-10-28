import * as v from 'valibot';
import { hyperApi, valibot } from '../setup.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ name: v.string() })))
	.action((request) => {
		return {
			method: 'echo-query',
			message: `Hello, ${request.args.name}!`,
		};
	});
