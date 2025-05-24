# HyperAPI HTTP Driver for Node.js

[![npm version](https://img.shields.io/npm/v/@hyperapi/driver-node.svg)](https://www.npmjs.com/package/@hyperapi/driver-node)
[![license](https://img.shields.io/npm/l/@hyperapi/driver-node.svg?color=blue)](https://github.com/hyperapi/driver-http-node/blob/main/LICENSE)

HyperAPI HTTP driver for [Node.js](https://nodejs.org) built on the native `http` module.

This driver connects your HyperAPI application to HTTP clients using Node.js's built-in server capabilities, providing reliable and efficient request handling.

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

## Quick Start

### 1. Create your HTTP server

```typescript
import { HyperAPI } from '@hyperapi/core';
import { HyperAPINodeDriver } from '@hyperapi/driver-node';

// Create a driver instance
const driver = new HyperAPINodeDriver({
  port: 3000,                        // HTTP server port
  path: '/api/',                     // Base path for API endpoints (default: '/api/')
  multipart_formdata_enabled: false, // Enable multipart/form-data parsing (default: false)
  options: {}                        // Optional Node.js server options
});

// Initialize HyperAPI with the driver
const hyperApiCore = new HyperAPI({
  driver,
  // Optional: custom root path for API methods (default: 'hyper-api' in project root)
  // root: path.join(__dirname, 'api')
});

console.log('API server running on http://localhost:3000');
```

### 2. Create your API handlers

Example endpoint (`hyper-api/hello.[get].ts`):

```typescript
import type { HyperAPIResponse } from '@hyperapi/core';
import type { HyperAPINodeRequest } from '@hyperapi/driver-node';
import * as v from 'valibot';

// Define your handler function
export default function(request: HyperAPINodeRequest): HyperAPIResponse {
  return {
    message: `Hello, ${request.args.name}!`,
    timestamp: new Date().toISOString(),
    clientIP: request.ip.toString(),
  };
}

// Define input validation
export const argsValidator = v.parser(
  v.strictObject({
    name: v.string('Name is required'),
  })
);
```

## Request Properties

The `HyperAPINodeRequest` interface extends the base `HyperAPIRequest` from [HyperAPI Core](https://github.com/hyperapi/core) and adds HTTP-specific properties:

```typescript
interface HyperAPINodeRequest<A extends Record<string, unknown>> extends HyperAPIRequest<A> {
  url: URL;         // Full URL object of the request
  headers: Headers; // HTTP headers
  ip: IP;           // Client IP address (using @kirick/ip)
}
```

## Advanced Usage

### Accessing Request Details

```typescript
export default function(request: HyperAPINodeRequest): HyperAPIResponse {
  const userAgent = request.headers['user-agent'];
  const clientIP = request.ip.toString();
  const fullUrl = request.url.toString();

  return {
    userAgent,
    clientIP,
    fullUrl,
    data: request.args
  };
}
```

### Handling File Uploads

To enable `multipart/form-data` processing for file uploads:

```typescript
const driver = new HyperAPINodeDriver({
  port: 3000,
  multipart_formdata_enabled: true
});
```

Then in your handler:

```typescript
export default async function(request: HyperAPINodeRequest): Promise<HyperAPIResponse> {
  const file = request.args.myFile; // If a file was uploaded with name 'myFile', it will contain the Blob
  const file_contents = await file.text(); // Read file contents as text

  return { file_contents };
}
```

## Error Handling

This driver automatically translates HyperAPI errors into appropriate HTTP responses. For example:

```typescript
import { HyperAPIRateLimitError } from '@hyperapi/core';

export default function(request: HyperAPINodeRequest): HyperAPIResponse {
  // Check some condition
  if (isRateLimited(request.ip)) {
    throw new HyperAPIRateLimitError();
    // Will return HTTP 429 with JSON {"code":7,"description":"Rate limit exceeded"}
  }

  // Normal processing
  return {
    message: "Success"
  };
}
```

## TypeScript Support

For complete type safety, specify your argument types:

```typescript
export default function(
  request: HyperAPINodeRequest<{
    id: number;
    name: string;
  }>
): HyperAPIResponse {
  // request.args.id and request.args.name are now properly typed
  return {
    message: `Hello, ${request.args.name} (ID: ${request.args.id})!`
  };
}
```

## Contributing

Issues and pull requests are welcome at [our GitHub repository](https://github.com/hyperapi/driver-http-node).
