const uuid = require('uuid');
const serviceId = 'mail-service';

const errorCode = {
  invalidMail: serviceId + '.400.1',
  sendgridFailure: serviceId + '.500.1',
};

module.exports = {

  code: errorCode,

  invalidMail: function(missingFields) {
    var detail = 'Missing field(s): ' + missingFields.join(', ');
    return err(400, errorCode.invalidMail, 'One or many required fields are missing', detail);
  },

  sendgridFailure: function(detail) {    
    return err(500, errorCode.sendgridFailure, 'Failed to send mail via sendgrid', detail);
  }

};

function err(status, code, title, detail) {  
  var e = {
    status: status,
    error: {
      code: code,
      id: uuid.v4(),
      title: title
    }
  };

  if(detail) {
    e.error.detail = detail;
  }

  return e;
}

