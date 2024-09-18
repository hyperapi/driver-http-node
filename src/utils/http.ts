type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Checks if the response body is required for the given HTTP method.
 * @param http_method The HTTP method to check.
 * @returns -
 */
export function isHttpMethodSupported(http_method: unknown): http_method is HttpMethod {
	return http_method === 'GET'
		|| http_method === 'POST'
		|| http_method === 'PUT'
		|| http_method === 'PATCH'
		|| http_method === 'DELETE'
		|| http_method === 'HEAD'
		|| http_method === 'OPTIONS';
}

/**
 * Checks if the response body is required for the given HTTP method.
 * @param http_method The HTTP method to check.
 * @returns -
 */
export function isResponseBodyRequired(http_method: unknown): http_method is Exclude<HttpMethod, 'HEAD' | 'OPTIONS'> {
	return http_method !== 'HEAD'
		&& http_method !== 'OPTIONS';
}
