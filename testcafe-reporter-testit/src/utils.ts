export default function addNewLine(text: string, line: string): string {
    if (text === null || text.length === 0) {
      return line;
    }
    return `${text}\n${line}`;
}
