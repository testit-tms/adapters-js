import { AutoTestPutModel } from 'testit-api-client';

export class HttpClientErrors {
  public static throwNotFoundHttpClientConfig() {
    throw new Error('Http client config not found');
  }

  public static throwErrorAfterTestUpdate(test: AutoTestPutModel) {
    throw new Error(`An error occurred while updating the test - ${test.name}`);
  }

  public static throwErrorAfterTestCreate(test: AutoTestPutModel) {
    throw new Error(`an error occurred while creating the test - ${test.name}`);
  }

  public static throwNotUploadAttachments(path: string) {
    throw new Error(`when loading an attachment along the path - ${path}, an error occurred`);
  }
}
