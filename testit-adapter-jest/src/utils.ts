import {Parameters} from "./types";

export function excludePath(source: string, toRemove: string): string {
  return source.replace(toRemove, '');
}

export function mapParams(params: any): Parameters  {
  switch (typeof params) {
    case 'string':
    case 'bigint':
    case 'number':
    case 'boolean':
      return { value: params.toString() };
    case 'object':
      if (params === null) {
        return {};
      }
      return Object.keys(params).reduce((acc, key) => {
        acc[key] = params[key].toString();
        return acc;
      }, {} as Parameters);
    default:
      return {};
  }
}
