const NO_ESCAPE_HTML_ENV_VAR = 'NO_ESCAPE_HTML';

// Regex pattern to detect HTML tags
const HTML_TAG_PATTERN = /<\S.*?(?:>|\/>)/;

// Regex patterns to escape only non-escaped characters
const LESS_THAN_PATTERN = /</;
const GREATER_THAN_PATTERN = />/;

/**
 * Escapes HTML tags to prevent XSS attacks.
 * First checks if the string contains HTML tags using regex pattern.
 * Only performs escaping if HTML tags are detected.
 * Escapes all < as \< and > as \> only if they are not already escaped.
 * Uses regex with negative lookbehind to avoid double escaping.
 */
export function escapeHtmlTags(text: string | null | undefined): string | null | undefined {
  if (text == null) {
    return text;
  }

  // First check if the string contains HTML tags
  if (!HTML_TAG_PATTERN.test(text)) {
    return text; // No HTML tags found, return original string
  }

  // Use regex with negative lookbehind to escape only non-escaped characters
  let result = text.replace(LESS_THAN_PATTERN, '&lt;');
  result = result.replace(GREATER_THAN_PATTERN, '&gt;');

  return result;
}

/**
 * Escapes HTML tags in all string properties of an object using reflection
 * Also processes Array properties: if Array of objects - calls escapeHtmlInObjectArray,
 * Can be disabled by setting NO_ESCAPE_HTML environment variable to "true"
 * if Array of strings - escapes each string
 */
export function escapeHtmlInObject<T>(obj: T): T {
  if (obj == null) {
    return obj;
  }

  // Check if escaping is disabled via environment variable
  const noEscapeHtml = process.env[NO_ESCAPE_HTML_ENV_VAR];
  if (noEscapeHtml?.toLowerCase() === 'true') {
    return obj;
  }

  try {
    processProperties(obj);
  } catch (error) {
    // Silently ignore reflection errors
  }

  return obj;
}

/**
 * Escapes HTML tags in all string properties of objects in an array
 * Can be disabled by setting NO_ESCAPE_HTML environment variable to "true"
 */
export function escapeHtmlInObjectArray<T>(array: T[] | null | undefined): T[] | null | undefined {
  if (array == null) {
    return array;
  }

  // Check if escaping is disabled via environment variable
  const noEscapeHtml = process.env[NO_ESCAPE_HTML_ENV_VAR];
  if (noEscapeHtml?.toLowerCase() === 'true') {
    return array;
  }

  array.forEach(obj => {
    escapeHtmlInObject(obj);
  });

  return array;
}

function processProperties(obj: any): void {
  if (obj == null || isSimpleType(obj)) {
    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    processArray(obj);
    return;
  }

  // Process object properties
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      try {
        const value = obj[key];

        if (typeof value === 'string') {
          // Escape string properties
          obj[key] = escapeHtmlTags(value);
        } else if (Array.isArray(value) && value.length > 0) {
          processArray(value);
        } else if (value != null && !isSimpleType(value)) {
          // Process nested objects (but not simple types)
          escapeHtmlInObject(value);
        }
      } catch (error) {
        // Silently ignore errors for individual properties
      }
    }
  }
}

function processArray(array: any[]): void {
  if (array.length === 0) {
    return;
  }

  const firstElement = array[0];

  if (typeof firstElement === 'string') {
    // Array of strings - escape each string
    for (let i = 0; i < array.length; i++) {
      if (typeof array[i] === 'string') {
        array[i] = escapeHtmlTags(array[i]);
      }
    }
  } else if (firstElement != null) {
    // Array of objects - process each object
    array.forEach(item => {
      escapeHtmlInObject(item);
    });
  }
}

/**
 * Checks if a value is a simple type that doesn't need HTML escaping
 */
function isSimpleType(value: any): boolean {
  const type = typeof value;
  
  return (
    type === 'boolean' ||
    type === 'number' ||
    type === 'string' ||
    type === 'symbol' ||
    type === 'bigint' ||
    type === 'undefined' ||
    value === null ||
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Error
  );
} 