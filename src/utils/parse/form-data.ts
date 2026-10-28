import { IncomingMessage } from 'node:http';
import busboy from 'busboy';

// FIXME: implement limiting of body size and read timeout

/**
 * Parses request body as multipart/form-data.
 * @param req - NodeJS request object.
 * @returns - JSON object.
 */
export function toFormData(
	req: IncomingMessage,
): Promise<Record<string, string | File>> {
	return new Promise<Record<string, string | File>>((resolve) => {
		const bb = busboy({
			headers: req.headers,
		});

		const form_data: Record<string, string | File> = {};

		bb.on('file', (name, file, info) => {
			const file_parts: Uint8Array[] = [];

			file.on('data', (chunk: Uint8Array) => {
				file_parts.push(chunk);
			});

			file.on('end', () => {
				form_data[name] = new File(file_parts, info.filename, {
					type: info.mimeType,
				});
			});
		});

		bb.on('field', (name, value) => {
			form_data[name] = value;
		});

		bb.on('close', () => {
			resolve(form_data);
		});

		req.pipe(bb);
	});
}
