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
		detail: (detail) => detail
	},
	{
		status: 400,
		code: "SENDGRID_ERRROR",
		title: "Failed to send mail via sendgrid",
		detail: (detail) => detail
	}
];

module.exports = require("fruster-errors")(serviceSpecificErrors);
