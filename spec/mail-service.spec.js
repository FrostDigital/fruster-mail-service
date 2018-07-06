const uuid = require("uuid");
const log = require("fruster-log");
const bus = require("fruster-bus");
const mailService = require("../mail-service");
const testUtils = require("fruster-test-utils");

describe("Mail service", () => {

  var natsServer, busPort, busAddress;

  testUtils.startBeforeEach({
    bus: bus,
    service: mailService
  });

  // Note: Think about disabling this test
  it("should send mail for real", done => {
    let mail = {
      to: "joel@frost.se",
      from: "fruster@frost.se",
      subject: "Hello world from automated test",
      message: "This is a message from me in the future: This is not a good idea."
    };

    bus.request("mail-service.send", {
        data: mail,
        reqId: uuid.v4()
      })
      .then(resp => {
        expect(resp.status).toBe(200);
        done();
      })
      .catch(done.fail);

  });

  it("should send mail and use a template", done => {
    let mail = {
      to: "joel@frost.se",
      from: "fruster@frost.se",
      subject: "Hello world from template test",
      templateId: "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5",
      templateArgs: {
        name: "Joel"
      }
    };

    bus.request("mail-service.send", {
        data: mail,
        reqId: uuid.v4()
      })
      .then(resp => {
        expect(resp.status).toBe(200);
        done();
      })
      .catch(done.fail);

  });


});