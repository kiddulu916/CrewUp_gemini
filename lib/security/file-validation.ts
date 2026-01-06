/**
 * File Validation Utilities
 * 
 * * Provides server-side file validation for uploads
 * ! Always validate on the server - client validation can be bypassed
 */

import * as Sentry from '@sentry/nextjs';

// * Allowed MIME types for images
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

// * Allowed MIME types for documents
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// * File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  profileImage: 5 * 1024 * 1024, // 5MB
  portfolioImage: 5 * 1024 * 1024, // 5MB
  certificationDocument: 10 * 1024 * 1024, // 10MB
  resume: 10 * 1024 * 1024, // 10MB
} as const;

// * Magic bytes for common file types (first few bytes of file)
const FILE_SIGNATURES: Record<string, Uint8Array[]> = {
  'image/jpeg': [
    new Uint8Array([0xFF, 0xD8, 0xFF]),
  ],
  'image/png': [
    new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  ],
  'image/gif': [
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ],
  'image/webp': [
    // WEBP starts with RIFF....WEBP
    new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF (partial match)
  ],
  'application/pdf': [
    new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
  ],
};

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validate file type using both MIME type and magic bytes
 * 
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result
 */
export async function validateFileType(
  file: File,
  allowedTypes: readonly string[]
): Promise<FileValidationResult> {
  // * Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  // * Check magic bytes (file signature)
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    const signatures = FILE_SIGNATURES[file.type];
    if (signatures) {
      const matchesSignature = signatures.some(sig => 
        sig.every((byte, i) => bytes[i] === byte)
      );

      if (!matchesSignature) {
        // ! File extension doesn't match actual content - potential attack
        Sentry.captureMessage('File type mismatch detected', {
          level: 'warning',
          tags: { security: 'file_validation' },
          extra: {
            claimedType: file.type,
            actualBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16)).join(' '),
          },
        });

        return {
          valid: false,
          error: 'File content does not match the file type',
        };
      }
    }
  } catch (err) {
    console.error('Error reading file bytes:', err);
    // * Allow if we can't check magic bytes (edge case)
  }

  return { valid: true };
}

/**
 * Validate file size
 * 
 * @param file - The file to validate
 * @param maxSize - Maximum allowed size in bytes
 * @returns Validation result
 */
export function validateFileSize(
  file: File,
  maxSize: number
): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size must be under ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate file name for potential path traversal or malicious content
 * 
 * @param fileName - The original file name
 * @returns Sanitized file name or error
 */
export function sanitizeFileName(fileName: string): { valid: boolean; sanitized?: string; error?: string } {
  // * Remove path separators and null bytes
  let sanitized = fileName
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/\0/g, '') // Remove null bytes
    .replace(/\.\./g, '') // Remove directory traversal attempts
    .trim();

  // * Limit file name length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // * Ensure file name is not empty after sanitization
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Invalid file name',
    };
  }

  // * Check for dangerous file extensions (double extensions, etc.)
  const dangerousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.sh$/i,
    /\.ps1$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.html?$/i,
    /\.js$/i,
  ];

  if (dangerousPatterns.some(pattern => pattern.test(sanitized))) {
    Sentry.captureMessage('Dangerous file extension upload attempt', {
      level: 'warning',
      tags: { security: 'file_validation' },
      extra: { fileName: sanitized },
    });

    return {
      valid: false,
      error: 'File type not allowed',
    };
  }

  return { valid: true, sanitized };
}

/**
 * Complete file validation
 * 
 * @param file - The file to validate
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateFile(
  file: File,
  options: {
    allowedTypes: readonly string[];
    maxSize: number;
  }
): Promise<FileValidationResult & { sanitizedName?: string }> {
  // * Validate file name
  const nameResult = sanitizeFileName(file.name);
  if (!nameResult.valid) {
    return { valid: false, error: nameResult.error };
  }

  // * Validate file type
  const typeResult = await validateFileType(file, options.allowedTypes);
  if (!typeResult.valid) {
    return typeResult;
  }

  // * Validate file size
  const sizeResult = validateFileSize(file, options.maxSize);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return { 
    valid: true, 
    sanitizedName: nameResult.sanitized,
  };
}

