
import { OhMyPropsObjectValidator } from 'oh-my-props';

export default function (request) {
	return {
		message: `Hello, ${request.args.name}!`,
	};
}

export const args = new OhMyPropsObjectValidator({
	name: {
		type: String,
		validator: (value) => value.length > 0 && value.length < 10,
	},
});
