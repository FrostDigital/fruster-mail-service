import {buildErrors} from "@fruster/bus";

/*
	This is the place to define custom errors this service may throw in addition
	to default ones (BAD_REQUEST, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, INTERNAL_SERVER_ERROR).
	If error reaches API Gateway it will use `status` as HTTP status code.
*/
const serviceSpecificErrors = [
	{
		status: 400,
		code: "MISSING_FIELDS",
		title: "One or many required fields are missing",
		detail: (detail: string) => detail
	},
];

export default buildErrors(serviceSpecificErrors);
