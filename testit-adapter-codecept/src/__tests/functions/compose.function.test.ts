import { compose } from '../../common/functions/compose.function';

describe('Compose function', () => {
  it('Should call all functions', () => {
    const a = (number: number) => number + 2;
    const b = (number: number) => number * number;

    expect(compose(a, b)(2)).toBe(6);
  })
})