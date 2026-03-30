/**
 * Server-side PDF text extraction using pdf-parse.
 * Receives base64-encoded PDF data, returns extracted text.
 */

import { createRequire } from 'node:module';

export async function parsePdf(base64Data: string): Promise<string> {
  // pdf-parse is CJS — use createRequire for reliable import in ESM context
  const require = createRequire(import.meta.url);
  const pdfParse = require('pdf-parse');

  const buffer = Buffer.from(base64Data, 'base64');
  const result = await pdfParse(buffer);

  return result.text;
}
