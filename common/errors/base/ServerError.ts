import { HTTP_STATUS } from "../../enums";
import { HttpError } from "./HttpError";

export abstract class ServerError extends HttpError {
  constructor(
    message: string,
    status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    messages?: string[]
  ) {
    super(message, status, messages);
    this.name = this.constructor.name;
  }
}
