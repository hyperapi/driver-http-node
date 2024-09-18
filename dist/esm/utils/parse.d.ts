import { IncomingMessage } from 'node:http';
type RequestArgs = Record<string, unknown>;
/**
 * Parses arguments from request.
 * @param  req - NodeJS request object.
 * @param  url - URL object.
 * @param  multipart_formdata_enabled - Whether to enable multipart/form-data parsing.
 * @returns - Arguments.
 */
export declare function parseArguments(req: IncomingMessage, url: URL, multipart_formdata_enabled: boolean): Promise<RequestArgs>;
export {};
