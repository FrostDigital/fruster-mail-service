const log = require("fruster-log");
const bus = require("fruster-bus");
const nsc = require("nats-server-control");
const mailService = require("../mail-service");

describe("Mail service", () => {
  
  var natsServer, busPort, busAddress;    
  
  beforeEach(done => {
    busPort = Math.floor(Math.random() * 6000 + 2000);
    busAddress = "nats://localhost:" + busPort;

    nsc.startServer(busPort)
      .then(server => { natsServer = server; })
      .then(x => mailService.start(busAddress))
      .then(done)
      .catch(done.fail);
  });

  afterEach(() => {     
    if(natsServer) {
      natsServer.kill();      
    }
  });

  // Note: Think about disabling this test
  it("should send mail for real", done => {              
    var mail = {
      to: "joel@frost.se",
      from: "fruster@frost.se",
      subject: "Hello world from automated test",
      message: "This is a message from me in the future: This is not a good idea."
    };

    bus.request("mail-service.send", { data: mail })
    .then(resp => {
      expect(resp.status).toBe(200);
      done();
    })
    .catch(done.fail);
    
  });

  it("should send mail and use a template", done => {              
    var mail = {
      to: "joel@frost.se",
      from: "fruster@frost.se",
      subject: "Hello world from template test",
      message: "This is the message body.",
      templateId: "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5",
      templateArgs: {
        name: "Joel"
      }
    };

    bus.request("mail-service.send", { data: mail })
    .then(resp => {
      expect(resp.status).toBe(200);
      done();
    })
    .catch(done.fail);
    
  });


});