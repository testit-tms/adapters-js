import { World } from '@cucumber/cucumber';
import { LinkPostModel } from 'testit-api-client';

export interface TestItWorld extends World {
    addMessage(message: string): void;
    addLinks(links: LinkPostModel[]): void;
    addAttachments(attachments: string[]): void;
}
