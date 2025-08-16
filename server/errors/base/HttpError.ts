export abstract class HttpError extends Error {
  public status: number;
  public messages?: string[];

  constructor(message: string, status: number, messages?: string[]) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.messages = messages;
  }
}
