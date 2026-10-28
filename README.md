# HyperAPI HTTP Driver for Node.js

[![npm version](https://img.shields.io/npm/v/@hyperapi/driver-node.svg)](https://www.npmjs.com/package/@hyperapi/driver-node)
[![license](https://img.shields.io/npm/l/@hyperapi/driver-node.svg?color=blue)](https://github.com/hyperapi/driver-http-node/blob/main/LICENSE)

HyperAPI HTTP driver for [Node.js](https://nodejs.org), built on the native `http` module.

This driver connects your HyperAPI application to HTTP clients using Node.js's built-in server, providing reliable and efficient request handling.

## Features

- 🔄 **Content Type Support** - Handles JSON, form data, and multipart requests
- 🛡️ **Error Handling** - Seamless integration with HyperAPI error system
- 🧩 **Comprehensive Typing** - Full TypeScript support with HyperAPI Core
- ⚙️ **Configurable** - Customizable server options and multipart handling

## Installation

```bash
bun i @hyperapi/core @hyperapi/driver-node @kirick/ip
# or with pnpm
pnpm add @hyperapi/core @hyperapi/driver-node @kirick/ip
# or with npm
npm install @hyperapi/core @hyperapi/driver-node @kirick/ip
```

If you are new to HyperAPI, start with the [HyperAPI Core documentation](https://github.com/hyperapi/core) to understand the basics of creating APIs with file-based routing and type-safe handlers.

## Quick Start

### 1. Create your HTTP server

```typescript
import { HyperAPI } from '@hyperapi/core';
import { HyperAPINodeDriver } from '@hyperapi/driver-node';

const driver = new HyperAPINodeDriver({
  port: 3000,                        // HTTP server port (default: a port the OS picks)
  path: '/',                         // Base path for API endpoints (default: '/')
  multipart_formdata_enabled: false, // Enable multipart/form-data parsing (default: false)
  parse_body: true,                  // Parse the body into `args` (default: true)
  server_options: {}                 // Options passed to `http.createServer`
});

export const hyperApi = new HyperAPI(
  driver,
  // Optional: root directory of API methods
  // (default: `hyper-api` next to your entrypoint)
  // new URL('api', import.meta.url).pathname
);

console.log('API server running on http://localhost:3000');
```

### 2. Create your API handlers

The HTTP verb lives in the file name, after a `+`. This endpoint answers `GET /hello`:

Example endpoint (`hyper-api/hello+get.ts`):

```typescript
import { HyperAPIInvalidParametersError } from '@hyperapi/core';
import type { HyperAPIRequest } from '@hyperapi/core/dev';
import * as v from 'valibot';
import { hyperApi } from '../main.js';

// Define your validation middleware
function valibot<S extends Parameters<typeof v.parser>[0]>(schema: S) {
  return (request: HyperAPIRequest) => {
    const result = v.safeParse(schema, request.args);
    if (result.success) {
      return { args: result.output };
    }

    throw new HyperAPIInvalidParametersError();
  };
}

// Define your API method code
export default hyperApi.module()
  .use(valibot(
    v.object({ name: v.string() }),
  ))
  .action((request) => {
    return {
      message: `Hello, ${request.args.name}!`,
      clientIP: request.ip.toString(),
    };
  });
```

## Request Properties

The `HyperAPINodeRequest` interface extends the base `HyperAPIRequest` from [HyperAPI Core](https://github.com/hyperapi/core) and adds HTTP-specific properties:

```typescript
interface HyperAPINodeRequest<A extends UnknownRecord = EmptyObject> extends HyperAPIRequest<A> {
  url: URL;         // Full URL object of the request
  headers: Headers; // HTTP headers
  ip: IP;           // Client IP address (using @kirick/ip)
}
```

## Advanced Usage

### Returning HTTP Responses

Return a standard `Response` object for complete control over the HTTP response:

```typescript
// ...
export default hyperApi.module()
  .use(valibot(
    v.object({ name: v.string() }),
  ))
  .action((request) => new Response(
    `Hello, ${request.args.name}!`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    }
  ));
```

### Reading the Raw Request

With `parse_body: false` the driver hands over the unread request instead of parsed `args`, so you can read the body yourself — for signature verification, for example. The request type changes with the option, so `request.req` is only available when you set it:

```typescript
import { HyperAPINodeDriver } from '@hyperapi/driver-node';

const driver = new HyperAPINodeDriver({ port: 3000, parse_body: false });
```

```typescript
import { toText, type HyperAPINodeRequestWithRequest } from '@hyperapi/driver-node';
// ...

export default hyperApi.module()
  .use(async (request: HyperAPINodeRequestWithRequest) => {
    const text = await toText(request.req);

    if (request.headers.get('X-Signature') !== sign(text)) {
      throw new HyperAPIInvalidSignature();
    }

    return { args: JSON.parse(text) };
  })
  .action((request) => {
    return { message: `Hello, ${request.args.name}!` };
  });
```

> [!IMPORTANT]
> `request.req` is a Node `IncomingMessage`, not a `Request`. It is a one-shot stream and cannot be cloned, so read it exactly once and derive everything you need — the signature check and the parsed arguments both — from that single read.

### Body Helpers

Reading that stream is what the driver's two exported helpers are for:

```typescript
import { toText, toUint8Array } from '@hyperapi/driver-node';

const text = await toText(request.req);        // decoded as UTF-8
const bytes = await toUint8Array(request.req); // the raw body
```

### Handling Multipart Requests

To enable `multipart/form-data` processing for file uploads, enable it in the driver configuration:

```typescript
const driver = new HyperAPINodeDriver({
  port: 3000,
  multipart_formdata_enabled: true
});
```

Then in your handler:

```typescript
// ...
export default hyperApi.module()
  .use(valibot(
    v.object({ file: v.file() }),
  ))
  .action(async (request) => {
    const file_contents = await request.args.file.text();

    return { file_contents };
  });
```

### Stopping the server

`destroy()` closes the server and resolves once it has stopped listening. Idle keep-alive connections are closed for you, so it does not hang waiting for a client to disconnect:

```typescript
await hyperApi.destroy();
```

## Error Handling

This driver automatically translates HyperAPI errors into appropriate HTTP responses. For example:

```typescript
import { HyperAPIRateLimitError } from '@hyperapi/core';
// ...

export default hyperApi.module()
  .action((request) => {
    if (isRateLimited(request.ip)) {
      throw new HyperAPIRateLimitError();
      // Will return HTTP 429 with JSON {"code":7,"description":"Rate limit exceeded"}
    }

    return { ok: true };
  });
```

An error class may carry its own HTTP headers, which are sent alongside the JSON body:

```typescript
class HyperAPILocalRateLimitError extends HyperAPIRateLimitError<undefined> {
  override httpHeaders = new Headers({
    'Retry-After': '3600',
  });
}
```

## Contributing

Issues and pull requests are welcome at [our GitHub repository](https://github.com/hyperapi/driver-http-node).
