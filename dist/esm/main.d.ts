import { type ServerOptions } from 'node:http';
import { type HyperAPIDriver, type HyperAPIDriverHandler } from '@hyperapi/core';
import { type HyperAPINodeRequest } from './request.js';
interface Config {
    port: number;
    path?: string;
    multipart_formdata_enabled?: boolean;
    options?: ServerOptions;
}
export declare class HyperAPINodeDriver implements HyperAPIDriver<HyperAPINodeRequest<any>> {
    private handler;
    private port;
    private path;
    private multipart_formdata_enabled;
    private server;
    private server_options;
    /**
     * @param options -
     * @param options.port - HTTP server port. Default: `8001`.
     * @param [options.path] - Path to serve. Default: `/api/`.
     * @param [options.multipart_formdata_enabled] - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
     * @param [options.options] - NodeJS server options.
     */
    constructor({ port, path, multipart_formdata_enabled, options, }: Config);
    /**
     * Starts the server.
     * @param handler - The handler to use.
     */
    start(handler: HyperAPIDriverHandler<HyperAPINodeRequest>): void;
    /** Stops the server. */
    stop(): void;
    /**
     * Handles the HTTP request.
     * @param req - NodeJS request.
     * @returns -
     */
    private processRequest;
}
export { type HyperAPINodeRequest } from './request.js';
