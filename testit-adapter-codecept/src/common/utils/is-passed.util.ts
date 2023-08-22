import { Codecept } from "../../types";

export function isPassed(test: Codecept.Test): boolean {
  return test.state === "passed";
}
