import { HTTP_STATUS } from "../enums";
import { ClientError } from "./base/ClientError";

export class UnauthorizedError extends ClientError {
  constructor(message = "Unauthorized", messages?: string[]) {
    super(message, HTTP_STATUS.UNAUTHORIZED, messages);
    this.name = "UnauthorizedError";
  }
}
