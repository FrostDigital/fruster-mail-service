import Mail from "../models/Mail";

/**
 * Request for sending mail.
 * Can be used in two ways: mail contents defined in request or with template.
 * If contents is in request; `to`, `subject` and `message` are required.
 * If template is used; `to` and `templateId` are required.
 *
 * @additionalProperties false
 */
export default interface SendMailRequest extends Mail { };
