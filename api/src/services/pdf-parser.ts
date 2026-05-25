/**
 * Server-side PDF text extraction using pdf-parse v2.
 * Receives base64-encoded PDF data, returns extracted text.
 */
import { PDFParse } from 'pdf-parse';

export async function parsePdf(base64Data: string): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}