import { AttachmentPutModel } from 'testit-api-client';
import { DefaultHttpClient } from '../../http/default-http-client.class';
import { AttachmentsService } from '../attachments.service';

describe('AttachmentsService service', () => {
  const notCorrectDataToAttachments = ['4', '5'];

  const http: Partial<DefaultHttpClient> = {
    loadAttachment(path: string): Promise<AttachmentPutModel | void> {
      return !notCorrectDataToAttachments.includes(path)
        ? Promise.resolve({ id: path } as AttachmentPutModel)
        : Promise.reject();
    }
  };

  const service = new AttachmentsService(http as DefaultHttpClient);

  it('Should return array with ids loaded attachments', async () => {
    const response = await service.attach(['1', '2', '3']);

    expect(response)
      .toEqual([
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ]);
  });
});