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

		expect(json.to[0]).toBe("joel@frost.se");
		expect(json.subject).toBe("Amen");
		expect(json.from).toBe("god@frost.se");
		expect(json.text).toBe("God Bless You");
	});

	it("should create valid mail using template", () => {
		const mail = new SendgridMail({
			to: "joel@frost.se",
			from: "god@frost.se",
			templateId: "fc69d0b7-b10e-4e05-96f5-6a5ed4d1f01c"
		});

		expect(mail.validate().length).toBe(0);

		const { to, subject, from } = mail.toJSON();

		expect(to[0]).toBe("joel@frost.se");
		expect(subject).toBeFalsy();
		expect(from).toBe("god@frost.se");
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

		expect(json.to[0]).toBe("joel@frost.se");
		expect(json.to[1]).toBe("bob@frost.se");
		expect(json.subject).toBe("Amen");
		expect(json.from).toBe("god@frost.se");
		expect(json.html).toBe("God Bless You");
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

		expect(json.to[0]).toBe("joel@frost.se");
		expect(json.to[1]).toBe("bob@frost.se");
		expect(json.subject).toBe("Amen");
		expect(json.substitutions).toEqual(mail.templateArgs, "substitutions");
		expect(json.from).toBe("god@frost.se");
		expect(json.html).toBe("God Bless You");
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

		expect(json.to[0]).toBe("joel@frost.se");
		expect(json.to[1]).toBe("bob@frost.se");
		expect(json.subject).toBe("Amen");
		expect(json.dynamic_template_data).toEqual(mail.templateArgs, "dynamic_template_data");
		expect(json.from).toBe("god@frost.se");
		expect(json.html).toBe("God Bless You");
	});

});
