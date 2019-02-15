const conf = require("../conf");
const sg = require("sendgrid")(conf.sendgridApiKey);
const errors = require("../errors");
const SendgridMail = require("./sendgrid-mail");
const log = require("fruster-log");

module.exports = sendMail;

async function sendMail(req) {
    const mails = Array.isArray(req.data.to) ? req.data.to.map(to => new SendgridMail({ ...req.data, to: [to] })) : [new SendgridMail(req.data)];

    if (!mails[0].isValid()) {
        var validationErrors = mails[0].validate();
        log.debug("Mail is invalid:", validationErrors);
        return errors.invalidMail(validationErrors);
    }

    try {
        for (let email of mails) {
            await sg.API(createSendgridReq(email));

            log.debug("Succesfully sent 1 mail", email.model.subject);
        }
    } catch (err) {
        console.log(err);
        log.warn("Got failure from sendgrid", err);
    }

    return { status: 200 };
}

function createSendgridReq(mail) {

    return {
        method: "POST",
        path: "/v3/mail/send",
        body: mail.toJSON()
    };
}
