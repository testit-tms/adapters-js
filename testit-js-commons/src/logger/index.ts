import { redactSecrets, redactSecretsInString } from "../common/utils/log-sanitize.util";

// logger.ts
type LogLevel = "error" | "warn" | "info" | "debug";

interface LogLevels {
  error: 0;
  warn: 1;
  info: 2;
  debug: 3;
}

class Logger {
  private readonly levels: LogLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private currentLevel: number;

  constructor() {
    // Level from env or default 'warn'
    const envLevel = (process.env.LOG_LEVEL || "warn").toLowerCase() as LogLevel;
    this.currentLevel =
      this.levels[envLevel] !== undefined ? this.levels[envLevel] : this.levels.info;
  }

  private log_(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.levels[level] <= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      const safeMessage = redactSecretsInString(message);
      const safeArgs = args.map((arg) => redactSecrets(arg));

      if (level === "error") {
        console.error(prefix, safeMessage, ...safeArgs);
      } else if (level === "warn") {
        console.warn(prefix, safeMessage, ...safeArgs);
      } else {
        console.log(prefix, safeMessage, ...safeArgs);
      }
    }
  }

  public error(message: string, ...args: unknown[]): void {
    this.log_("error", message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.log_("warn", message, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    this.log_("info", message, ...args);
  }

  public log(message: string, ...args: unknown[]): void {
    this.log_("info", message, ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.log_("debug", message, ...args);
  }

  public isLevelEnabled(level: LogLevel): boolean {
    return this.levels[level] <= this.currentLevel;
  }

  public getCurrentLevel(): LogLevel {
    const level = Object.keys(this.levels).find(
      (key) => this.levels[key as LogLevel] === this.currentLevel,
    );
    return (level as LogLevel) || "info";
  }

  public setLevel(level: LogLevel): void {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }
}

const logger = new Logger();
export default logger;
