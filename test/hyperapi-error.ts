import { HyperAPIError } from '@hyperapi/core';

export class HyperAPIInvalidSignature extends HyperAPIError {
	override code = 101;
	override description = 'Invalid signature';
	override httpStatus = 403;
}
