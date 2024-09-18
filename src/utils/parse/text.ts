import { IncomingMessage } from 'node:http';

/**
 * Parses request body into text.
 * @param  req - NodeJS request object.
 * @returns -
 */
export async function parseText(req: IncomingMessage) {
	const body_parts: Buffer[] = [];
	for await (const chunk of req) {
		body_parts.push(chunk);
	}

	return Buffer.concat(body_parts).toString();
}
