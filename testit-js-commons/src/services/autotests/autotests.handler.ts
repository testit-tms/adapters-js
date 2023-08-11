import { HttpError } from "testit-api-client";

export function handleHttpError(err: unknown, message = "") {
  if (err instanceof HttpError) {
    console.error(`HttpError ${err.statusCode}: ${message}. Error body: \n`, err.body);
  } else {
    console.log(message, err);
  }
}
