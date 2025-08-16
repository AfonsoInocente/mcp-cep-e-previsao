import { HTTP_STATUS } from "../enums";
import { ClientError } from "./base/ClientError";

export class NotFoundError extends ClientError {
  constructor(message = "Not Found", messages?: string[]) {
    super(message, HTTP_STATUS.NOT_FOUND, messages);
    this.name = "NotFoundError";
  }
}
