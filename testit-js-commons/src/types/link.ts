export type LinkType =
  | 'Related'
  | 'BlockedBy'
  | 'Defect'
  | 'Issue'
  | 'Requirement'
  | 'Repository';

export interface Link {
  title?: string;
  url: string;
  description?: string;
  type?: LinkType;
  hasInfo?: boolean;
}
