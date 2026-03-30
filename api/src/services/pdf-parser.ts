/**
 * Server-side PDF text extraction using pdf-parse v1.
 * Receives base64-encoded PDF data, returns extracted text.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export async function parsePdf(base64Data: string): Promise<string> {
  // pdf-parse v1 is CJS, exports a single function
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const buffer = Buffer.from(base64Data, 'base64');
  const result = await pdfParse(buffer);
  return result.text;
}
