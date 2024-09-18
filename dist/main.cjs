"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  HyperAPINodeDriver: () => HyperAPINodeDriver
});
module.exports = __toCommonJS(main_exports);
var import_node_http = require("node:http");
var import_core2 = require("@hyperapi/core");
var import_ip = require("@kirick/ip");

// src/utils/parse.ts
var import_core = require("@hyperapi/core");

// src/utils/is-record.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && value.constructor === Object && Object.prototype.toString.call(value) === "[object Object]";
}

// src/utils/parse/form-data.ts
var import_busboy = __toESM(require("busboy"), 1);
var import_node_buffer = require("node:buffer");
function parseFormData(req) {
  return new Promise((resolve) => {
    const bb = (0, import_busboy.default)({
      headers: req.headers
    });
    const form_data = {};
    bb.on(
      "file",
      (name, file, info) => {
        const file_parts = [];
        file.on(
          "data",
          (chunk) => {
            file_parts.push(chunk);
          }
        );
        file.on(
          "end",
          () => {
            form_data[name] = new import_node_buffer.Blob(
              file_parts,
              {
                type: info.mimeType
              }
            );
          }
        );
      }
    );
    bb.on(
      "field",
      (name, value) => {
        form_data[name] = value;
      }
    );
    bb.on(
      "close",
      () => {
        resolve(form_data);
      }
    );
    req.pipe(bb);
  });
}

// src/utils/parse/text.ts
async function parseText(req) {
  const body_parts = [];
  for await (const chunk of req) {
    body_parts.push(chunk);
  }
  return Buffer.concat(body_parts).toString();
}

// src/utils/parse.ts
function getMIME(type) {
  const index = type.indexOf(";");
  if (index !== -1) {
    return type.slice(0, index).trim();
  }
  return type.trim();
}
var HyperAPIBodyInvalidError = class extends import_core.HyperAPIInvalidParametersError {
  data = {
    message: "Could not parse body"
  };
  httpStatus = 400;
  constructor(message) {
    super();
    if (message) {
      this.data.message = message;
    }
  }
};
var HyperAPIBodyUnknownError = class extends import_core.HyperAPIInvalidParametersError {
  data = {
    message: "Unsupported body type"
  };
  httpStatus = 415;
  constructor(mime) {
    super();
    this.data.message = `Unsupported body type: ${mime}`;
  }
};
async function parseArguments(req, url, multipart_formdata_enabled) {
  let args = {};
  if (req.method === "GET" || req.method === "HEAD") {
    args = Object.fromEntries(
      url.searchParams.entries()
    );
  } else {
    const type_header = req.headers["content-type"];
    const type_mime = typeof type_header === "string" ? getMIME(type_header) : "<no Content-Type header provided>";
    switch (type_mime) {
      case "application/json":
        {
          let args_json;
          try {
            args_json = JSON.parse(
              await parseText(req)
            );
          } catch {
            throw new HyperAPIBodyInvalidError();
          }
          if (isRecord(args_json) !== true) {
            throw new HyperAPIBodyInvalidError("JSON body must be an object");
          }
          args = args_json;
        }
        break;
      case "multipart/form-data":
        if (multipart_formdata_enabled !== true) {
          throw new HyperAPIBodyUnknownError(type_mime);
        }
        try {
          args = await parseFormData(req);
        } catch {
          throw new import_core.HyperAPIInvalidParametersError();
        }
        break;
      case "application/x-www-form-urlencoded":
        try {
          args = Object.fromEntries(
            new URLSearchParams(
              await parseText(req)
            )
          );
        } catch {
          throw new import_core.HyperAPIInvalidParametersError();
        }
        break;
      default:
        throw new HyperAPIBodyUnknownError(type_mime);
    }
  }
  return args;
}

