interface Template {
	id: string;

	/**
	 * Optional descriptive name of template.
	 * For example "Password reset mail".
	 */
	name?: string;

	/**
	 * Email subject
	 */
	subject: string;

	/**
	 * HTML body, use {{var}} syntax to replace variables.
	 */
	html: string;

	/**
	 * Optional reference to other template which acts as layout.
	 * This layouts content will be injected into the layouts `content` var.
	 */
	layout?: string;

	/**
	 * Optional reference to owner, could for example be user id.
	 * Will be matched against TEMPLATE_OWNER_PROP, if set, when
	 * CRUDing templates.
	 */
	owner?: string;

	metadata: {
		created: Date;
		updated?: Date;
	}
}

export default Template;
