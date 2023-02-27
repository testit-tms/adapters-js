import { TestsBuilder } from '../tests.builder';
import { getDefaultConfig, getDefaultTest } from '../../common/__tests/test.utils';

describe('Tests builder', () => {
  const test = getDefaultTest();
  const config = getDefaultConfig();

  const builder = new TestsBuilder(config);

  it('Should build test', () => {
    const data = builder.build(test);

    expect(data)
      .toEqual({
        title: 'Test',
        description: '',
        externalId: 5730363800838031,
        labels: [],
        links: [],
        name: 'Test',
        projectId: '96g6d4bg-20g0-25e8-b17e-a1a34a7adf2f',
        setup: [
          { description: '', title: 'Step Before' }
        ],
        steps: [
          { title: 'Step 1', description: "" },
          { title: 'Step 2', description: "" }
        ],
        teardown: [
          { description: '', title: 'Step After' }
        ],
      });
  });
});