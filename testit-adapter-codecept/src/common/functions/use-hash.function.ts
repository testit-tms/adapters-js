import { Codecept } from '../../types/codecept.type';
import { compose } from './compose.function';
import { hash } from './hash.function';

export const useCompositeKey = (test: Mocha.Test) => `${test.title}:${test.parent?.title}`;
export const useDefaultHash = (test: Codecept.Test) => test?.opts?.externalId;
export const useCompositeHash = (test: Mocha.Test) => compose(hash, useCompositeKey)(test)
export const useConfig = (test: Mocha.Test & { opts: any }) => test.opts
