import { escapeHtmlTags, escapeHtmlInObject, escapeHtmlInObjectArray } from './html-escape.util';

describe('HtmlEscapeUtils', () => {
  beforeEach(() => {
    // Reset environment variable before each test
    delete process.env.NO_ESCAPE_HTML;
  });

  describe('escapeHtmlTags', () => {
    it('should escape < and > characters', () => {
      const input = 'Hello <script>alert("XSS")</script> world';
      const expected = 'Hello \\<script\\>alert("XSS")\\</script\\> world';
      expect(escapeHtmlTags(input)).toBe(expected);
    });

    it('should not escape already escaped characters', () => {
      const input = 'Already \\<escaped\\> tags';
      const expected = 'Already \\<escaped\\> tags';
      expect(escapeHtmlTags(input)).toBe(expected);
    });

    it('should handle mixed escaped and unescaped characters', () => {
      const input = 'Mixed \\<escaped\\> and <unescaped> tags';
      const expected = 'Mixed \\<escaped\\> and \\<unescaped\\> tags';
      expect(escapeHtmlTags(input)).toBe(expected);
    });

    it('should return null for null input', () => {
      expect(escapeHtmlTags(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(escapeHtmlTags(undefined)).toBeUndefined();
    });

    it('should handle empty string', () => {
      expect(escapeHtmlTags('')).toBe('');
    });

    it('should handle strings without HTML characters', () => {
      const input = 'Simple text without HTML';
      expect(escapeHtmlTags(input)).toBe(input);
    });

    it('should not escape < and > in strings without HTML tags', () => {
      const input = 'Math: 5 < 10 and 8 > 3';
      expect(escapeHtmlTags(input)).toBe(input);
    });

    it('should not escape isolated < or > characters', () => {
      const input = 'Price: < $100 or > $50';
      expect(escapeHtmlTags(input)).toBe(input);
    });

    it('should escape only when HTML tags are present', () => {
      const input = 'Price < $100 and <script>alert("test")</script>';
      const expected = 'Price \\< $100 and \\<script\\>alert("test")\\</script\\>';
      expect(escapeHtmlTags(input)).toBe(expected);
    });

    it('should detect self-closing tags', () => {
      const input = 'Image: <img src="test.jpg"/> and text';
      const expected = 'Image: \\<img src="test.jpg"/\\> and text';
      expect(escapeHtmlTags(input)).toBe(expected);
    });

    it('should detect tags with attributes', () => {
      const input = 'Link: <a href="http://example.com">click here</a>';
      const expected = 'Link: \\<a href="http://example.com"\\>click here\\</a\\>';
      expect(escapeHtmlTags(input)).toBe(expected);
    });

    it('should not process malformed tags without proper structure', () => {
      const input = 'Incomplete: < div or span >';
      expect(escapeHtmlTags(input)).toBe(input);
    });
  });

  describe('escapeHtmlInObject', () => {
    it('should escape string properties in simple object', () => {
      const input = {
        name: 'Test <script>',
        description: 'Description with <tags>',
        count: 123
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.name).toBe('Test \\<script\\>');
      expect(result.description).toBe('Description with \\<tags\\>');
      expect(result.count).toBe(123);
    });

    it('should handle nested objects', () => {
      const input = {
        title: 'Main <title>',
        nested: {
          subtitle: 'Sub <title>',
          value: 42
        }
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.title).toBe('Main \\<title\\>');
      expect(result.nested.subtitle).toBe('Sub \\<title\\>');
      expect(result.nested.value).toBe(42);
    });

    it('should handle arrays of strings', () => {
      const input = {
        tags: ['<tag1>', '<tag2>', 'normal']
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.tags).toEqual(['\\<tag1\\>', '\\<tag2\\>', 'normal']);
    });

    it('should handle arrays of objects', () => {
      const input = {
        items: [
          { name: '<item1>' },
          { name: '<item2>' }
        ]
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.items[0].name).toBe('\\<item1\\>');
      expect(result.items[1].name).toBe('\\<item2\\>');
    });

    it('should handle null and undefined values', () => {
      const input = {
        nullValue: null,
        undefinedValue: undefined,
        text: '<script>'
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
      expect(result.text).toBe('\\<script\\>');
    });

    it('should return null for null input', () => {
      expect(escapeHtmlInObject(null)).toBeNull();
    });

    it('should skip escaping when NO_ESCAPE_HTML is set to true', () => {
      process.env.NO_ESCAPE_HTML = 'true';
      
      const input = {
        name: 'Test <script>',
        description: 'Description with <tags>'
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.name).toBe('Test <script>');
      expect(result.description).toBe('Description with <tags>');
    });

    it('should escape when NO_ESCAPE_HTML is set to false', () => {
      process.env.NO_ESCAPE_HTML = 'false';
      
      const input = {
        name: 'Test <script>'
      };
      
      const result = escapeHtmlInObject(input);
      
      expect(result.name).toBe('Test \\<script\\>');
    });

    it('should handle simple types without modification', () => {
      expect(escapeHtmlInObject('simple string')).toBe('simple string');
      expect(escapeHtmlInObject(123)).toBe(123);
      expect(escapeHtmlInObject(true)).toBe(true);
      expect(escapeHtmlInObject(new Date('2023-01-01'))).toEqual(new Date('2023-01-01'));
    });
  });

  describe('escapeHtmlInObjectArray', () => {
    it('should escape strings in all objects in array', () => {
      const input = [
        { name: '<item1>', value: 1 },
        { name: '<item2>', value: 2 }
      ];
      
      const result = escapeHtmlInObjectArray(input);
      
      expect(result?.[0].name).toBe('\\<item1\\>');
      expect(result?.[0].value).toBe(1);
      expect(result?.[1].name).toBe('\\<item2\\>');
      expect(result?.[1].value).toBe(2);
    });

    it('should return null for null input', () => {
      expect(escapeHtmlInObjectArray(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(escapeHtmlInObjectArray(undefined)).toBeUndefined();
    });

    it('should handle empty array', () => {
      const input: any[] = [];
      const result = escapeHtmlInObjectArray(input);
      expect(result).toEqual([]);
    });

    it('should skip escaping when NO_ESCAPE_HTML is set to true', () => {
      process.env.NO_ESCAPE_HTML = 'true';
      
      const input = [
        { name: '<item1>' },
        { name: '<item2>' }
      ];
      
      const result = escapeHtmlInObjectArray(input);
      
      expect(result?.[0].name).toBe('<item1>');
      expect(result?.[1].name).toBe('<item2>');
    });

    it('should handle complex nested structures', () => {
      const input = [
        {
          title: '<Title>',
          items: ['<tag1>', '<tag2>'],
          nested: {
            subtitle: '<Subtitle>',
            data: [{ field: '<Field>' }]
          }
        }
      ];
      
      const result = escapeHtmlInObjectArray(input);
      
      expect(result?.[0].title).toBe('\\<Title\\>');
      expect(result?.[0].items).toEqual(['\\<tag1\\>', '\\<tag2\\>']);
      expect(result?.[0].nested.subtitle).toBe('\\<Subtitle\\>');
      expect(result?.[0].nested.data[0].field).toBe('\\<Field\\>');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle circular references gracefully', () => {
      const obj: any = { name: '<test>' };
      obj.self = obj;
      
      // Should not throw an error due to circular reference
      expect(() => escapeHtmlInObject(obj)).not.toThrow();
    });

    it('should handle objects with getters/setters', () => {
      const obj = {
        _name: '<test>',
        get name() { return this._name; },
        set name(value) { this._name = value; }
      };
      
      expect(() => escapeHtmlInObject(obj)).not.toThrow();
    });

    it('should handle prototype pollution attempts', () => {
      const maliciousObj = {
        '__proto__': { polluted: '<script>' },
        name: '<test>'
      };
      
      const result = escapeHtmlInObject(maliciousObj);
      expect(result.name).toBe('\\<test\\>');
    });

    it('should handle mixed content with and without HTML tags', () => {
      const mixedContent = {
        safeText: 'Price: 10 < 20',
        htmlContent: 'Click <button>here</button>',
        mathExpression: 'Result: x > 5'
      };
      
      const result = escapeHtmlInObject(mixedContent);
      
      expect(result.safeText).toBe('Price: 10 < 20'); // No escaping
      expect(result.htmlContent).toBe('Click \\<button\\>here\\</button\\>'); // Escaped
      expect(result.mathExpression).toBe('Result: x > 5'); // No escaping
    });
  });
}); 