// src/utils/hyperapi-error.ts
function hyperApiErrorToResponse(error, add_body) {
  if (typeof error.httpStatus !== "number") {
    console.warn(`No HTTP status code provided for error ${error.name}, using 500.`);
  }
  const headers = {
    "Content-Type": "application/json"
  };
  if (error.httpHeaders) {
    for (const [header, value] of Object.entries(error.httpHeaders)) {
      headers[header] = value;
    }
  }
  let body;
  if (add_body) {
    body = JSON.stringify(
      error.getResponse()
    );
  }
  return {
    status: error.httpStatus ?? 500,
    headers,
    body
  };
}

// src/utils/http.ts
function isHttpMethodSupported(http_method) {
  return http_method === "GET" || http_method === "POST" || http_method === "PUT" || http_method === "PATCH" || http_method === "DELETE" || http_method === "HEAD" || http_method === "OPTIONS";
}
function isResponseBodyRequired(http_method) {
  return http_method !== "HEAD" && http_method !== "OPTIONS";
}

// src/main.ts
var HyperAPINodeDriver = class {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler = null;
  port;
  path;
  multipart_formdata_enabled;
  server = null;
  server_options;
  /**
   * @param options -
   * @param options.port - HTTP server port. Default: `8001`.
   * @param [options.path] - Path to serve. Default: `/api/`.
   * @param [options.multipart_formdata_enabled] - If `true`, server would parse `multipart/form-data` requests. Default: `false`.
   * @param [options.options] - NodeJS server options.
   */
  constructor({
    port,
    path = "/api/",
    multipart_formdata_enabled = false,
    options = {}
  }) {
    this.port = port;
    this.path = path;
    this.multipart_formdata_enabled = multipart_formdata_enabled;
    this.server_options = options;
  }
  /**
   * Starts the server.
   * @param handler - The handler to use.
   */
  start(handler) {
    this.handler = handler;
    this.server = (0, import_node_http.createServer)(
      this.server_options,
      async (req, res) => {
        let response;
        try {
          response = await this.processRequest(req);
        } catch (error) {
          if (error instanceof import_core2.HyperAPIError) {
            response = hyperApiErrorToResponse(
              error,
              isResponseBodyRequired(req.method)
            );
          } else {
            console.error("Unhandled error in @hyperapi/driver-node:");
            console.error(error);
            response = { status: 500 };
          }
        }
        res.writeHead(
          response.status,
          response.headers ?? {}
        );
        if (response.body !== void 0) {
          res.write(response.body);
        }
        res.end();
      }
    );
    this.server.listen(this.port);
  }
  /** Stops the server. */
  stop() {
    this.server?.close();
  }
  /**
   * Handles the HTTP request.
   * @param req - NodeJS request.
   * @returns -
   */
  async processRequest(req) {
    if (!this.handler) {
      throw new Error("No handler available.");
    }
    const http_method = req.method;
    if (isHttpMethodSupported(http_method) !== true) {
      return { status: 405 };
    }
    if (typeof req.url !== "string") {
      throw new TypeError("Request URL is not a string.");
    }
    const url = new URL(
      req.url,
      `http://${req.headers.host ?? "unknown"}`
    );
    if (url.pathname.startsWith(this.path) !== true) {
      return { status: 404 };
    }
    const hyperapi_method = url.pathname.slice(
      this.path.length
    );
    const hyperapi_args = await parseArguments(
      req,
      url,
      this.multipart_formdata_enabled
    );
    const ip_string = req.socket.remoteAddress;
    if (typeof ip_string !== "string") {
      throw new TypeError("Remote address is not a string.");
    }
    const hyperapi_response = await this.handler({
      method: http_method,
      path: hyperapi_method,
      args: hyperapi_args,
      url,
      headers: req.headers,
      ip: new import_ip.IP(ip_string)
    });
    if (hyperapi_response instanceof import_core2.HyperAPIError) {
      throw hyperapi_response;
    }
    return {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: isResponseBodyRequired(http_method) ? JSON.stringify(hyperapi_response) : void 0
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HyperAPINodeDriver
});
