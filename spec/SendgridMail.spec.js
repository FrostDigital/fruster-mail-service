const SendgridMail = require("../lib/models/SendgridMail");

describe("SendgridMail", () => {

	it("should create valid mail", () => {
		const mail = new SendgridMail({
			to: "joel@frost.se",
			from: "god@frost.se",
			subject: "Amen",
			message: "God Bless You"
		});

		expect(mail.validate().length).toBe(0);

		const json = mail.toJSON();

		expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
		expect(json.personalizations[0].subject).toBe("Amen");
		expect(json.from.email).toBe("god@frost.se");
		expect(json.content[0].value).toBe("God Bless You");
		expect(json.content[0].type).toBe("text/plain");
	});

	it("should create valid mail using template", () => {
		const mail = new SendgridMail({
			to: "joel@frost.se",
			from: "god@frost.se",
			templateId: "fc69d0b7-b10e-4e05-96f5-6a5ed4d1f01c"
		});

		expect(mail.validate().length).toBe(0);

		const { personalizations, from: { email }, content } = mail.toJSON();

		expect(personalizations[0].to[0].email).toBe("joel@frost.se");
		expect(personalizations[0].subject).toBeFalsy();
		expect(email).toBe("god@frost.se");
		expect(content[0].value).toBe(" ");
	});

	it("should fail to validate mail", () => {
		const mail = new SendgridMail({
			from: "god@frost.se",
			message: "God Bless You"
		});

		const validationErrors = mail.validate();

		expect(validationErrors.length).toBe(2);
		expect(validationErrors.indexOf("to") > -1).toBe(true);
		expect(validationErrors.indexOf("subject") > -1).toBe(true);
	});

	it("should create mail with multiple recipients", () => {
		const mail = new SendgridMail({
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen",
			message: "God Bless You"
		});

		expect(mail.validate().length).toBe(0);

		const json = mail.toJSON();

		expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
		expect(json.personalizations[0].to[1].email).toBe("bob@frost.se");
		expect(json.personalizations[0].subject).toBe("Amen");
		expect(json.from.email).toBe("god@frost.se");
		expect(json.content[0].value).toBe("God Bless You");
		expect(json.content[0].type).toBe("text/plain");
	});

	it("should create mail using legacy template", () => {
		const mail = new SendgridMail({
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen",
			message: "God Bless You",
			templateId: "f6c88e2d-c23a-45e9-ab56-744dbdf37f27",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		});

		expect(mail.validate().length).toBe(0);

		const json = mail.toJSON();

		expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
		expect(json.personalizations[0].to[1].email).toBe("bob@frost.se");
		expect(json.personalizations[0].subject).toBe("Amen");
		expect(json.personalizations[0].substitutions).toEqual(mail.templateArgs, "substitutions");
		expect(json.from.email).toBe("god@frost.se");
		expect(json.content[0].value).toBe("God Bless You");
		expect(json.content[0].type).toBe("text/plain");
	});

	it("should create mail using transactional template", () => {
		const mail = new SendgridMail({
			to: ["joel@frost.se", "bob@frost.se"],
			from: "god@frost.se",
			subject: "Amen",
			message: "God Bless You",
			templateId: "d-6c88e2d-c23a-45e9-ab56-744dbdf37f2",
			templateArgs: {
				foo: "bar",
				ram: {
					jam: 1337,
					bon: { ravioli: { inside: "Object" } }
				}
			}
		});

		expect(mail.validate().length).toBe(0);

		const json = mail.toJSON();

		expect(json.personalizations[0].to[0].email).toBe("joel@frost.se");
		expect(json.personalizations[0].to[1].email).toBe("bob@frost.se");
		expect(json.personalizations[0].subject).toBe("Amen");
		expect(json.personalizations[0].dynamic_template_data).toEqual(mail.templateArgs, "dynamic_template_data");
		expect(json.from.email).toBe("god@frost.se");
		expect(json.content[0].value).toBe("God Bless You");
		expect(json.content[0].type).toBe("text/plain");
	});

});
