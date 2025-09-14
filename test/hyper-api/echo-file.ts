import * as v from 'valibot';
import { hyperApi, valibot } from '../setup.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ file: v.blob() })))
	.action(async (request) => {
		const name = await request.args.file.text();

		return {
			method: 'ALL',
			message: `Hello, ${name}!`,
		};
	});
