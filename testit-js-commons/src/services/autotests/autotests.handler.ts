import { getHttpStatus, unwrapHttpError } from "../../common/utils";
import logger from "../../logger";

export function isConflictError(err: unknown): boolean {
  const e = unwrapHttpError(err);
  const body = (err as { body?: { type?: string } })?.body ?? (e as { body?: { type?: string } })?.body;
  return body?.type === "ConflictException" || getHttpStatus(e ?? {}) === 409;
}

export function handleHttpError(err: any, message = "") {
  logger.error(`HttpError ${err.statusCode}: ${message}. Error body: \n`, err.body);
}
