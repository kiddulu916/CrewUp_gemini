import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const data = await pdf(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
