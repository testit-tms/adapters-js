import logger from "../../logger";

export function handleHttpError(err: any, message = "") {
  logger.error(`HttpError ${err.statusCode}: ${message}. Error body: \n`, err.body);
}
