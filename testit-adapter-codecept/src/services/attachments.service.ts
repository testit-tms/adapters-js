import { writeFileSync } from 'fs';
import { hash } from '../common/functions/hash.function';
import { join } from 'path';
import { DefaultHttpClient } from '../http/default-http-client.class';

export class AttachmentsService {
  constructor(private readonly http: DefaultHttpClient) {
  }

  public async attach(paths: string[]) {
    return Promise.all(
      paths
        .map(path => this.http.loadAttachment(path)
          .then(attachment => attachment && { id: attachment.id })
        )
    );
  }

  public async attachTextLikeFile(text: string, name?: string) {
    if (!name) {
      name = hash(text) + '-attachment.txt';
    }

    const attachmentPath = join(__dirname, name);

    writeFileSync(attachmentPath, text.toString(), {
      flag: 'w',
    });

    return await this.http.loadAttachment(attachmentPath)
      .then(attachment => attachment && { id: attachment.id })
  }
}