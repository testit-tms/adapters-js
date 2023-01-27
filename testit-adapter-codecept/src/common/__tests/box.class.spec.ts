import { Box } from '../classes/box.class';

describe('Box', () => {
  const box = new Box();

  it('Should append values to box and merge them', () => {
    box.collectWithMerge('1', { a: 1 });
    box.collectWithMerge('1', { b: 2 });

    expect(box.get('1'))
      .toEqual({
        a: 1,
        b: 2
      });
  });
});