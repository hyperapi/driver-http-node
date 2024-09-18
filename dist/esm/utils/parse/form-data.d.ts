import { Blob } from 'node:buffer';
import { IncomingMessage } from 'node:http';
/**
 * Parses request body as multipart/form-data.
 * @param  req - NodeJS request object.
 * @returns - JSON object.
 */
export declare function parseFormData(req: IncomingMessage): Promise<Record<string, string | Blob>>;
