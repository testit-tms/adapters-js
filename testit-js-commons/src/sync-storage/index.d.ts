declare module 'sync-storage-client/api/CompletionApi' {
  /**
  * Completion service.
  * @module api/CompletionApi
  * @version 0.1.0
  */
  export default class CompletionApi {
      /**
      * Constructs a new CompletionApi.
      * @alias module:api/CompletionApi
      * @class
      * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
      * default to {@link module:ApiClient#instance} if unspecified.
      */
      constructor(apiClient?: any);
      apiClient: any;
      /**
       * Force completion of a test run
       *  Force processing completion for a specific test run.
       * @param {String} testRunId Test Run ID
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/CompletionResponse} and HTTP response
       */
      forceCompletionGetWithHttpInfo(testRunId: string): Promise<any>;
      /**
       * Force completion of a test run
       *  Force processing completion for a specific test run.
       * @param {String} testRunId Test Run ID
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/CompletionResponse}
       */
      forceCompletionGet(testRunId: string): Promise<any>;
      /**
       * Wait for completion
       *  Wait until processing is completed for a test run.
       * @param {String} testRunId Test Run ID
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/CompletionResponse} and HTTP response
       */
      waitCompletionGetWithHttpInfo(testRunId: string): Promise<any>;
      /**
       * Wait for completion
       *  Wait until processing is completed for a test run.
       * @param {String} testRunId Test Run ID
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/CompletionResponse}
       */
      waitCompletionGet(testRunId: string): Promise<any>;
  }

}
declare module 'sync-storage-client/api/HealthApi' {
  /**
  * Health service.
  * @module api/HealthApi
  * @version 0.1.0
  */
  export default class HealthApi {
      /**
      * Constructs a new HealthApi.
      * @alias module:api/HealthApi
      * @class
      * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
      * default to {@link module:ApiClient#instance} if unspecified.
      */
      constructor(apiClient?: any);
      apiClient: any;
      /**
       * Health check
       *  Get the current health status of the service.
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/HealthStatusResponse} and HTTP response
       */
      healthGetWithHttpInfo(): Promise<any>;
      /**
       * Health check
       *  Get the current health status of the service.
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/HealthStatusResponse}
       */
      healthGet(): Promise<any>;
  }

}
declare module 'sync-storage-client/api/SystemApi' {
  /**
  * System service.
  * @module api/SystemApi
  * @version 0.1.0
  */
  export default class SystemApi {
      /**
      * Constructs a new SystemApi.
      * @alias module:api/SystemApi
      * @class
      * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
      * default to {@link module:ApiClient#instance} if unspecified.
      */
      constructor(apiClient?: any);
      apiClient: any;
      /**
       * Shutdown service
       *  Initiate shutdown of the service.
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/ShutdownResponse} and HTTP response
       */
      shutdownPostWithHttpInfo(): Promise<any>;
      /**
       * Shutdown service
       *  Initiate shutdown of the service.
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/ShutdownResponse}
       */
      shutdownPost(): Promise<any>;
  }

}
declare module 'sync-storage-client/api/TestResultsApi' {
  /**
  * TestResults service.
  * @module api/TestResultsApi
  * @version 0.1.0
  */
  export default class TestResultsApi {
      /**
      * Constructs a new TestResultsApi.
      * @alias module:api/TestResultsApi
      * @class
      * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
      * default to {@link module:ApiClient#instance} if unspecified.
      */
      constructor(apiClient?: any);
      apiClient: any;
      /**
       * Get in-progress published state
       *  Get whether in-progress status has already been published by master node.
       * @param {String} testRunId Test Run ID
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/InProgressPublishedResponse} and HTTP response
       */
      inProgressPublishedGetWithHttpInfo(testRunId: string): Promise<any>;
      /**
       * Get in-progress published state
       *  Get whether in-progress status has already been published by master node.
       * @param {String} testRunId Test Run ID
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/InProgressPublishedResponse}
       */
      inProgressPublishedGet(testRunId: string): Promise<any>;
      /**
       * Save in-progress test result
       *  Save a test result with InProgress status.
       * @param {String} testRunId Test Run ID
       * @param {module:model/TestResultCutApiModel} testResultCutApiModel
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/TestResultSaveResponse} and HTTP response
       */
      inProgressTestResultPostWithHttpInfo(testRunId: string, testResultCutApiModel: any): Promise<any>;
      /**
       * Save in-progress test result
       *  Save a test result with InProgress status.
       * @param {String} testRunId Test Run ID
       * @param {module:model/TestResultCutApiModel} testResultCutApiModel
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/TestResultSaveResponse}
       */
      inProgressTestResultPost(testRunId: string, testResultCutApiModel: any): Promise<any>;
  }

}
declare module 'sync-storage-client/api/WorkersApi' {
  /**
  * Workers service.
  * @module api/WorkersApi
  * @version 0.1.0
  */
  export default class WorkersApi {
      /**
      * Constructs a new WorkersApi.
      * @alias module:api/WorkersApi
      * @class
      * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
      * default to {@link module:ApiClient#instance} if unspecified.
      */
      constructor(apiClient?: any);
      apiClient: any;
      /**
       * Register a new worker
       *  Register a new worker with the sync storage service.
       * @param {module:model/RegisterRequest} registerRequest
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/RegisterResponse} and HTTP response
       */
      registerPostWithHttpInfo(registerRequest: any): Promise<any>;
      /**
       * Register a new worker
       *  Register a new worker with the sync storage service.
       * @param {module:model/RegisterRequest} registerRequest
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/RegisterResponse}
       */
      registerPost(registerRequest: any): Promise<any>;
      /**
       * Set worker status
       *  Set the status of a worker by its PID.
       * @param {module:model/SetWorkerStatusRequest} setWorkerStatusRequest
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/SetWorkerStatusResponse} and HTTP response
       */
      setWorkerStatusPostWithHttpInfo(setWorkerStatusRequest: any): Promise<any>;
      /**
       * Set worker status
       *  Set the status of a worker by its PID.
       * @param {module:model/SetWorkerStatusRequest} setWorkerStatusRequest
       * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/SetWorkerStatusResponse}
       */
      setWorkerStatusPost(setWorkerStatusRequest: any): Promise<any>;
  }

}
declare module 'sync-storage-client/ApiClient' {
  export default ApiClient;
  /**
  * @module ApiClient
  * @version 0.1.0
  */
  /**
  * Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
  * application to use this class directly - the *Api and model classes provide the public API for the service. The
  * contents of this file should be regarded as internal but are documented for completeness.
  * @alias module:ApiClient
  * @class
  */
  class ApiClient {
      /**
      * Returns a boolean indicating if the parameter could be JSON.stringified
      * @param param The actual parameter
      * @returns {Boolean} Flag indicating if <code>param</code> can be JSON.stringified
      */
      static canBeJsonified(str: any): boolean;
      /**
      * Parses an ISO-8601 string representation or epoch representation of a date value.
      * @param {String} str The date value as a string.
      * @returns {Date} The parsed date object.
      */
      static parseDate(str: string): Date;
      /**
      * Converts a value to the specified type.
      * @param {(String|Object)} data The data to convert, as a string or object.
      * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
      * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
      * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
      * all properties on <code>data<code> will be converted to this type.
      * @returns An instance of the specified type or null or undefined if data is null or undefined.
      */
      static convertToType(data: (string | any), type: (string | Array<string> | any | Function)): any;
      /**
      * Constructs a new map or array model from REST data.
      * @param data {Object|Array} The REST data.
      * @param obj {Object|Array} The target object or array.
      */
      static constructFromObject(data: any | any[], obj: any | any[], itemType: any): void;
      /**
       * The base URL against which to resolve every API call's (relative) path.
       * Overrides the default value set in spec file if present
       * @param {String} basePath
       */
      constructor(basePath?: string);
      /**
       * The base URL against which to resolve every API call's (relative) path.
       * @type {String}
       * @default http://localhost
       */
      basePath: string;
      /**
       * The authentication methods to be included for all API calls.
       * @type {Array.<String>}
       */
      authentications: Array<string>;
      /**
           * The default HTTP headers to be included for all API calls.
           * @type {Array.<String>}
           * @default {}
           */
      defaultHeaders: Array<string>;
      /**
       * The default HTTP timeout for all API calls.
       * @type {Number}
       * @default 60000
       */
      timeout: number;
      /**
       * If set to false an additional timestamp parameter is added to all API GET calls to
       * prevent browser caching
       * @type {Boolean}
       * @default true
       */
      cache: boolean;
      /**
           * If set to true, the client will save the cookies from each server
           * response, and return them in the next request.
           * @default false
           */
      enableCookies: boolean;
      agent: any;
      requestAgent: any;
      plugins: any;
      /**
      * Returns a string representation for an actual parameter.
      * @param param The actual parameter.
      * @returns {String} The string representation of <code>param</code>.
      */
      paramToString(param: any): string;
      /**
       * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
       * NOTE: query parameters are not handled here.
       * @param {String} path The path to append to the base URL.
       * @param {Object} pathParams The parameter values to append.
       * @param {String} apiBasePath Base path defined in the path, operation level to override the default one
       * @returns {String} The encoded path with parameter values substituted.
       */
      buildUrl(path: string, pathParams: any, apiBasePath: string): string;
      /**
      * Checks whether the given content type represents JSON.<br>
      * JSON content type examples:<br>
      * <ul>
      * <li>application/json</li>
      * <li>application/json; charset=UTF8</li>
      * <li>APPLICATION/JSON</li>
      * </ul>
      * @param {String} contentType The MIME content type to check.
      * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
      */
      isJsonMime(contentType: string): boolean;
      /**
      * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
      * @param {Array.<String>} contentTypes
      * @returns {String} The chosen content type, preferring JSON.
      */
      jsonPreferredMime(contentTypes: Array<string>): string;
      /**
      * Checks whether the given parameter value represents file-like content.
      * @param param The parameter to check.
      * @returns {Boolean} <code>true</code> if <code>param</code> represents a file.
      */
      isFileParam(param: any): boolean;
      /**
      * Normalizes parameter values:
      * <ul>
      * <li>remove nils</li>
      * <li>keep files and arrays</li>
      * <li>format to string with `paramToString` for other cases</li>
      * </ul>
      * @param {Object.<String, Object>} params The parameters as object properties.
      * @returns {Object.<String, Object>} normalized parameters.
      */
      normalizeParams(params: any): any;
      /**
      * Builds a string representation of an array-type actual parameter, according to the given collection format.
      * @param {Array} param An array parameter.
      * @param {module:ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
      * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
      * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
      */
      buildCollectionParam(param: any[], collectionFormat: any): string | any[];
      /**
      * Applies authentication headers to the request.
      * @param {Object} request The request object created by a <code>superagent()</code> call.
      * @param {Array.<String>} authNames An array of authentication method names.
      */
      applyAuthToRequest(request: any, authNames: Array<string>): void;
      /**
       * Deserializes an HTTP response body into a value of the specified type.
       * @param {Object} response A SuperAgent response object.
       * @param {(String|Array.<String>|Object.<String, Object>|Function)} returnType The type to return. Pass a string for simple types
       * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
       * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
       * all properties on <code>data<code> will be converted to this type.
       * @returns A value of the specified type.
       */
      deserialize(response: any, returnType: (string | Array<string> | any | Function)): any;
      /**
       * Invokes the REST service using the supplied settings and parameters.
       * @param {String} path The base URL to invoke.
       * @param {String} httpMethod The HTTP method to use.
       * @param {Object.<String, String>} pathParams A map of path parameters and their values.
       * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
       * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
       * @param {Object.<String, Object>} formParams A map of form parameters and their values.
       * @param {Object} bodyParam The value to pass as the request body.
       * @param {Array.<String>} authNames An array of authentication type names.
       * @param {Array.<String>} contentTypes An array of request MIME types.
       * @param {Array.<String>} accepts An array of acceptable response MIME types.
       * @param {(String|Array|ObjectFunction)} returnType The required type to return; can be a string for simple types or the
       * constructor for a complex type.
       * @param {String} apiBasePath base path defined in the operation/path level to override the default one
       * @returns {Promise} A {@link https://www.promisejs.org/|Promise} object.
       */
      callApi(path: string, httpMethod: string, pathParams: any, queryParams: any, headerParams: any, formParams: any, bodyParam: any, authNames: Array<string>, contentTypes: Array<string>, accepts: Array<string>, returnType: (string | any[] ), apiBasePath: string): Promise<any>;
      /**
        * Gets an array of host settings
        * @returns An array of host settings
        */
      hostSettings(): {
          url: string;
          description: string;
      }[];
      getBasePathFromSettings(index: any, variables?: {}): string;
  }
  namespace ApiClient {
      namespace CollectionFormatEnum {
          let CSV: string;
          let SSV: string;
          let TSV: string;
          let PIPES: string;
          let MULTI: string;
      }
      /**
       * *
       */
      type CollectionFormatEnum = string;
      let instance: any;
  }

}
declare module 'sync-storage-client/index' {
  import ApiClient from 'sync-storage-client/ApiClient';
  import CompletionResponse from 'sync-storage-client/model/CompletionResponse';
  import HealthStatusResponse from 'sync-storage-client/model/HealthStatusResponse';
  import InProgressPublishedResponse from 'sync-storage-client/model/InProgressPublishedResponse';
  import RegisterRequest from 'sync-storage-client/model/RegisterRequest';
  import RegisterResponse from 'sync-storage-client/model/RegisterResponse';
  import SetWorkerStatusRequest from 'sync-storage-client/model/SetWorkerStatusRequest';
  import SetWorkerStatusResponse from 'sync-storage-client/model/SetWorkerStatusResponse';
  import ShutdownResponse from 'sync-storage-client/model/ShutdownResponse';
  import TestResultCutApiModel from 'sync-storage-client/model/TestResultCutApiModel';
  import TestResultSaveResponse from 'sync-storage-client/model/TestResultSaveResponse';
  import CompletionApi from 'sync-storage-client/api/CompletionApi';
  import HealthApi from 'sync-storage-client/api/HealthApi';
  import SystemApi from 'sync-storage-client/api/SystemApi';
  import TestResultsApi from 'sync-storage-client/api/TestResultsApi';
  import WorkersApi from 'sync-storage-client/api/WorkersApi';
  export { ApiClient, CompletionResponse, HealthStatusResponse, InProgressPublishedResponse, RegisterRequest, RegisterResponse, SetWorkerStatusRequest, SetWorkerStatusResponse, ShutdownResponse, TestResultCutApiModel, TestResultSaveResponse, CompletionApi, HealthApi, SystemApi, TestResultsApi, WorkersApi };

}
declare module 'sync-storage-client/model/CompletionResponse' {
  export default CompletionResponse;
  /**
   * The CompletionResponse model module.
   * @module model/CompletionResponse
   * @version 0.1.0
   */
  class CompletionResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>CompletionResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/CompletionResponse} obj Optional instance to populate.
       * @return {module:model/CompletionResponse} The populated <code>CompletionResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>CompletionResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>CompletionResponse</code>.
       */
      static validateJSON(data: any): boolean;
      completed: any;
      message: any;
  }

}
declare module 'sync-storage-client/model/HealthStatusResponse' {
  export default HealthStatusResponse;
  /**
   * The HealthStatusResponse model module.
   * @module model/HealthStatusResponse
   * @version 0.1.0
   */
  class HealthStatusResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>HealthStatusResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/HealthStatusResponse} obj Optional instance to populate.
       * @return {module:model/HealthStatusResponse} The populated <code>HealthStatusResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>HealthStatusResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>HealthStatusResponse</code>.
       */
      static validateJSON(data: any): boolean;
      status: any;
      last_update: any;
  }

}
declare module 'sync-storage-client/model/InProgressPublishedResponse' {
  export default InProgressPublishedResponse;
  /**
   * The InProgressPublishedResponse model module.
   * @module model/InProgressPublishedResponse
   * @version 0.1.0
   */
  class InProgressPublishedResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>InProgressPublishedResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/InProgressPublishedResponse} obj Optional instance to populate.
       * @return {module:model/InProgressPublishedResponse} The populated <code>InProgressPublishedResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>InProgressPublishedResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>InProgressPublishedResponse</code>.
       */
      static validateJSON(data: any): boolean;
      published: any;
  }

}
declare module 'sync-storage-client/model/RegisterRequest' {
  export default RegisterRequest;
  /**
   * The RegisterRequest model module.
   * @module model/RegisterRequest
   * @version 0.1.0
   */
  class RegisterRequest {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>RegisterRequest</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/RegisterRequest} obj Optional instance to populate.
       * @return {module:model/RegisterRequest} The populated <code>RegisterRequest</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>RegisterRequest</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>RegisterRequest</code>.
       */
      static validateJSON(data: any): boolean;
      pid: any;
      testRunId: any;
      baseUrl: any;
      privateToken: any;
  }

}
declare module 'sync-storage-client/model/RegisterResponse' {
  export default RegisterResponse;
  /**
   * The RegisterResponse model module.
   * @module model/RegisterResponse
   * @version 0.1.0
   */
  class RegisterResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>RegisterResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/RegisterResponse} obj Optional instance to populate.
       * @return {module:model/RegisterResponse} The populated <code>RegisterResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>RegisterResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>RegisterResponse</code>.
       */
      static validateJSON(data: any): boolean;
      status: any;
      message: any;
      pid: any;
      testRunId: any;
      is_master: any;
  }

}
declare module 'sync-storage-client/model/SetWorkerStatusRequest' {
  export default SetWorkerStatusRequest;
  /**
   * The SetWorkerStatusRequest model module.
   * @module model/SetWorkerStatusRequest
   * @version 0.1.0
   */
  class SetWorkerStatusRequest {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>SetWorkerStatusRequest</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/SetWorkerStatusRequest} obj Optional instance to populate.
       * @return {module:model/SetWorkerStatusRequest} The populated <code>SetWorkerStatusRequest</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>SetWorkerStatusRequest</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>SetWorkerStatusRequest</code>.
       */
      static validateJSON(data: any): boolean;
      pid: any;
      status: any;
      testRunId: any;
  }

}
declare module 'sync-storage-client/model/SetWorkerStatusResponse' {
  export default SetWorkerStatusResponse;
  /**
   * The SetWorkerStatusResponse model module.
   * @module model/SetWorkerStatusResponse
   * @version 0.1.0
   */
  class SetWorkerStatusResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>SetWorkerStatusResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/SetWorkerStatusResponse} obj Optional instance to populate.
       * @return {module:model/SetWorkerStatusResponse} The populated <code>SetWorkerStatusResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>SetWorkerStatusResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>SetWorkerStatusResponse</code>.
       */
      static validateJSON(data: any): boolean;
      status: any;
      message: any;
  }

}
declare module 'sync-storage-client/model/ShutdownResponse' {
  export default ShutdownResponse;
  /**
   * The ShutdownResponse model module.
   * @module model/ShutdownResponse
   * @version 0.1.0
   */
  class ShutdownResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>ShutdownResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/ShutdownResponse} obj Optional instance to populate.
       * @return {module:model/ShutdownResponse} The populated <code>ShutdownResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>ShutdownResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ShutdownResponse</code>.
       */
      static validateJSON(data: any): boolean;
      status: any;
      message: any;
  }

}
declare module 'sync-storage-client/model/TestResultCutApiModel' {
  export default TestResultCutApiModel;
  /**
   * The TestResultCutApiModel model module.
   * @module model/TestResultCutApiModel
   * @version 0.1.0
   */
  class TestResultCutApiModel {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>TestResultCutApiModel</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/TestResultCutApiModel} obj Optional instance to populate.
       * @return {module:model/TestResultCutApiModel} The populated <code>TestResultCutApiModel</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>TestResultCutApiModel</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>TestResultCutApiModel</code>.
       */
      static validateJSON(data: any): boolean;
      projectId: any;
      autoTestExternalId: any;
      statusCode: any;
      statusType: any;
      startedOn: any;
  }

}
declare module 'sync-storage-client/model/TestResultSaveResponse' {
  export default TestResultSaveResponse;
  /**
   * The TestResultSaveResponse model module.
   * @module model/TestResultSaveResponse
   * @version 0.1.0
   */
  class TestResultSaveResponse {
      /**
       * Initializes the fields of this object.
       * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
       * Only for internal use.
       */
      static initialize(obj: any): void;
      /**
       * Constructs a <code>TestResultSaveResponse</code> from a plain JavaScript object, optionally creating a new instance.
       * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @param {module:model/TestResultSaveResponse} obj Optional instance to populate.
       * @return {module:model/TestResultSaveResponse} The populated <code>TestResultSaveResponse</code> instance.
       */
      static constructFromObject(data: any, obj: any): any;
      /**
       * Validates the JSON data with respect to <code>TestResultSaveResponse</code>.
       * @param {Object} data The plain JavaScript object bearing properties of interest.
       * @return {boolean} to indicate whether the JSON data is valid with respect to <code>TestResultSaveResponse</code>.
       */
      static validateJSON(data: any): boolean;
      status: any;
      message: any;
  }

}
declare module 'sync-storage-client' {
  import main = require('sync-storage-client/index');
  export = main;
}