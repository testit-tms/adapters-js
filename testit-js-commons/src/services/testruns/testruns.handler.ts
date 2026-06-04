import logger from "../../logger";

export class TestRunErrorHandler {
  static handleErrorStartTestRun(err: any, message = "") {
    logger.error(`HttpError ${err.statusCode}. Failed start test run in system. Message: ${message}. Error body:\n`, err.body);
  }

  static handleErrorCompletedTestRun(err: any, message = "") {
    logger.error(`HttpError ${err.statusCode}. Failed completed test run in system. Message: ${message}. Error body:\n`, err.body);
  }
}
