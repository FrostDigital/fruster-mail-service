const config = require("../../config");

module.exports = {
	id: "SendMailRequest",
	additionalProperties: false,
	properties: {
		to: {
			type: ["string", "array"],
			items: {
				type: "string",
				description: "email address"
			},
			description: "Email or emails to send mail to",
			default: ["ramjam@frost.se"]
		},
		from: {
			type: "string",
			description: "Email address to send mail from",
			default: config.defaultFrom
		},
		subject: {
			type: "string",
			description: "The subject of the mail being sent",
			default: "Hello from anywhere else"
		},
		message: {
			type: "string",
			description: "The mail body being sent",
			default: "&lt;h1&gt;Hello&lt;/h1&gt; This is the body of the mail!"
		},
		templateId: {
			type: "string",
			description: "An optional id of a sendgrid template to use. If this is used, the message field is ignored.",
			default: "5dc78985-ee1f-431d-9266-5eb1a2e7fb96"
		},
		templateArgs: {
			type: "object",
			description: `Arguments for the template. Uses \`${config.substitutionCharacter[0]}${config.substitutionCharacter[1]}\` to replace arguments in template body. E.g. \`${config.substitutionCharacter[0]}firstName${config.substitutionCharacter[1]}\` in message body is replaced by the value of \`templateArgs.firstName\``,
			default: {
				firstName: "ola",
				lastName: "bandola",
				score: 1337
			}
		},
	},
	required: ["to", "subject"]
};
