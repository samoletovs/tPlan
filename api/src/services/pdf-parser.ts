/**
 * Server-side PDF text extraction using pdf-parse.
 * Receives base64-encoded PDF data, returns extracted text.
 */

export async function parsePdf(base64Data: string): Promise<string> {
  const pdfParse = await import('pdf-parse');
  const fn = (pdfParse as any).default || pdfParse;

  const buffer = Buffer.from(base64Data, 'base64');
  const result = await fn(buffer);

  return result.text;
}
