import { IncomingMessage } from 'node:http';

// FIXME: implement limiting of body size and read timeout

/**
 * Parses request body into text.
 * @param  req - NodeJS request object.
 * @returns -
 */
export function parseText(req: IncomingMessage): Promise<string> {
	// const body_parts: Buffer[] = [];
	// for await (const chunk of req) {
	// 	body_parts.push(chunk);
	// }

	// return Buffer.concat(body_parts).toString();

	return new Promise<string>((resolve, reject) => {
		const body_parts: Uint8Array[] = [];
		// Set timeout for the entire operation
		// const timeout_id = setTimeout(() => reject(new Error('Request body parsing timed out')), timeout);

		req.on('error', (err) => {
			// clearTimeout(timeout_id);
			reject(err);
		});

		req.on('data', (chunk: Buffer) => {
			// totalSize += chunk.length;
			// if (totalSize > maxSize) {
			// 	clearTimeout(timeoutId);
			// 	reject(new Error(`Request body too large, exceeded ${maxSize} bytes`));
			// 	req.destroy(); // Terminate the connection
			// 	return;
			// }

			body_parts.push(chunk as Uint8Array);
		});

		req.on('end', () => {
			// clearTimeout(timeoutId);
			resolve(Buffer.concat(body_parts).toString());
		});
	});
}
