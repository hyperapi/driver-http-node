export interface ResponseSchema {
    status: number;
    headers?: Record<string, string>;
    body?: string | undefined;
}
