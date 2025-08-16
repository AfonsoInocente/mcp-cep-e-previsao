import { HTTP_STATUS } from "../enums";
import { ClientError } from "./base/ClientError";

export class ForbiddenError extends ClientError {
  constructor(message = "Forbidden", messages?: string[]) {
    super(message, HTTP_STATUS.FORBIDDEN, messages);
    this.name = "ForbiddenError";
  }
}
