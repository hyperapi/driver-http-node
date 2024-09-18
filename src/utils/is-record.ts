/**
 * Check if a value is a record.
 * @param value -
 * @returns -
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object'
		&& value !== null
		&& !Array.isArray(value)
		&& value.constructor === Object
		&& Object.prototype.toString.call(value) === '[object Object]';
}
