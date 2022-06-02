import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { inject, injectable, subscribe } from "@fruster/decorators";
import config from "../../config";
import errors from "../errors";
import Template from "../models/Template";
import TemplateRepo from "../repos/TemplateRepo";
import { UpdateTemplateRequest } from "../schemas/UpdateTemplateRequest";
import log from "@fruster/log";
import { getDescendantProp } from "../utils/ObjectUtils";
import MailManager from "../managers/MailManager";

export const UPDATE_TEMPLATE_SUBJECT = "http.put.mail.template.:id";
export const UPDATE_TEMPLATE_PERMISSIONS = ["mail.template.update"];

@injectable()
class UpdateTemplateHandler {

	@inject()
	private templateRepo!: TemplateRepo;

	constructor(private mailManager: MailManager) {}

	/**
	 * Handle service request.
	 */
	@subscribe({
		subject: UPDATE_TEMPLATE_SUBJECT,
		permissions: UPDATE_TEMPLATE_PERMISSIONS,
		docs: {
			description: "Updates mail template",
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
			}
		}
	})
	async handle({ data, user, params }: FrusterRequest<UpdateTemplateRequest, {id: string}>): Promise<FrusterResponse<Template>> {
		const template = await this.templateRepo.getById(params.id);

		if (config.templateOwnerProp && template?.owner && getDescendantProp(user, config.templateOwnerProp) !== template.owner) {
			log.warn(`User ${user.id} attempted to update template ${template.id} but owner prop did not match`);
			return errors.forbidden("Not allowed to access template");
		}

		if (!template) {
			throw errors.notFound(`Template with id ${params.id} does not exist`);
		}

		const updatedTemplate = await this.templateRepo.update(params.id, data);

		this.mailManager.purgeTemplateCache(params.id);

		if (!updatedTemplate) {
			throw errors.internalServerError(`Failed to update template ${params.id}`)
		}

		return { status: 200, data: updatedTemplate };
	}
}

export default UpdateTemplateHandler;
