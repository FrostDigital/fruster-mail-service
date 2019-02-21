const _ = require("lodash");
const conf = require("../../config");
const Content = require("sendgrid/lib/helpers/mail/mail").Content;

class SendgridMail {

	constructor(model) {
		this.model = model;
		this.model.from = model.from || conf.defaultFrom;
		this.model.to = model.to && _.isString(model.to) ? [model.to] : model.to;
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

		if (_.isEmpty(this.model.to))
			invalidFields.push("to");

		if (_.isEmpty(this.model.subject) && _.isEmpty(this.model.templateId))
			invalidFields.push("subject");


		if (_.isEmpty(this.model.message) && _.isEmpty(this.model.templateId))
			invalidFields.push("message");

		if (_.isEmpty(this.model.from))
			invalidFields.push("from");

		if (_.isEmpty(invalidFields))
			return [];

		return _.isEmpty(invalidFields) ? [] : invalidFields;
	}

	toJSON() {
		const to = _.map(this.model.to, to => ({ email: to }));
		const from = { email: this.model.from };
		const subject = this.model.subject;
		const message = this.model.message;

		return {
			substitutionWrappers: conf.substitutionCharacter,
			personalizations: [{
				to: to,
				subject: subject,
				substitutions: this.createSubstitutions(this.model.templateArgs)
			}
			],
			from: from,
			// content must be set https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/errors.html#message.content.value
			content: [message ? new Content("text/plain", message) : new Content("text/html", " ")],
			template_id: this.model.templateId
		};
	}

    /**
     * @param {Object} obj
     * @param {String=} lastKey
     * @param {Object=} subs
     */
	createSubstitutions(obj, lastKey, subs = {}) {
		if (this.model.templateId && this.model.templateArgs) {

			Object.keys(obj).forEach(k => {
				let identifier = k;

				if (lastKey)
					identifier = `${lastKey}.${identifier}`;

				if (obj[k] && typeof obj[k] === "object")
					this.createSubstitutions(obj[k], identifier, subs);
				else {
					if (!!obj[k])
						subs[conf.substitutionCharacter[0] + identifier + conf.substitutionCharacter[1]] = obj[k].toString();
					else
						subs[conf.substitutionCharacter[0] + identifier + conf.substitutionCharacter[1]] = "";
				}
			});

		}

		return subs;
	}

}

module.exports = SendgridMail;
