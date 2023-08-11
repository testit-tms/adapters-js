import { HttpError } from "testit-api-client";

export class TestRunErrorHandler {
  static handleErrorStartTestRun(err: unknown) {
    if (err instanceof HttpError) {
      console.error(`Error ${err.statusCode}. Failed start test run in system.`, `Message: ${err.message}`);
    } else throw err;
  }
  static handleErrorCompletedTestRun(err: unknown) {
    if (err instanceof HttpError) {
      console.error(`Error ${err.statusCode}. Failed completed test run in system.`, `Message: ${err.message}`);
    } else throw err;
  }
}
