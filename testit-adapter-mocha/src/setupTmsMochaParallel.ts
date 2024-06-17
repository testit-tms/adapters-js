import type * as Mocha from "mocha";
// @ts-ignore
import { default as ParallelBuffered } from "mocha/lib/nodejs/reporters/parallel-buffered.js";
import { TmsReporter } from "./reporter.js";
import { ReporterOptions } from "./types.js";

const originalCreateListeners: (runner: Mocha.Runner) => Mocha.reporters.Base =
  ParallelBuffered.prototype.createListeners;

ParallelBuffered.prototype.createListeners = function (runner: Mocha.Runner) {
  new TmsReporter(runner, this.options as ReporterOptions);
  return originalCreateListeners.call(this, runner);
};
