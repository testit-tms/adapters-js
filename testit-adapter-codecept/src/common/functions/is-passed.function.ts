import { Codecept } from '../../types/codecept.type';

export function isPassed(test: Codecept.Test): boolean {
  return test.state === 'passed';
}