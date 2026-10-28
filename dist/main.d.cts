import { IncomingMessage, ServerOptions } from "node:http";
import { EmptyObject, HyperAPIDriver, HyperAPIModuleResponse, HyperAPIRequest, UnknownRecord } from "@hyperapi/core/dev";
import { IP } from "@kirick/ip";

//#region src/request.d.ts
interface HyperAPINodeRequestBase {
  url: URL;
  headers: Headers;
  ip: IP;
}
interface HyperAPINodeRequestWithArgs<A extends UnknownRecord = EmptyObject> extends HyperAPIRequest<A>, HyperAPINodeRequestBase {
  args: A;
}
interface HyperAPINodeRequestWithRequest extends HyperAPIRequest<EmptyObject>, HyperAPINodeRequestBase {
  /**
  * The unread request stream. Unlike a `Request`, it cannot be cloned, so it
  * may only be consumed once.
  */
  req: IncomingMessage;
}
type HyperAPINodeRequest<P extends boolean = true, A extends UnknownRecord = EmptyObject> = P extends true ? HyperAPINodeRequestWithArgs<A> : HyperAPINodeRequestWithRequest;
//#endregion
//#region src/response.d.ts
/** HTTP can carry a raw `Response` on top of what every transport carries. */
type HyperAPINodeResponse = HyperAPIModuleResponse | Response;
//#endregion
//#region src/utils/parse.d.ts
type RequestArgs = Record<string, unknown>;
//#endregion
//#region src/utils/parse/text.d.ts
/**
* Parses request body into text.
* @param req - NodeJS request object.
* @returns -
*/
declare function toText(req: IncomingMessage): Promise<string>;
//#endregion
//#region src/utils/parse/uint8array.d.ts
/**
* Reads request body into bytes.
* @param req - NodeJS request object.
* @returns -
*/
declare function toUint8Array(req: IncomingMessage): Promise<Uint8Array>;
//#endregion
//#region src/main.d.ts
interface Config<P extends boolean = true> {
  port?: number;
  path?: string;
  multipart_formdata_enabled?: boolean;
  parse_body?: P;
  server_options?: ServerOptions;
}
declare class HyperAPINodeDriver<P extends boolean = true> extends HyperAPIDriver<HyperAPINodeRequest<P, RequestArgs>, HyperAPINodeResponse> {
  #private;
  /**
  * @param options -
  * @param options.port - HTTP server port. If not provided, the server listens on a port the OS picks.
  * @param options.path - Path to serve. Default: `/`.
  * @param options.multipart_formdata_enabled - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
  * @param options.parse_body - If `true`, server would parse the request body into `args`. If `false`, the unread request is handed over as `request` instead. Default: `true`.
  * @param options.server_options - Options passed to `http.createServer`.
  */
  constructor({
    port,
    path,
    multipart_formdata_enabled,
    parse_body,
    server_options
  }: Config<P>);
  /**
  * Accepts anything HTTP can carry: this transport adds a raw `Response` to
  * the core floor.
  * @param response - The value a module returned.
  * @returns -
  */
  override isValidResponse(response: unknown): response is HyperAPINodeResponse;
  /**
  * Handles the HTTP request.
  * @param req - NodeJS request.
  * @returns -
  */
  private processRequest;
  /** Stops the server. */
  override destroy(): Promise<void>;
}
//#endregion
export { HyperAPINodeDriver, type HyperAPINodeRequest, type HyperAPINodeRequestWithArgs, type HyperAPINodeRequestWithRequest, type HyperAPINodeResponse, toText, toUint8Array };