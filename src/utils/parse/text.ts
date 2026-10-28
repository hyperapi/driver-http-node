import { IncomingMessage } from 'node:http';
import { TEXT_DECODER } from '../text.js';
import { toUint8Array } from './uint8array.js';

/**
 * Parses request body into text.
 * @param req - NodeJS request object.
 * @returns -
 */
export async function toText(req: IncomingMessage): Promise<string> {
	return TEXT_DECODER.decode(await toUint8Array(req));
}
