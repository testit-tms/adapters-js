import { LinkPost, LinkType } from 'testit-api-client';
import { Nullable } from './common/types/nullable.type';
import { Origin } from './types/origin.type';

export class TestMetadataHelper extends Helper {
  public metadata: Nullable<Origin.TestMetadata> = {};

  public addMessage(message: string) {
    this.metadata.message = message;
  }

  public addAttachments(paths: string[] | string, name?: string) {
    if (Array.isArray(paths)) {
      this.metadata.attachments = paths;

      return;
    }

    this.metadata.text = {
      name,
      content: paths
    }
  }

  public addLinks(linksOrName: LinkPost[] | string, description?: string, type?: LinkType, url?: string) {
    if (typeof linksOrName !== 'string') {
      this.metadata.links = linksOrName;
    } else {
      this.metadata.links = [{
        title: linksOrName,
        url,
        description,
        type
      }];
    }
  }
}

module.exports = TestMetadataHelper;
