import busboy from 'busboy';
import { Blob } from 'node:buffer';
import { IncomingMessage } from 'node:http';

// FIXME: implement limiting of body size and read timeout

/**
 * Parses request body as multipart/form-data.
 * @param  req - NodeJS request object.
 * @returns - JSON object.
 */
export function parseFormData(req: IncomingMessage): Promise<Record<string, string | Blob>> {
	return new Promise<Record<string, string | Blob>>((resolve) => {
		const bb = busboy({
			headers: req.headers,
		});

		const form_data: Record<string, string | Blob> = {};

		bb.on(
			'file',
			(name, file, info) => {
				const file_parts: Uint8Array[] = [];

				file.on('data', (chunk: Buffer) => {
					file_parts.push(chunk as Uint8Array);
				});

				file.on('end', () => {
					form_data[name] = new Blob(
						file_parts,
						{ type: info.mimeType },
					);
				});
			},
		);

		bb.on(
			'field',
			(name, value) => {
				form_data[name] = value;
			},
		);

		bb.on(
			'close',
			() => {
				resolve(form_data);
			},
		);

		req.pipe(bb);
	});
}
