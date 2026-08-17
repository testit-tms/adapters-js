import { getHttpStatus, getNetworkErrorCode, unwrapHttpError } from "../../common/utils";
import logger from "../../logger";

function logTestRunHttpError(action: string, err: unknown, message = ""): void {
  const e = unwrapHttpError(err);
  const status = e ? getHttpStatus(e) : undefined;
  const code = e ? getNetworkErrorCode(e) : undefined;
  const body = (err as { body?: unknown })?.body ?? (e as { body?: unknown })?.body;
  const detail = message || (err instanceof Error ? err.message : String(err));

  logger.error(
    `Failed ${action}. Message: ${detail}. status=${status ?? "n/a"} code=${code ?? "n/a"}`,
    body ?? err
  );
}

export class TestRunErrorHandler {
  static handleErrorStartTestRun(err: unknown, message = "") {
    logTestRunHttpError("start test run in system", err, message);
  }

  static handleErrorCompletedTestRun(err: unknown, message = "") {
    logTestRunHttpError("complete test run in system", err, message);
  }
}
