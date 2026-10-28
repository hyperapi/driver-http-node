import { createServer } from "node:http";
import { HyperAPIError, HyperAPIInvalidParametersError } from "@hyperapi/core";
import { HyperAPIDriver, isRecord } from "@hyperapi/core/dev";
import { IP } from "@kirick/ip";
import busboy from "busboy";
//#region src/utils/http.ts
const HTTP_METHODS = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS"
];
/**
* Checks if the given HTTP method is one this driver serves.
* @param http_method The HTTP method to check.
* @returns -
*/
function isHttpMethodSupported(http_method) {
	return HTTP_METHODS.includes(http_method);
}
/**
* Checks if the response body is required for the given HTTP method.
* @param http_method The HTTP method to check.
* @returns -
*/
function isResponseBodyRequired(http_method) {
	return http_method !== "HEAD" && http_method !== "OPTIONS";
}
//#endregion
//#region src/utils/text.ts
/**
* Shared across requests: neither coder holds per-call state.
*
* The types are spelled through `InstanceType` because these are globals, which
* the Node type definitions declare in a way that leaves no nameable type.
*/
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
//#endregion
//#region src/utils/hyperapi-error.ts
/**
* Converts a HyperAPIError to a response.
* @param error - The error to convert.
* @param should_add_body - Whether to add the response body.
* @returns -
*/
function hyperApiErrorToResponse(error, should_add_body) {
	const headers = new Headers(error.httpHeaders);
	headers.set("Content-Type", "application/json");
	const body = TEXT_ENCODER.encode(JSON.stringify(error.getResponse()));
	headers.set("Content-Length", String(body.length));
	return {
		status: error.httpStatus,
		headers: Object.fromEntries(headers),
		body: should_add_body ? body : void 0
	};
}
//#endregion
//#region src/utils/parse/form-data.ts
/**
* Parses request body as multipart/form-data.
* @param req - NodeJS request object.
* @returns - JSON object.
*/
function toFormData(req) {
	return new Promise((resolve) => {
		const bb = busboy({ headers: req.headers });
		const form_data = {};
		bb.on("file", (name, file, info) => {
			const file_parts = [];
			file.on("data", (chunk) => {
				file_parts.push(chunk);
			});
			file.on("end", () => {
				form_data[name] = new File(file_parts, info.filename, { type: info.mimeType });
			});
		});
		bb.on("field", (name, value) => {
			form_data[name] = value;
		});
		bb.on("close", () => {
			resolve(form_data);
		});
		req.pipe(bb);
	});
}
//#endregion
//#region src/utils/parse/uint8array.ts
/**
* Reads request body into bytes.
* @param req - NodeJS request object.
* @returns -
*/
function toUint8Array(req) {
	return new Promise((resolve, reject) => {
		let buffer_length = 0;
		const body_parts = [];
		req.on("error", (err) => {
			reject(err);
		});
		req.on("data", (chunk) => {
			body_parts.push(chunk);
			buffer_length += chunk.length;
		});
		req.on("end", () => {
			const bytes = new Uint8Array(buffer_length);
			let offset = 0;
			for (const part of body_parts) {
				bytes.set(part, offset);
				offset += part.length;
			}
			resolve(bytes);
		});
	});
}
//#endregion
//#region src/utils/parse/text.ts
/**
* Parses request body into text.
* @param req - NodeJS request object.
* @returns -
*/
async function toText(req) {
	return TEXT_DECODER.decode(await toUint8Array(req));
}
//#endregion
//#region src/utils/parse.ts
/**
* Gets only MIME type from Content-Type header, stripping parameters.
* @param  type - MIME type.
* @returns  - MIME type.
*/
function getMIME(type) {
	const index = type.indexOf(";");
	if (index !== -1) return type.slice(0, index).trim();
	return type.trim();
}
var HyperAPIBodyInvalidError = class extends HyperAPIInvalidParametersError {
	data = { message: "Could not parse body" };
	httpStatus = 400;
	constructor(message) {
		super();
		if (message) this.data.message = message;
	}
};
var HyperAPIBodyUnknownError = class extends HyperAPIInvalidParametersError {
	data = { message: "Unsupported body type" };
	httpStatus = 415;
	constructor(mime) {
		super();
		this.data.message = `Unsupported body type: ${mime}`;
	}
};
/**
* Parses arguments from request.
* @param  req - NodeJS request object.
* @param  url - URL object.
* @param  is_multipart_formdata_enabled - Whether to enable multipart/form-data parsing.
* @returns - Arguments.
*/
async function parseArguments(req, url, is_multipart_formdata_enabled) {
	let args;
	if (req.method === "GET" || req.method === "HEAD") args = Object.fromEntries(url.searchParams.entries());
	else {
		const type_header = req.headers["content-type"];
		const type_mime = typeof type_header === "string" ? getMIME(type_header) : "<no Content-Type header provided>";
		switch (type_mime) {
			case "application/json": {
				let args_json;
				try {
					args_json = JSON.parse(await toText(req));
				} catch {
					throw new HyperAPIBodyInvalidError();
				}
				if (isRecord(args_json) !== true) throw new HyperAPIBodyInvalidError("JSON body must be an object");
				args = args_json;
				break;
			}
			case "multipart/form-data":
				if (!is_multipart_formdata_enabled) throw new HyperAPIBodyUnknownError(type_mime);
				try {
					args = await toFormData(req);
				} catch {
					throw new HyperAPIInvalidParametersError();
				}
				break;
			case "application/x-www-form-urlencoded":
				try {
					args = Object.fromEntries(new URLSearchParams(await toText(req)));
				} catch {
					throw new HyperAPIInvalidParametersError();
				}
				break;
			default: throw new HyperAPIBodyUnknownError(type_mime);
		}
	}
	return args;
}
//#endregion
//#region src/main.ts
var HyperAPINodeDriver = class extends HyperAPIDriver {
	#path;
	#multipart_formdata_enabled;
	#parse_body;
	#server;
	/**
	* @param options -
	* @param options.port - HTTP server port. If not provided, the server listens on a port the OS picks.
	* @param options.path - Path to serve. Default: `/`.
	* @param options.multipart_formdata_enabled - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
	* @param options.parse_body - If `true`, server would parse the request body into `args`. If `false`, the unread request is handed over as `request` instead. Default: `true`.
	* @param options.server_options - Options passed to `http.createServer`.
	*/
	constructor({ port, path = "/", multipart_formdata_enabled = false, parse_body = true, server_options = {} }) {
		super();
		this.#path = path;
		this.#multipart_formdata_enabled = multipart_formdata_enabled;
		this.#parse_body = parse_body;
		this.#server = createServer(server_options, async (req, res) => {
			let response;
			try {
				response = await this.processRequest(req);
			} catch (error) {
				if (error instanceof HyperAPIError) response = hyperApiErrorToResponse(error, isResponseBodyRequired(req.method));
				else {
					console.error("Unhandled error in @hyperapi/driver-node:");
					console.error(error);
					response = { status: 500 };
				}
			}
			res.writeHead(response.status, response.headers ?? {});
			if (response.body !== void 0) res.write(response.body);
			res.end();
		});
		this.#server.listen(port);
	}
	/**
	* Accepts anything HTTP can carry: this transport adds a raw `Response` to
	* the core floor.
	* @param response - The value a module returned.
	* @returns -
	*/
	isValidResponse(response) {
		return response instanceof Response || super.isValidResponse(response);
	}
	/**
	* Handles the HTTP request.
	* @param req - NodeJS request.
	* @returns -
	*/
	async processRequest(req) {
		const http_method = req.method;
		if (isHttpMethodSupported(http_method) !== true) return { status: 405 };
		if (typeof req.url !== "string") throw new TypeError("Request URL is not a string.");
		const url = new URL(req.url, `http://${req.headers.host ?? "unknown"}`);
		if (url.pathname.startsWith(this.#path) !== true) return { status: 404 };
		const hyperapi_http_method = http_method === "HEAD" ? "GET" : http_method;
		const hyperapi_method = url.pathname.slice(this.#path.length);
		const ip_string = req.socket.remoteAddress;
		if (typeof ip_string !== "string") throw new TypeError("Remote address is not a string.");
		const headers = new Headers();
		for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
		else if (Array.isArray(value)) for (const item of value) headers.append(key, item);
		const hyperapi_request_base = {
			method: hyperapi_http_method,
			path: hyperapi_method,
			url,
			headers,
			ip: new IP(ip_string)
		};
		let hyperapi_request;
		if (this.#parse_body) {
			const hyperapi_args = await parseArguments(req, url, this.#multipart_formdata_enabled);
			hyperapi_request = {
				...hyperapi_request_base,
				args: hyperapi_args
			};
		} else hyperapi_request = {
			...hyperapi_request_base,
			args: {},
			req
		};
		const hyperapi_response = await this.fetch(hyperapi_request);
		if (hyperapi_response instanceof HyperAPIError) throw hyperapi_response;
		const should_add_body = isResponseBodyRequired(req.method);
		if (hyperapi_response instanceof Response) {
			const body = new Uint8Array(await hyperapi_response.arrayBuffer());
			return {
				status: hyperapi_response.status,
				headers: {
					...Object.fromEntries(hyperapi_response.headers),
					"Content-Length": String(body.length)
				},
				body: should_add_body ? body : void 0
			};
		}
		const body = TEXT_ENCODER.encode(JSON.stringify(hyperapi_response) ?? "");
		return {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Length": String(body.length)
			},
			body: should_add_body ? body : void 0
		};
	}
	/** Stops the server. */
	async destroy() {
		await new Promise((resolve, reject) => {
			this.#server.close((error) => {
				if (error) reject(error);
				else resolve();
			});
			this.#server.closeIdleConnections();
		});
		await super.destroy();
	}
};
//#endregion
export { HyperAPINodeDriver, toText, toUint8Array };
