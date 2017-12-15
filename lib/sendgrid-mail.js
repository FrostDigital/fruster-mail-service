const _ = require("lodash");
const conf = require("../conf");


class SendgridMail {

    constructor(model) {
        this.model = model;
        this.model.from = model.from || conf.defaultFrom;
        this.model.to = model.to && _.isString(model.to) ? [model.to] : model.to;
    }

    isValid() {
        return this.validate() === true;
    }

    validate() {
        var invalidFields = [];

        if (_.isEmpty(this.model.to)) {
            invalidFields.push("to");
        }

        if (_.isEmpty(this.model.subject) && _.isEmpty(this.model.templateId)) {
            invalidFields.push("subject");
        }

        if (_.isEmpty(this.model.message) && _.isEmpty(this.model.templateId)) {
            invalidFields.push("message");
        }

        if (_.isEmpty(this.model.from)) {
            invalidFields.push("from");
        }

        if (_.isEmpty(invalidFields)) {
            return true;
        }

        return _.isEmpty(invalidFields) ? true : invalidFields;
    }

    toJSON() {
        const to = _.map(this.model.to, to => {
            return { email: to };
        });
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
            content: [{
                type: "text/plain",
                value: message || " " // <-- content must be set https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/errors.html#message.content.value
            }
            ],
            template_id: this.model.templateId
        };
    }

    createSubstitutions(obj, lastKey, subs = {}) {
        if (this.model.templateId && this.model.templateArgs) {

            Object.keys(obj).forEach(k => {
                let identifier = k;

                if (lastKey) {
                    identifier = `${lastKey}.${identifier}`;
                }

                if (obj[k] && typeof obj[k] === "object") {
                    this.createSubstitutions(obj[k], identifier, subs);
                } else {
                    subs[conf.substitutionCharacter[0] + identifier + conf.substitutionCharacter[1]] = obj[k].toString();
                }
            });

        }

        return subs;
    }

}

module.exports = SendgridMail;