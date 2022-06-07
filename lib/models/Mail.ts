export default interface Mail {
	/**
	 * Email or emails to send mail to
	 *
	 * @TJS-format email
	 * @items {"type":"string", "format":"email"}
	 * @default "ramjam@frost.se"
	 */
	to: string | string[];

	/**
	 * Email address to send mail from
	 * @TJS-format email
	 */
	from?: string;

	/**
	 * Required if `templateId` is not used! The subject of the mail being sent
	 * @default "Hello from anywhere else"
	 */
	subject?: string;

	/**
	 * Required if `templateId` is not used! The mail body being sent
	 * @default "&lt;h1&gt;Hello&lt;/h1&gt; This is the body of the mail!"
	 */
	message?: string;

	/**
	 * Required if `message` is not used!
	 * This is either id of template managed by mail service TEMPLATE_ENABLED is
	 * true. Otherwise this is the id of template in mail provider, such as sendgrid.
	 *
	 * If this is used, the message field is ignored.
	 * @default "5dc78985-ee1f-431d-9266-5eb1a2e7fb96"
	 */
	templateId?: string;

	/**
	 * Arguments for the template. Uses \`${config.substitutionCharacter[0]}${config.substitutionCharacter[1]}\` to replace arguments in template body. E.g. \`${config.substitutionCharacter[0]}firstName${config.substitutionCharacter[1]}\` in message body is replaced by the value of \`templateArgs.firstName\`
	 * @default {firstName: "ola", lastName: "bandola", score: 1337}
	 */
	templateArgs?: { [key: string]: any };
}

export interface SendMailParams extends Mail {
	from: string;

	/**
	 * If message is plain text. Will if so convert line breaks
	 * into <br/> if needed to.
	 */
	plainText?: boolean;
}

export interface GroupedMail extends Omit<Mail, "to"> {
	/**
	 * Email of the grouped mail. It is not possible to use `to`. Because of old data
	 */
	email: string;

	/**
	 * Key to group mails on
	 * @default "ip-matchmaking-service.NEW_MATCH"
	 */
	key: string;
}
