const SendMailRequest = require("./SendMailRequest");

module.exports = {
	id: "SendGroupedMailRequest",
	description: "Request for sending grouped mails. Can be used in two ways: mail contents defined in request or with template. If contents is in request; `to`, `subject`, `message` and `key` are required. If template is used; `to`, `templateId` and `key` are required.",
	properties: {
		...SendMailRequest.properties,
		key: {
			type: "string",
			decription: "Key to group mails on",
			default: "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5"
		}
	},
	required: [...SendMailRequest.required, "key"]
};
