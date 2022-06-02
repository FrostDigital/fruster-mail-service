import handlebars from "handlebars";
import handlebarsHelpers from 'handlebars-helpers';
import config from "../../config";
import AbstractMailClient from "../clients/AbstractMailClient";
import errors from "../errors";
import Mail from "../models/Mail";
import TemplateRepo from "../repos/TemplateRepo";

const helpers = handlebarsHelpers();

for (const k in helpers) {
	handlebars.registerHelper(k, helpers[k]);
}

const layoutContentRegexp = /\{\{\s?content\s?\}\}/;
class MailManager {

	private mailClient!: AbstractMailClient;

	templateRepo?: TemplateRepo;

	private templateCache = new Map<string, Handlebars.TemplateDelegate>();

	//It is not possible to inject mail client. It is making issues with unit tests.
	constructor(mailClient: AbstractMailClient) {
		this.mailClient = mailClient;
	}

	async sendMail({ to, from, subject, templateId, templateArgs, message }: Mail) {
		const isMultipleTo = Array.isArray(to);

		if (isMultipleTo && !to.length)
			throw errors.badRequest("`to` array cannot empty");

		if (config.templatesEnabled && templateId) {
			const templateFn = await this.getTemplate(templateId);
			message = templateFn(templateArgs);
		}

		this.mailClient.validate({ to, from, subject, templateId, message });

		if (config.catchAllEmail) {
			if (isMultipleTo)
				to = (to as string[]).map(this.setCatchMail);
			else
				to = this.setCatchMail(to as string);
		}

		await this.mailClient.sendMail({
			to,
			from: from || config.defaultFrom,
			subject,
			templateId: config.templatesEnabled ? undefined : templateId,
			templateArgs: config.templatesEnabled ? undefined : templateArgs,
			message
		});
	}

	async sendGroupedMail(mail: Mail, numberOfMails: number) {
		if (mail.subject)
			mail.subject = mail.subject.split("{{n}}").join(numberOfMails.toString());

		if (mail.message)
			mail.message = mail.message.split("{{n}}").join(numberOfMails.toString());

		if (mail.templateId) {
			if (!mail.templateArgs)
				mail.templateArgs = {};

			mail.templateArgs.n = numberOfMails;
		}

		return await this.sendMail(mail);
	}

	purgeTemplateCache(templateId: string) {
		this.templateCache.delete(templateId);
	}

	private setCatchMail(email: string): string {
		if (config.catchAllWhitelist) {
			const toDomain = email.split("@")[1];
			return config.catchAllWhitelist.includes(toDomain) ? email : config.catchAllEmail as string;
		} else {
			return config.catchAllEmail as string; //This will not undefined because it is already checked before
		}
	}

	private async getTemplate(templateId: string) {
		if (!this.templateRepo) {
			throw new Error("templateRepo is not set, should not happen");
		}

		const templateFromCache = this.templateCache.get(templateId);

		if (templateFromCache) {
			return templateFromCache;
		}

		const template = await this.templateRepo.getById(templateId);

		if (!template) {
			throw new Error(`Cannot send mail, template ${templateId} does not exist`);
		}

		let layoutHtml = "";

		if (template.layout) {
			const layout = await this.templateRepo.getById(template.layout);

			if (!layout) {
				throw new Error(`Cannot send mail, layout ${template.layout} referenced from template ${templateId} does not exist`);
			}

			if (layout.layout) {
				throw new Error(`Nested layouts are not supported`); // TODO: Should be simple to add support if ever needed
			}

			layoutHtml = layout.html;
		}

		const templateFn = handlebars.compile(layoutHtml ? layoutHtml.replace(layoutContentRegexp, template.html) : template.html);

		this.templateCache.set(templateId, templateFn);

		return templateFn;
	}

}

export default MailManager;
