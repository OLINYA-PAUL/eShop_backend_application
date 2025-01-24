export default class errorHandler extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    const errorTraceStack = Error.captureStackTrace(this, this.constructor);
    console.log(errorTraceStack);
  }
}
