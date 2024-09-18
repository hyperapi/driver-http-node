/**
 * Parses request body into text.
 * @param  req - NodeJS request object.
 * @returns -
 */
export async function parseText(req) {
    const body_parts = [];
    for await (const chunk of req) {
        body_parts.push(chunk);
    }
    return Buffer.concat(body_parts).toString();
}
