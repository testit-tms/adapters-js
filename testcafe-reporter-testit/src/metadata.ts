import { Link, Utils } from 'testit-js-commons';

export default class Metadata {
    externalId: string | undefined;
    displayName: string | undefined;
    title: string | undefined;
    description: string | undefined;
    links: Link[] | undefined;
    labels: string[] | undefined;
    tags: string[] | undefined;
    workItemIds: string[] | undefined;
    namespace: string | undefined;
    classname: string | undefined;
    otherMeta: Map<string, string>;

    constructor(meta?: any, path?: string, name?: string) {
        this.otherMeta = new Map();
        if (meta) {
        const { externalId, displayName, title, description, links, labels, tags, workItemIds, namespace, classname, ...otherMeta } = meta;

        if (this.isString(externalId)) {
            this.externalId = externalId;
        } else if (path !== undefined && name !== undefined) {
            this.externalId = this.generateExternalId(name, path);
        }
        if (this.isString(displayName)) {
            this.displayName = displayName;
        } else if (name !== undefined) {
            this.displayName = name;
        }
        if (this.isString(title)) {
            this.title = title;
        }
        if (this.isString(description)) {
            this.description = description;
        }
        if (Array.isArray(links)) {
            this.links = links;
        } else if (this.isString(links)) {
            this.links = [links];
        }
        if (Array.isArray(labels)) {
            this.labels = labels;
        } else if (this.isString(labels)) {
            this.labels = [labels];
        }
        if (Array.isArray(tags)) {
            this.tags = tags;
        } else if (this.isString(tags)) {
            this.tags = [tags];
        }
        if (Array.isArray(workItemIds)) {
            this.workItemIds = workItemIds;
        } else if (this.isString(workItemIds)) {
            this.workItemIds = [workItemIds];
        }
        if (this.isString(namespace)) {
            this.namespace = namespace;
        }
        if (this.isString(classname)) {
            this.classname = classname;
        }

        Object.keys(otherMeta).forEach((key) => {
            if (this.isString(otherMeta[key])) {
            this.otherMeta.set(key, otherMeta[key]);
            }
        });
        }
    }

    mergeMetadata(metadata: Metadata) {
        if (!this.externalId && metadata.externalId) {
            this.externalId = metadata.externalId;
        }
        if (!this.displayName && metadata.displayName) {
            this.displayName = metadata.displayName;
        }
        if (!this.title && metadata.title) {
            this.title = metadata.title;
        }
        if (!this.description && metadata.description) {
            this.description = metadata.description;
        }
        if (!this.links && metadata.links) {
            this.links = metadata.links;
        }
        if (!this.labels && metadata.labels) {
            this.labels = metadata.labels;
        }
        if (!this.tags && metadata.tags) {
            this.tags = metadata.tags;
        }
        if (!this.workItemIds && metadata.workItemIds) {
            this.workItemIds = metadata.workItemIds;
        }
        if (!this.namespace && metadata.namespace) {
            this.namespace = metadata.namespace;
        }
        if (!this.classname && metadata.classname) {
            this.classname = metadata.classname;
        }
        if (metadata.otherMeta.size > 0) {
        Array.from(metadata.otherMeta.entries()).map((entry) => {
            if (!this.otherMeta.has(entry[0])) {
            this.otherMeta.set(entry[0], entry[1]);
            }
        });
    }
  }

  private isString(value: any): boolean {
    if (!value) {
      return false;
    }
    return typeof value === 'string';
  }

  private generateExternalId(testName: string, testPath: string) {
    return Utils.getHash(
      JSON.stringify({
        path: testPath,
        name: testName,
      })
    );
  }
}