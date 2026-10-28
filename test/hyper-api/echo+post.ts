import * as v from 'valibot';
import { hyperApi, valibot } from '../setup.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ name: v.string() })))
	.action((request) => {
		return {
			message: `Hello, ${request.args.name}!`,
		};
	});
