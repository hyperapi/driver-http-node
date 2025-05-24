import { ServerOptions } from "node:http";
import { HyperAPIDriver, HyperAPIDriverHandler, HyperAPIRequest } from "@hyperapi/core";
import { IP } from "@kirick/ip";
import { EmptyObject } from "type-fest";

//#region src/request.d.ts
interface HyperAPINodeRequest<A extends Record<string, unknown> = EmptyObject> extends HyperAPIRequest<A> {
  // request: Request;
  url: URL;
  headers: Headers;
  ip: IP;
}

//#endregion
//#region src/main.d.ts
interface Config {
  port: number;
  path?: string;
  multipart_formdata_enabled?: boolean;
  options?: ServerOptions;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class HyperAPINodeDriver implements HyperAPIDriver<HyperAPINodeRequest<any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  constructor({
    port,
    path,
    multipart_formdata_enabled,
    options
  }: Config);
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
} //#endregion
export { HyperAPINodeDriver, HyperAPINodeRequest };