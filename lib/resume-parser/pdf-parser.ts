import * as pdfParse from 'pdf-parse';

export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    // @ts-ignore - pdf-parse has inconsistent types between CJS and ESM
    const pdf = pdfParse.default || pdfParse;
    const data = await pdf(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
