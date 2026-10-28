import * as v from 'valibot';
import { hyperApi, valibot } from '../setup.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ name: v.string() })))
	.action(
		(request) =>
			new Response(`Hello, ${request.args.name}!`, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain',
				},
			}),
	);
