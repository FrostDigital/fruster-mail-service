import { SendMailParams } from "../models/Mail";

abstract class AbstractMailClient {

	constructor() { /* should not be instantiated */ }

	/**
	 * Send mail using template or plain
	 */
	abstract sendMail({ to, from, subject, templateId, templateArgs, message }: SendMailParams): Promise<void>

	/**
	 * The sendMail method use this method to format the client request
	 * This is public because mock client need to use this method for testing
	 */
	abstract getMailData({ to, from, subject, templateId, templateArgs, message }: SendMailParams): any
}

export default AbstractMailClient;
