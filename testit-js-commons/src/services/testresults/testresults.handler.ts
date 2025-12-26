
export function handleHttpError(err: any, message = "") {
    console.error(`HttpError ${err.statusCode}: ${message}. Error body: \n`, err.body);
}
