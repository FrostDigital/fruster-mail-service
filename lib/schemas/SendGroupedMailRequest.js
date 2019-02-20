const SendMailRequest = require("./SendMailRequest");

module.exports = {
	id: "SendGroupedMailRequest",
	properties: {
		...SendMailRequest.properties,
		key: {
			type: "string",
			decription: "Key to group mails on"
		}
	},
	required: [...SendMailRequest.required, "key"]
};
