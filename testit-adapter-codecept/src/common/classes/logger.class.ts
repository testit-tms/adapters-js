import { output } from 'codeceptjs';
import { HttpError } from 'testit-api-client';

export class Logger {
  private readonly logger = output;

  constructor(private readonly __DEV = false) {
  }

  public log(message: string) {
    if (this.__DEV) {
      this.logger.success(message);
    }
  }

  public warn(message: string) {
    this.logger.error(message);
  }

  public error(error: HttpError): void {
    this.logger.error(`
      ${error.response?.statusCode},
      ${error.response?.method},
      ${error.response?.url},
      ${JSON.stringify(error.body)}
    `);
  }
}