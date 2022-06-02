import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { inject, injectable, subscribe } from "@fruster/decorators";
import log from "@fruster/log";
import errors from "../errors";
import Template from "../models/Template";
import TemplateRepo from "../repos/TemplateRepo";
import config from "../../config";
import { getDescendantProp } from "../utils/ObjectUtils";

export const GET_TEMPLATE_BY_ID_SUBJECT = "http.get.mail.template.:id";
export const GET_TEMPLATE_BY_ID_PERMISSIONS = ["mail.template.get"];

@injectable()
class GetTemplateByIdHandler {

	@inject()
	private templateRepo!: TemplateRepo;

	/**
	 * Handle service request.
	 */
	@subscribe({
		subject: GET_TEMPLATE_BY_ID_SUBJECT,
		permissions: GET_TEMPLATE_BY_ID_PERMISSIONS,
		docs: {
			description: "Get mail template by its id",
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
			}
		}
	})
	async handle({ params, user }: FrusterRequest<any, {id: string}>): Promise<FrusterResponse<Template>> {
		const template = await this.templateRepo.getById(params.id);

		if (config.templateOwnerProp && template?.owner && getDescendantProp(user, config.templateOwnerProp) !== template.owner) {
			log.warn(`User ${user.id} attempted to access template ${template.id} but owner prop did not match`);
			return errors.forbidden("Not allowed to access template");
		}

		if (!template) {
			return errors.notFound(`Template with id ${params.id} does not exist`);
		}

		return { status: 200, data: template };
	}
}

export default GetTemplateByIdHandler;
