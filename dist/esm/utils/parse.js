import { HyperAPIInvalidParametersError } from '@hyperapi/core';
import { isRecord } from './is-record.js';
import { parseFormData } from './parse/form-data.js';
import { parseText } from './parse/text.js';
/**
 * Gets only MIME type from Content-Type header, stripping parameters.
 * @param  type - MIME type.
 * @returns  - MIME type.
 */
function getMIME(type) {
    const index = type.indexOf(';');
    if (index !== -1) {
        return type.slice(0, index).trim();
    }
    return type.trim();
}
class HyperAPIBodyInvalidError extends HyperAPIInvalidParametersError {
    data = {
        message: 'Could not parse body',
    };
    httpStatus = 400;
    constructor(message) {
        super();
        if (message) {
            this.data.message = message;
        }
    }
}
class HyperAPIBodyUnknownError extends HyperAPIInvalidParametersError {
    data = {
        message: 'Unsupported body type',
    };
    httpStatus = 415;
    constructor(mime) {
        super();
        this.data.message = `Unsupported body type: ${mime}`;
    }
}
/**
 * Parses arguments from request.
 * @param  req - NodeJS request object.
 * @param  url - URL object.
 * @param  multipart_formdata_enabled - Whether to enable multipart/form-data parsing.
 * @returns - Arguments.
 */
export async function parseArguments(req, url, multipart_formdata_enabled) {
    let args = {};
    if (req.method === 'GET'
        || req.method === 'HEAD') {
        args = Object.fromEntries(url.searchParams.entries());
    }
    else {
        const type_header = req.headers['content-type'];
        const type_mime = typeof type_header === 'string'
            ? getMIME(type_header)
            : '<no Content-Type header provided>';
        switch (type_mime) {
            case 'application/json':
                {
                    let args_json;
                    try {
                        args_json = JSON.parse(await parseText(req));
                    }
                    catch {
                        throw new HyperAPIBodyInvalidError();
                    }
                    if (isRecord(args_json) !== true) {
                        throw new HyperAPIBodyInvalidError('JSON body must be an object');
                    }
                    args = args_json;
                }
                break;
            case 'multipart/form-data':
                if (multipart_formdata_enabled !== true) {
                    throw new HyperAPIBodyUnknownError(type_mime);
                }
                try {
                    args = await parseFormData(req);
                }
                catch {
                    throw new HyperAPIInvalidParametersError();
                }
                break;
            case 'application/x-www-form-urlencoded':
                try {
                    args = Object.fromEntries(new URLSearchParams(await parseText(req)));
                }
                catch {
                    throw new HyperAPIInvalidParametersError();
                }
                break;
            default:
                throw new HyperAPIBodyUnknownError(type_mime);
        }
    }
    return args;
}
