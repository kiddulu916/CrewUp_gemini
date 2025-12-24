import { extractTextFromPDF } from './pdf-parser';
import { extractTextFromDOCX } from './docx-parser';

export async function extractTextFromFile(
  file: File
): Promise<string> {
  const buffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    return extractTextFromPDF(buffer);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDOCX(buffer);
  } else if (file.type === 'text/plain') {
    const text = new TextDecoder().decode(buffer);
    return text;
  }

  throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
}

// Simple pattern-based field extraction (non-AI)
export function extractBasicFields(text: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  // Extract email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Extract phone (various formats)
  const phoneMatch = text.match(/(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  // Extract name (first 2-3 lines with proper capitalization)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const name = lines[0]?.trim();

  return {
    name: name && name.length > 2 && name.length < 100 ? name : undefined,
    email,
    phone,
  };
}
