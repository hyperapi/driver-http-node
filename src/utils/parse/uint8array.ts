import { IncomingMessage } from 'node:http';

// FIXME: implement limiting of body size and read timeout

/**
 * Reads request body into bytes.
 * @param req - NodeJS request object.
 * @returns -
 */
export function toUint8Array(req: IncomingMessage): Promise<Uint8Array> {
	return new Promise<Uint8Array>((resolve, reject) => {
		// Node hands over pooled chunks, whose `.buffer` is shared memory.
		// Copying into an exact array gives the caller bytes that are only
		// theirs.

		let buffer_length = 0;
		const body_parts: Uint8Array[] = [];

		req.on('error', (err) => {
			reject(err);
		});

		req.on('data', (chunk: Uint8Array) => {
			body_parts.push(chunk);
			buffer_length += chunk.length;
		});

		req.on('end', () => {
			const bytes = new Uint8Array(buffer_length);
			let offset = 0;
			for (const part of body_parts) {
				bytes.set(part, offset);
				offset += part.length;
			}

			resolve(bytes);
		});
	});
}
