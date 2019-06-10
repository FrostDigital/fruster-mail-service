const { defaultFrom } = require("../../config");

class SendgridMail {

	constructor(model) {
		this.from = model.from || defaultFrom;

		if (model.to)
			this.to = Array.isArray(model.to) ? model.to : [model.to];

		this.subject = model.subject;
		this.templateId = model.templateId;
		this.templateArgs = model.templateArgs;
		this.message = model.message;
	}

	/**
	 * Returns whether or not the mail is valid
	 */
	isValid() {
		return this.validate().length === 0;
	}

	/**
	 * Validates mail and returns an array w/ validation errors
	 *
	 * @return {Array<String>}
	 */
	validate() {
		const invalidFields = [];

		if (!this.to || this.to.length === 0)
			invalidFields.push("to");

		if (!this.subject && !this.templateId)
			invalidFields.push("subject");

		if (!this.message && !this.templateId)
			invalidFields.push("message");

		if (!this.from)
			invalidFields.push("from");

		return invalidFields.length > 0 ? invalidFields : [];
	}

	toJSON() {
		const personalization = {
			to: this.to.map(email => { return { email } }),
			subject: this.subject
		};

		if (this.templateId && this.templateArgs) {
			if (this.templateId.startsWith("d-")) // For dynamic templates
				personalization.dynamic_template_data = this.templateArgs ? this.templateArgs : {};
			else {
				personalization.substitutions = this.templateArgs ? this.templateArgs : {};
			}
		}

		return {
			from: { email: this.from },
			content: [this.message ? { type: "text/plain", value: this.message } : { type: "text/html", value: " " }],
			template_id: this.templateId,
			personalizations: [personalization]
		};
	}

}

module.exports = SendgridMail;
