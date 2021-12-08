import { World } from '@cucumber/cucumber';
import { LinkPost } from 'testit-api-client';

export interface TestItWorld extends World {
  addMessage(message: string): void;
  addLinks(links: LinkPost[]): void;
  addAttachments(attachments: string[]): void;
}
