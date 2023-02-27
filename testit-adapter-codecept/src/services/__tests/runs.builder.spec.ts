import { Origin } from '../../types/origin.type';
import { RunsBuilder } from '../runs.builder';
import { getDefaultConfig, getDefaultTest } from '../../common/__tests/test.utils';

describe('Runs builder', () => {
  const test = getDefaultTest();
  const config = getDefaultConfig();

  const attachments = [{ id: '96g6d4bg-20g0-25e8-b17e-a1a34a7adf2f' }];
  const metadata: Origin.TestMetadata = {
    links: [{ title: 'Google', url: 'https://google.com', type: 'Related' }],
    message: 'Error'
  };


  const builder = new RunsBuilder(config);

  it('Should build test run', () => {
    const run = builder.build(test as any, metadata, attachments);

    expect(run)
      .toEqual({
        autotestExternalId: 5730363800838031,
        completeOn: '1970-01-01T01:33:54.474Z',
        configurationId: '1c33c90c-f34c-427b-81f6-1458f5g9c072',
        duration: 240,
        attachments: [
          {
            id: '96g6d4bg-20g0-25e8-b17e-a1a34a7adf2f'
          }
        ],
        links: [
          {
            title: 'Google',
            url: 'https://google.com',
            type: 'Related'
          }
        ],
        message: 'Error',
        parameters: {},
        outcome: 'Passed',
        startedOn: '1970-01-01T01:33:54.234Z',
        setupResults: [
          {
            completedOn: '1970-01-01T01:33:54.274Z',
            description: '',
            duration: 40,
            outcome: 'Passed',
            startedOn: '1970-01-01T01:33:54.234Z',
            title: 'Step Before'
          }
        ],
        stepResults: [
          {
            completedOn: '1970-01-01T01:33:54.274Z',
            description: '',
            duration: 40,
            outcome: 'Passed',
            startedOn: '1970-01-01T01:33:54.234Z',
            title: 'Step 1'
          },
          {
            completedOn: '1970-01-01T01:33:54.434Z',
            description: '',
            duration: 200,
            outcome: 'Passed',
            startedOn: '1970-01-01T01:33:54.234Z',
            title: 'Step 2'
          }
        ],
        teardownResults: [
          {
            completedOn: '1970-01-01T01:33:54.274Z',
            description: '',
            duration: 40,
            outcome: 'Passed',
            startedOn: '1970-01-01T01:33:54.234Z',
            title: 'Step After'
          }
        ],
        traces: ''
      });
  });
});