type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
/**
 * Checks if the response body is required for the given HTTP method.
 * @param http_method The HTTP method to check.
 * @returns -
 */
export declare function isHttpMethodSupported(http_method: unknown): http_method is HttpMethod;
/**
 * Checks if the response body is required for the given HTTP method.
 * @param http_method The HTTP method to check.
 * @returns -
 */
export declare function isResponseBodyRequired(http_method: unknown): http_method is Exclude<HttpMethod, 'HEAD' | 'OPTIONS'>;
export {};
