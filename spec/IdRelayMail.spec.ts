import IdRelayMailClient from "../lib/clients/IdRelayMailClient";
import config from "../config";

describe("IdRelayMail", () => {
	const idRelayMailClient = new IdRelayMailClient();

	it("should create valid mail using template", () => {
		const mail = {
			to: "joel@frost.se",
			from: "god@frost.se",
			templateId: "fc69d0b7-b10e-4e05-96f5-6a5ed4d1f01c",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		};

		const { rhandle, data } = idRelayMailClient.getMailData(mail);

		expect(rhandle).toBe("joel@frost.se");
		expect(data.f1).toBe("joel@frost.se");
		expect(data.f3).toEqual(mail.templateArgs);
	});

	it("should fail to validate mail", () => {
		try {
			idRelayMailClient.validate({
				from: "god@frost.se",
				message: "God Bless You"
			});

			fail();
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe("MISSING_FIELDS");
			expect(error.detail).toContain("templateId");
		}
	});

	it("should not fail if not configure properly", async () => {
		const mail = {
			to: "joel@frost.se",
			from: "god@frost.se",
			templateId: "fc69d0b7-b10e-4e05-96f5-6a5ed4d1f01c",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		};

		await idRelayMailClient.sendMail(mail);
	});

	it("should not fail if mail is not sending", async () => {
		const mail = {
			to: ["joel@frost.se", "joel+1@frost.se"],
			from: "god@frost.se",
			templateId: "fc69d0b7-b10e-4e05-96f5-6a5ed4d1f01c",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		};

		config.idRelayUserName = "testUser";
		config.idRelayPassword = "Test@123";

		await idRelayMailClient.sendMail(mail);

		delete config.idRelayUserName;
		delete config.idRelayPassword;
	});
});
