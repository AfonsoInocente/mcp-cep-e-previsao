import { HTTP_STATUS } from "../enums";
import { ClientError } from "./base/ClientError";

export class BadRequestError extends ClientError {
  constructor(message = "Bad Request", messages?: string[]) {
    super(message, HTTP_STATUS.BAD_REQUEST, messages);
    this.name = "BadRequestError";
  }
}
