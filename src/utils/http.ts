const HTTP_METHODS = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Checks if the given HTTP method is one this driver serves.
 * @param http_method The HTTP method to check.
 * @returns -
 */
export function isHttpMethodSupported(
	http_method: unknown,
): http_method is HttpMethod {
	return HTTP_METHODS.includes(http_method as HttpMethod);
}

/**
 * Checks if the response body is required for the given HTTP method.
 * @param http_method The HTTP method to check.
 * @returns -
 */
export function isResponseBodyRequired(
	http_method: unknown,
): http_method is Exclude<HttpMethod, 'HEAD' | 'OPTIONS'> {
	return http_method !== 'HEAD' && http_method !== 'OPTIONS';
}
