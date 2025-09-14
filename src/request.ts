import type {
	BaseRecord,
	EmptyObject,
	HyperAPIRequest,
} from '@hyperapi/core/dev';
import type { IP } from '@kirick/ip';

export interface HyperAPINodeRequest<A extends BaseRecord = EmptyObject>
	extends HyperAPIRequest<A> {
	// request: Request;
	url: URL;
	headers: Headers;
	ip: IP;
}
