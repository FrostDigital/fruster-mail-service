const log = require("fruster-log");
const SendgridMail = require("../lib/sendgrid-mail");
const conf = require("../conf");
const uuid = require("uuid");
const errors = require("../errors");
    

describe("Sendgrid mail", () => {
  
  it("should create valid mail", () => {              

    var mail = new SendgridMail({
      to: "joel@frost.se",
      from: "god@frost.se",
      subject: "Amen",
      message: "God Bless You"  
    });

    expect(mail.validate()).toBe(true);

    var json = mail.toJSON();

    expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
    expect(json.personalizations[0].subject).toBe("Amen");
    expect(json.from.email).toBe("god@frost.se");
    expect(json.content[0].value).toBe("God Bless You");
    expect(json.content[0].type).toBe("text/plain");
    
  });

  it("should fail to validate mail", () => {              

    var mail = new SendgridMail({      
      from: "god@frost.se",      
      message: "God Bless You"  
    });

    var validationErrors = mail.validate();

    expect(validationErrors.length).toBe(2);
    expect(validationErrors.indexOf("to") > -1).toBe(true);
    expect(validationErrors.indexOf("subject") > -1).toBe(true);    
    
  });

  it("should create mail with multiple recipients", () => {              

    var mail = new SendgridMail({
      to: ["joel@frost.se", "bob@frost.se"],
      from: "god@frost.se",
      subject: "Amen",
      message: "God Bless You"  
    });

    expect(mail.validate()).toBe(true);

    var json = mail.toJSON();

    expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
    expect(json.personalizations[0].to[1].email).toBe("bob@frost.se");
    expect(json.personalizations[0].subject).toBe("Amen");
    expect(json.from.email).toBe("god@frost.se");
    expect(json.content[0].value).toBe("God Bless You");
    expect(json.content[0].type).toBe("text/plain");   
    
  });

  it("should create mail using template", () => {              

    var mail = new SendgridMail({
      to: ["joel@frost.se", "bob@frost.se"],
      from: "god@frost.se",
      subject: "Amen",
      message: "God Bless You",
      templateId: "f6c88e2d-c23a-45e9-ab56-744dbdf37f27",
      templateArgs: {
        foo: "bar"
      }
    });

    expect(mail.validate()).toBe(true);

    var json = mail.toJSON();

    expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
    expect(json.personalizations[0].to[1].email).toBe("bob@frost.se");
    expect(json.personalizations[0].subject).toBe("Amen");
    expect(json.personalizations[0].substitutions["-foo-"]).toBe("bar");
    expect(json.from.email).toBe("god@frost.se");
    expect(json.content[0].value).toBe("God Bless You");
    expect(json.content[0].type).toBe("text/plain");   
    
  });

});