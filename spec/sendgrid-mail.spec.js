var log = require('fruster-log'),    
    SendgridMail = require('../lib/sendgrid-mail'),
    conf = require('../conf'),
    uuid = require('uuid'),
    errors = require('../errors');
    

describe('Sendgrid mail', () => {
  
  it('should create valid mail', () => {              

    var mail = new SendgridMail({
      to: 'joel@frost.se',
      from: 'god@frost.se',
      subject: 'Amen',
      message: 'God Bless You'  
    });

    expect(mail.validate()).toBe(true);

    var json = mail.toJSON();

    expect(json.personalizations[0].to[0].email).toBe('joel@frost.se');
    expect(json.personalizations[0].subject).toBe('Amen');
    expect(json.from.email).toBe('god@frost.se');
    expect(json.content[0].value).toBe('God Bless You');
    expect(json.content[0].type).toBe('text/plain');
    
  });

  it('should fail to validate mail', () => {              

    var mail = new SendgridMail({      
      from: 'god@frost.se',      
      message: 'God Bless You'  
    });

    var validationErrors = mail.validate();

    expect(validationErrors.length).toBe(2);
    expect(validationErrors.indexOf('to') > -1).toBe(true);
    expect(validationErrors.indexOf('subject') > -1).toBe(true);    
    
  });

  it('should create mail with multiple recipients', () => {              

    var mail = new SendgridMail({
      to: ['joel@frost.se', 'bob@frost.se'],
      from: 'god@frost.se',
      subject: 'Amen',
      message: 'God Bless You'  
    });

    expect(mail.validate()).toBe(true);

    var json = mail.toJSON();

    expect(json.personalizations[0].to[0].email).toBe('joel@frost.se');
    expect(json.personalizations[0].to[1].email).toBe('bob@frost.se');
    expect(json.personalizations[0].subject).toBe('Amen');
    expect(json.from.email).toBe('god@frost.se');
    expect(json.content[0].value).toBe('God Bless You');
    expect(json.content[0].type).toBe('text/plain');   
    
  });

});