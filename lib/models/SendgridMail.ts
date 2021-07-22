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
		const json = { to: this.to, from: this.from, subject: this.subject };

		if (this.message) { // For text messages
			json.text = this.message;
			json.html = this.message.replace(new RegExp('\r?\n', 'g'), '<br />');
		}

		if (this.templateId) {
			json.templateId = this.templateId;

			if (this.templateId.startsWith("d-")) {// For dynamic templates
				json.dynamic_template_data = this.templateArgs || {};
				json.dynamic_template_data.subject = this.subject;
			} else { // For legacy templates
				json.substitutions = this.templateArgs || {};
			}
		}

		return json;
	}
}

module.exports = SendgridMail;
