import { HyperAPIRateLimitError } from '@hyperapi/core';
import { hyperApi } from '../setup.js';

class HyperAPILocalRateLimitError extends HyperAPIRateLimitError<undefined> {
	override httpHeaders = {
		'Retry-After': '3600',
	};
}

export default hyperApi.module().action(() => {
	throw new HyperAPILocalRateLimitError();
});
