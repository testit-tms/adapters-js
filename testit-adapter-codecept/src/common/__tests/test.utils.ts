import { Codecept } from '../../types/codecept.type';
import { Origin } from '../../types/origin.type';

export function getDefaultTest(): Codecept.Test<Origin.TestConfig> {
  return {
    title: 'Test',
    startedAt: 5634234,
    duration: 240,
    state: 'passed',
    steps: [
      {
        name: 'Step 1',
        args: [],
        status: 'passed',
        startedAt: 5634234,
        duration: 40
      },
      {
        name: 'Step 2',
        args: [],
        status: 'passed',
        startedAt: 5634234,
        duration: 200
      }
    ],
    parent: {
      title: 'Suite',
      _beforeEach: [
        {
          title: 'Before',
          steps: [
            {
              name: 'Step Before',
              args: [],
              status: 'passed',
              startedAt: 5634234,
              duration: 40
            }
          ]
        }
      ],
      _afterEach: [
        {
          title: 'Before',
          steps: [
            {
              name: 'Step After',
              args: [],
              status: 'passed',
              startedAt: 5634234,
              duration: 40
            }
          ]
        }
      ]
    }
  } as any;
}

export function getDefaultConfig(): Origin.Config {
  return {
    url: 'https://url.com//',
    privateToken: 'TTBwakF34lpuQ0FyT6F21EFU',
    projectId: '96g6d4bg-20g0-25e8-b17e-a1a34a7adf2f',
    testRunId: '55238c45-e4cd-4328-b4d5-b0484544a640',
    configurationId: '1c33c90c-f34c-427b-81f6-1458f5g9c072',
    testRunName: 'Run',
    adapterMode: 2
  };
}