import { describe, it, expect } from 'vitest';
import { validateFile, FileValidationError } from '@/lib/fileUpload';

// Helper to create a mock File with a given name and size
function createMockFile(name: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type: 'application/octet-stream' });
}

describe('fileUpload — validateFile', () => {
  it('accepts a valid PDF under 10MB', () => {
    const file = createMockFile('report.pdf', 1024 * 1024); // 1MB
    expect(() => validateFile(file)).not.toThrow();
  });

  it('accepts all allowed file types', () => {
    const types = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'zip'];
    for (const ext of types) {
      const file = createMockFile(`file.${ext}`, 1024);
      expect(() => validateFile(file)).not.toThrow();
    }
  });

  it('rejects files exceeding 10MB', () => {
    const file = createMockFile('big.pdf', 11 * 1024 * 1024); // 11MB
    expect(() => validateFile(file)).toThrow(FileValidationError);
    expect(() => validateFile(file)).toThrow(/10MB limit/);
  });

  it('rejects disallowed file extensions', () => {
    const file = createMockFile('script.exe', 1024);
    expect(() => validateFile(file)).toThrow(FileValidationError);
    expect(() => validateFile(file)).toThrow(/not allowed/);
  });

  it('rejects files with no extension', () => {
    const file = createMockFile('noext', 1024);
    expect(() => validateFile(file)).toThrow(FileValidationError);
  });

  it('accepts a file exactly at 10MB', () => {
    const file = createMockFile('exact.pdf', 10 * 1024 * 1024);
    expect(() => validateFile(file)).not.toThrow();
  });

  it('rejects a file just over 10MB', () => {
    const file = createMockFile('over.pdf', 10 * 1024 * 1024 + 1);
    expect(() => validateFile(file)).toThrow(FileValidationError);
  });

  it('handles case-insensitive extensions', () => {
    const file = createMockFile('REPORT.PDF', 1024);
    // File.name preserves case, but our validator lowercases the extension
    expect(() => validateFile(file)).not.toThrow();
  });
});
