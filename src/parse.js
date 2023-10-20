
import { decode, encode } from 'cbor-x';

export async function parseArguments(request, url) {
	let args = {};

	if (request.method === 'GET' || request.method === 'HEAD') {
		for (const [ key, value ] of url.searchParams.entries()) {
			args[key] = value;
		}
	}
	else if (request.body) {
		// replace by regexp is faster than split.
		const type_header = request.headers.get('Content-Type').replace(/;.+/, '');
		switch (type_header) {
			case 'application/json':
				args = await request.json();
				break;
			case 'application/x-www-form-urlencoded':
				args = Object.fromEntries(
					new URLSearchParams(
						await request.text(),
					),
				);
				break;
			case 'application/cbor':
				args = decode(await request.arrayBuffer());
				break;
			default:
				return 'UNSUPPORTED_CONTENT_TYPE';
		}
	}
	return args;
}

export function parseAcceptHeader(header) {
	const types = header.split(/\s*(;|,)\s*/);
	if (types.some((type) => /.+\/(\*|json)/.test(type))) {
		return 'json';
	}
	if (types.some((type) => /.+\/(\*|cbor)/.test(type))) {
		return 'cbor';
	}
	return 'json';
}

export function parseResponseTo(format, body) {
	if (format === 'json') {
		return JSON.stringify(body);
	}
	if (format === 'cbor') {
		return encode(body);
	}
}

