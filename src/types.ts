export interface ResponseSchema {
	status: number;
	headers?: Record<string, string>;
	body?: Uint8Array | undefined;
}
