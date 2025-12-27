export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import for pdf-parse to handle ESM/CJS compatibility
    const pdfParseModule = await import('pdf-parse') as any;

    // Try multiple ways to get the parser function
    let parseFunction: any;

    // Method 1: Check for default export
    if (typeof pdfParseModule.default === 'function') {
      parseFunction = pdfParseModule.default;
    }
    // Method 2: Check if the module itself is callable
    else if (typeof pdfParseModule === 'function') {
      parseFunction = pdfParseModule;
    }
    // Method 3: Check for named export
    else if (typeof pdfParseModule.pdf === 'function') {
      parseFunction = pdfParseModule.pdf;
    }

    if (!parseFunction || typeof parseFunction !== 'function') {
      console.error('pdf-parse module structure:', Object.keys(pdfParseModule));
      console.error('pdf-parse default:', pdfParseModule.default);
      throw new Error('pdf-parse library not loaded correctly. Module structure: ' + Object.keys(pdfParseModule).join(', '));
    }

    const data = await parseFunction(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF: ' + (error instanceof Error ? error.message : String(error)));
  }
}
