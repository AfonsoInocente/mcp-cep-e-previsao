import { HTTP_STATUS } from "../enums";
import { ServerError } from "./base/ServerError";

export class InternalServerError extends ServerError {
  constructor(message = "Internal Server Error", messages?: string[]) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, messages);
    this.name = "InternalServerError";
  }
}
