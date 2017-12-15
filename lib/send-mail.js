const conf = require("../conf");
const sg = require("sendgrid")(conf.sendgridApiKey);
const errors = require("../errors");
const SendgridMail = require("./sendgrid-mail");
const log = require("fruster-log");

module.exports = sendMail;

function sendMail(req) {
    var mail = new SendgridMail(req.data);

    if (!mail.isValid()) {
        var validationErrors = mail.validate();
        log.debug("Mail is invalid:", validationErrors);
        return errors.invalidMail(validationErrors);
    }

    return sg.API(createSendgridReq(mail))
        .then(() => {
            log.debug("Succesfully sent mail(s)");
            return { status: 200 };
        })
        .catch(error => {
            console.log(error);
            log.warn("Got failure from sendgrid", error);
            return errors.sendgridFailure(error);
        });
}

function createSendgridReq(mail) {
    return {
        method: "POST",
        path: "/v3/mail/send",
        body: mail.toJSON()
    };
}



