import busboy from 'busboy';
import { Blob } from 'node:buffer';
/**
 * Parses request body as multipart/form-data.
 * @param  req - NodeJS request object.
 * @returns - JSON object.
 */
export function parseFormData(req) {
    return new Promise((resolve) => {
        const bb = busboy({
            headers: req.headers,
        });
        const form_data = {};
        bb.on('file', (name, file, info) => {
            const file_parts = [];
            file.on('data', (chunk) => {
                file_parts.push(chunk);
            });
            file.on('end', () => {
                form_data[name] = new Blob(file_parts, {
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
