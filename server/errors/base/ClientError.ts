import { HTTP_STATUS } from "../../enums";
import { HttpError } from "./HttpError";

export abstract class ClientError extends HttpError {
  constructor(
    message: string,
    status: number = HTTP_STATUS.BAD_REQUEST,
    messages?: string[]
  ) {
    super(message, status, messages);
    this.name = this.constructor.name;
  }
}
