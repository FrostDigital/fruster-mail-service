const _ = require("lodash");
const conf = require("../conf");

class SendgridMail {

  constructor(model) {
    this.model = model;
    this.model.from = model.from || conf.defaultFrom;    
    this.model.to = model.to && _.isString(model.to) ? [ model.to ] : model.to;    
  }

  isValid() {
    return this.validate() === true;
  }

  validate() {    
    var invalidFields = [];

    if(_.isEmpty(this.model.to)) {
      invalidFields.push("to");
    }

    if(_.isEmpty(this.model.subject)) {
      invalidFields.push("subject");
    }

    if(_.isEmpty(this.model.message)) {
      invalidFields.push("message");
    }

    if(_.isEmpty(this.model.from)) {
      invalidFields.push("from");
    }

    if(_.isEmpty(invalidFields)) {
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
      personalizations: [{
          to: to,
          subject: subject,
          substitutions: this.createSubstitutions()
        }
      ],
      from: from,
      content: [{
          type: "text/plain",
          value: message
        }
      ],
      template_id: this.model.templateId
    };
  }

  createSubstitutions() {
    let subs = {};
    
    if(this.model.templateId && this.model.templateArgs) {  

      Object.keys(this.model.templateArgs).forEach(k => {
        subs["-" + k + "-"] = this.model.templateArgs[k];
      });

    }

    return subs;
  }
}

module.exports = SendgridMail;