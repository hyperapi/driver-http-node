import { ServerOptions } from "node:http";
import { BaseRecord, EmptyObject, HyperAPIDriver, HyperAPIRequest } from "@hyperapi/core/dev";
import { IP } from "@kirick/ip";

//#region src/request.d.ts
interface HyperAPINodeRequest<A extends BaseRecord = EmptyObject> extends HyperAPIRequest<A> {
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
declare class HyperAPINodeDriver extends HyperAPIDriver<HyperAPINodeRequest> {
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
  * Handles the HTTP request.
  * @param req - NodeJS request.
  * @returns -
  */
  private processRequest;
  /** Stops the server. */
  destroy(): void;
}
//#endregion
export { HyperAPINodeDriver, type HyperAPINodeRequest };