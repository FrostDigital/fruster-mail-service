import { EmailData } from "@sendgrid/helpers/classes/email-address";

import config from "../../config";
import errors from "../../lib/errors";
import SendGridMailClient from "../../lib/clients/SendGridMailClient";

describe("SendgridMail", () => {
	const sendGridMailClient = new SendGridMailClient();

	it("should create valid mail", () => {
		const mail = {
			to: "joel@frost.se",
			from: "god@frost.se",
			subject: "Amen",
			message: "God Bless You"
		};

		const { to, subject, from, text } = sendGridMailClient.getMailData(mail);

		expect(to).toBe("joel@frost.se");
		expect(subject).toBe("Amen");
		expect(from).toBe("god@frost.se");
		expect(text).toBe("God Bless You");
	});

	it("should create valid mail using template", () => {
		const mail = {
			to: "joel@frost.se",
			from: "god@frost.se",
			templateId: "fc69d0b7-b10e-4e05-96f5-6a5ed4d1f01c"
		};

		const { to, subject, from } = sendGridMailClient.getMailData(mail);

		expect(to).toBe("joel@frost.se");
		expect(subject).toBeFalsy();
		expect(from).toBe("god@frost.se");
	});

	it("should fail to validate mail", () => {
		try {
			sendGridMailClient.validate({
				from: "god@frost.se",
				message: "God Bless You"
			});

			fail();
		} catch (error: any) {
			expect(error.status).toBe(400);
			expect(error.error.code).toBe("MISSING_FIELDS");
			expect(error.error.detail).toContain("subject");
		}
	});

	it("should create mail with multiple recipients", () => {
		const mail = {
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen",
			message: "God Bless You"
		};

		const { to, subject, from, html } = sendGridMailClient.getMailData(mail);

		expect((to as EmailData[])[0]).toBe("joel@frost.se");
		expect((to as EmailData[])[1]).toBe("bob@frost.se");
		expect(subject).toBe("Amen");
		expect(from).toBe("god@frost.se");
		expect(html).toBe("God Bless You");
	});

	it("should create mail using legacy template", () => {
		const mail = {
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen",
			templateId: "f6c88e2d-c23a-45e9-ab56-744dbdf37f27",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		};

		const { to, subject, from, substitutions, substitutionWrappers } = sendGridMailClient.getMailData(mail);

		expect((to as EmailData[])[0]).toBe("joel@frost.se");
		expect((to as EmailData[])[1]).toBe("bob@frost.se");
		expect(subject).toBe("Amen");
		//@ts-ignore but substitutions need only simple object.
		expect(substitutions).toEqual(mail.templateArgs, "substitutions");
		expect(from).toBe("god@frost.se");
		expect(substitutionWrappers).toEqual(config.substitutionCharacter);
	});

	it("should create mail using transactional template", () => {
		const mail = {
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen",
			templateId: "d-6c88e2d-c23a-45e9-ab56-744dbdf37f2",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		};

		const { to, subject, dynamicTemplateData, from } = sendGridMailClient.getMailData(mail);

		expect((to as EmailData[])[0]).toBe("joel@frost.se");
		expect((to as EmailData[])[1]).toBe("bob@frost.se");
		expect(subject).toBe("Amen");
		expect(dynamicTemplateData).toEqual(mail.templateArgs);
		expect(from).toBe("god@frost.se");
	});

	it("should throw error if request has not message or templateId", () => {
		const mail = {
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen"
		};

		try {
			sendGridMailClient.getMailData(mail);
			fail();
		} catch (error: any) {
			expect(error.status).toBe(400);
			expect(error.error.code).toBe(errors.badRequest().error.code);
			expect(error.error.detail).toBe("The request has not message or templateId");
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

		await sendGridMailClient.sendMail(mail);
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

		config.sendGridApiKey = "testUser";

		await sendGridMailClient.sendMail(mail);

		config.sendGridApiKey = "";
	});

});
