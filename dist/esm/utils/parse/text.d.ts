import { IncomingMessage } from 'node:http';
/**
 * Parses request body into text.
 * @param  req - NodeJS request object.
 * @returns -
 */
export declare function parseText(req: IncomingMessage): Promise<string>;
