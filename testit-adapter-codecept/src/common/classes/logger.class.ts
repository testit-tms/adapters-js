import { AxiosError } from "axios";
import { output } from "codeceptjs";

export class Logger {
  private readonly logger = output;

  constructor(private readonly __DEV = false) {}

  public log(message: string) {
    if (this.__DEV) {
      this.logger.success(message);
    }
  }

  public warn(message: string) {
    this.logger.error(message);
  }

  public error(error: AxiosError | string): void {
    if (typeof error === "string") {
      this.logger.error(error);
    } else {
      this.logger.error(`
      ${error.response?.status},
      ${error.config?.method},
      ${error.config?.url},
      ${JSON.stringify(error.response?.data)}
    `);
    }
  }
}
