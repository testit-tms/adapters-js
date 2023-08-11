import type { Attachment, DynamicMethods, Link } from "../../common";

export interface IAdditions extends DynamicMethods {
  readonly links: Link[];
  readonly attachments: Attachment[];
  readonly messages: string[];

  clear(): void;
}
