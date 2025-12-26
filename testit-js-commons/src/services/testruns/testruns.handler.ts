
export class TestRunErrorHandler {
  static handleErrorStartTestRun(err: any) {
    console.error(`Error ${err.statusCode}. Failed start test run in system.`, `Message: ${err.message}`);
  }
  static handleErrorCompletedTestRun(err: any) {
    console.error(`Error ${err.statusCode}. Failed completed test run in system.`, `Message: ${err.message}`);
  }
}
