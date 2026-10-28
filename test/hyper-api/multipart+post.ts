import * as v from 'valibot';
import { hyperApi, valibot } from '../setup.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ file: v.file() })))
	.action(async (request) => {
		const name = await request.args.file.text();

		return {
			message: `Hello, ${name}!`,
			filename: request.args.file.name,
		};
	});
