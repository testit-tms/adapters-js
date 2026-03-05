import { Label, Link, Status } from "testit-js-commons";
import type { AttachmentOptions, TestRuntime } from "./types.js";
import type  { StatusDetails } from "../models/types.js";
import type { TmsCypressTaskArgs, CypressMessage } from "../models/types.js";
import { enqueueRuntimeMessage, getRuntimeMessages, setRuntimeMessages } from "./state.js";
import { TMS_STEP_CMD_SUBJECT, startTmsApiStep, stopCurrentTmsApiStep } from "./steps.js";
import { getGlobalTestRuntime, getMessageAndTraceFromError, setGlobalTestRuntime, uint8ArrayToBase64 } from "./utils.js";

export const initTestRuntime = () => setGlobalTestRuntime(new TmsCypressTestRuntime() as TestRuntime);

export const getTestRuntime = () => getGlobalTestRuntime() as TmsCypressTestRuntime;

type SerializedBuffer = {
  type: "Buffer";
  data: number[];
};

class TmsCypressTestRuntime implements TestRuntime {
  constructor() {
    this.#resetMessages();
  }

  addLabels(...labels: Label[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  addTags(...tags: string[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        tags,
      },
    });
  }

  addLinks(...links: Link[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  addWorkItemIds(...workItemIds: string[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        workItemIds,
      },
    });
  }

  addParameter(name: string, value: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value
          },
        ],
      },
    });
  }

  addDescription(markdown: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  addTitle(markdown: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        title: markdown,
      },
    });
  }

  addDisplayName(name: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  addNameSpace(name: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        namespace: name,
      },
    });
  }

  addClassName(name: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        classname: name,
      },
    });
  }

  addAttachments(name: string, content: Buffer | string, options: AttachmentOptions) {
    const [attachmentContent, actualEncoding] = this.#buildAttachmentContent(
      content as Buffer | string | SerializedBuffer,
    );

    return this.#enqueueMessageAsync({
      type: "attachment_content",
      data: {
        name,
        content: attachmentContent,
        encoding: actualEncoding,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  addAttachmentsFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">) {
    return this.#enqueueMessageAsync({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  addGlobalAttachments(name: string, content: Buffer | string, options: AttachmentOptions) {
    const [attachmentContent, actualEncoding] = this.#buildAttachmentContent(
      content as Buffer | string | SerializedBuffer,
    );

    return this.#enqueueMessageAsync({
      type: "global_attachment_content",
      data: {
        name,
        content: attachmentContent,
        encoding: actualEncoding,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  addGlobalAttachmentsFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">) {
    return this.#enqueueMessageAsync({
      type: "global_attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  addMessage(details: StatusDetails) {
    return this.#enqueueMessageAsync({
      type: "global_error",
      data: details,
    });
  }

  logStep(name: string, status: Status = Status.PASSED, error?: Error): PromiseLike<void> {
    if (this.#isInOriginContext()) {
      startTmsApiStep(name);
      stopCurrentTmsApiStep(status, error ? getMessageAndTraceFromError(error) : undefined);
      return Cypress.Promise.resolve();
    }

    return cy
      .wrap(TMS_STEP_CMD_SUBJECT, { log: false })
      .then(() => {
        startTmsApiStep(name);
        return Cypress.Promise.resolve();
      })
      .then(() => {
        stopCurrentTmsApiStep(status, error ? getMessageAndTraceFromError(error) : undefined);
        return Cypress.Promise.resolve();
      });
  }

  step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return cy
      .wrap(TMS_STEP_CMD_SUBJECT, { log: false })
      .then(() => {
        startTmsApiStep(name);
        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        stopCurrentTmsApiStep();
        return result;
      });
  }

  stepDisplayName(name: string) {
    return this.#enqueueMessageAsync({
      type: "step_metadata",
      data: {
        name,
      },
    });
  }

  stepParameter(name: string, value: string) {
    return this.#enqueueMessageAsync({
      type: "step_metadata",
      data: {
        parameters: [{ name, value }],
      },
    });
  }

  flushTmsMessagesToTask(taskName: string) {
    const messages = this.#dequeueAllMessages();
    if (messages.length) {
      cy.task(taskName, { absolutePath: Cypress.spec.absolute, messages }, { log: false });
    }
  }

  flushTmsMessagesToTaskAsync(taskName: string): Cypress.Chainable<unknown> | undefined {
    const messages = this.#dequeueAllMessages();
    if (messages.length) {
      const args: TmsCypressTaskArgs = {
        absolutePath: Cypress.spec.absolute,
        messages,
        isInteractive: Cypress.config("isInteractive"),
      };
      return cy.task(taskName, args, { log: false });
    }
  }

  #resetMessages() {
    setRuntimeMessages([]);
  }

  #enqueueMessageAsync(message: CypressMessage): PromiseLike<void> {
    enqueueRuntimeMessage(message);
    return Cypress.Promise.resolve();
  }

  #dequeueAllMessages() {
    const messages = getRuntimeMessages();
    this.#resetMessages();
    return messages;
  }

  #buildAttachmentContent(content: Buffer | string | SerializedBuffer): [string, BufferEncoding] {
    const rawContent = this.#normalizeAttachmentContent(content);
    const encoding: BufferEncoding = typeof rawContent === "string" ? "utf8" : "base64";

    return [uint8ArrayToBase64(rawContent), encoding];
  }

  #normalizeAttachmentContent(content: Buffer | string | SerializedBuffer): string | Uint8Array {
    if (typeof content === "string") {
      return content;
    }

    if (this.#isSerializedBuffer(content)) {
      return new Uint8Array(content.data);
    }

    return content;
  }

  #isSerializedBuffer(content: unknown): content is SerializedBuffer {
    if (!content || typeof content !== "object") {
      return false;
    }

    const candidate = content as Partial<SerializedBuffer>;
    return candidate.type === "Buffer" && Array.isArray(candidate.data);
  }

  #isInOriginContext(): boolean {
    try {
      const hasOriginContext = !!(window as any).cypressOriginContext;
      const hasOriginWindow = !!(window as any).cypressOriginWindow;

      if (hasOriginContext || hasOriginWindow) {
        return true;
      }

      const baseUrl = Cypress.config("baseUrl");
      const currentOrigin = window.location.origin;

      if (baseUrl && currentOrigin !== baseUrl) {
        return true;
      }

      const cypressInstance = (window as any).Cypress;

      if (cypressInstance && cypressInstance.state && cypressInstance.state("origin")) {
        return true;
      }

      try {
        const cyExists = typeof cy !== "undefined";
        const cyTaskExists = typeof cy.task !== "undefined";

        // In cy.origin context, cy.task may not be available or may throw
        if (!cyExists || !cyTaskExists) {
          return true;
        }
      } catch (error) {
        return true;
      }

      return false;
    } catch (error) {
      return true;
    }
  }
}
