import { LinkPost } from './types';

declare global {
  const testit: {
    externalId: (id: string) => void;
    displayName: (name: string) => void;
    title: (title: string) => void;
    description: (description: string) => void;
    addAttachments: (attachments: string[]) => void;
    addLinks: (links: LinkPost[]) => void;
    addMessage: (message: string) => void;
  };
}
