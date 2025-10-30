import { createServer } from "node:http";
import { HyperAPIError, HyperAPIInvalidParametersError } from "@hyperapi/core";
import { HyperAPIDriver, isRecord } from "@hyperapi/core/dev";
import { IP } from "@kirick/ip";
import { Blob } from "node:buffer";
import busboy from "busboy";

//#region src/utils/http.ts
/**
* Checks if the response body is required for the given HTTP method.
* @param http_method The HTTP method to check.
* @returns -
*/
function isHttpMethodSupported(http_method) {
	return http_method === "GET" || http_method === "POST" || http_method === "PUT" || http_method === "PATCH" || http_method === "DELETE" || http_method === "HEAD" || http_method === "OPTIONS";
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
//#region src/utils/hyperapi-error.ts
/**
* Converts a HyperAPIError to a Response.
* @param error - The error to convert.
* @param add_body - Whether to add the response body.
* @returns -
*/
function hyperApiErrorToResponse(error, add_body) {
	if (typeof error.httpStatus !== "number") console.warn(`No HTTP status code provided for error ${error.name}, using 500.`);
	const headers = { "Content-Type": "application/json" };
	if (error.httpHeaders) for (const [header, value] of Object.entries(error.httpHeaders)) headers[header] = value;
	let body;
	if (add_body) body = JSON.stringify(error.getResponse());
	return {
		status: error.httpStatus ?? 500,
		headers,
		body
	};
}

//#endregion
//#region src/utils/parse/form-data.ts
/**
* Parses request body as multipart/form-data.
* @param  req - NodeJS request object.
* @returns - JSON object.
*/
function parseFormData(req) {
	return new Promise((resolve) => {
		const bb = busboy({ headers: req.headers });
		const form_data = {};
		bb.on("file", (name, file, info) => {
			const file_parts = [];
			file.on("data", (chunk) => {
				file_parts.push(chunk);
			});
			file.on("end", () => {
				form_data[name] = new Blob(file_parts, { type: info.mimeType });
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
//#region src/utils/parse/text.ts
/**
* Parses request body into text.
* @param  req - NodeJS request object.
* @returns -
*/
function parseText(req) {
	return new Promise((resolve, reject) => {
		const body_parts = [];
		req.on("error", (err) => {
			reject(err);
		});
		req.on("data", (chunk) => {
			body_parts.push(chunk);
		});
		req.on("end", () => {
			resolve(Buffer.concat(body_parts).toString());
		});
	});
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
* @param  multipart_formdata_enabled - Whether to enable multipart/form-data parsing.
* @returns - Arguments.
*/
async function parseArguments(req, url, multipart_formdata_enabled) {
	let args;
	if (req.method === "GET" || req.method === "HEAD") args = Object.fromEntries(url.searchParams.entries());
	else {
		const type_header = req.headers["content-type"];
		const type_mime = typeof type_header === "string" ? getMIME(type_header) : "<no Content-Type header provided>";
		switch (type_mime) {
			case "application/json":
				{
					let args_json;
					try {
						args_json = JSON.parse(await parseText(req));
					} catch {
						throw new HyperAPIBodyInvalidError();
					}
					if (isRecord(args_json) !== true) throw new HyperAPIBodyInvalidError("JSON body must be an object");
					args = args_json;
				}
				break;
			case "multipart/form-data":
				if (multipart_formdata_enabled !== true) throw new HyperAPIBodyUnknownError(type_mime);
				try {
					args = await parseFormData(req);
				} catch {
					throw new HyperAPIInvalidParametersError();
				}
				break;
			case "application/x-www-form-urlencoded":
				try {
					args = Object.fromEntries(new URLSearchParams(await parseText(req)));
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
	port;
	path;
	multipart_formdata_enabled;
	server;
	server_options;
	/**
	* @param options -
	* @param options.port - HTTP server port. Default: `8001`.
	* @param [options.path] - Path to serve. Default: `/api/`.
	* @param [options.multipart_formdata_enabled] - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
	* @param [options.options] - NodeJS server options.
	*/
	constructor({ port, path = "/api/", multipart_formdata_enabled = false, options = {} }) {
		super();
		this.port = port;
		this.path = path;
		this.multipart_formdata_enabled = multipart_formdata_enabled;
		this.server_options = options;
		this.server = createServer(this.server_options, async (req, res) => {
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
		if (process.env.NODE_ENV === "test") this.server.on("error", (error) => {
			if (error && "code" in error && error.code === "EADDRINUSE") {} else throw error;
		});
		this.server.listen(this.port);
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
		if (url.pathname.startsWith(this.path) !== true) return { status: 404 };
		const hyperapi_method = url.pathname.slice(this.path.length);
		const hyperapi_args = await parseArguments(req, url, this.multipart_formdata_enabled);
		const ip_string = req.socket.remoteAddress;
		if (typeof ip_string !== "string") throw new TypeError("Remote address is not a string.");
		const headers = new Headers();
		for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
		else if (Array.isArray(value)) for (const item of value) headers.append(key, item);
		const hyperapi_response = await this.emitRequest({
			method: http_method,
			path: hyperapi_method,
			args: hyperapi_args,
			url,
			headers,
			ip: new IP(ip_string)
		});
		if (hyperapi_response instanceof HyperAPIError) throw hyperapi_response;
		return {
			status: 200,
			headers: { "Content-Type": "application/json" },
			body: isResponseBodyRequired(http_method) ? JSON.stringify(hyperapi_response) : void 0
		};
	}
	/** Stops the server. */
	destroy() {
		this.server?.close();
		super.destroy();
	}
};

//#endregion
export { HyperAPINodeDriver };