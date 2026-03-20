// =============================================================================
// Avatar Upload — Unit tests
// Tests avatar file validation and upload logic (Req 8.2)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

import {
  validateAvatarFile,
  uploadAvatarFile,
  FileValidationError,
} from '@/lib/fileUpload';

// ─── Helpers ────────────────────────────────────────────────────────────────

const createFile = (name: string, type: string, sizeBytes: number): File => {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('validateAvatarFile', () => {
  it('accepts a valid JPEG under 2MB', () => {
    const file = createFile('photo.jpg', 'image/jpeg', 500_000);
    expect(() => validateAvatarFile(file)).not.toThrow();
  });

  it('accepts a valid PNG under 2MB', () => {
    const file = createFile('photo.png', 'image/png', 1_000_000);
    expect(() => validateAvatarFile(file)).not.toThrow();
  });

  it('accepts a valid GIF under 2MB', () => {
    const file = createFile('anim.gif', 'image/gif', 500_000);
    expect(() => validateAvatarFile(file)).not.toThrow();
  });

  it('accepts a valid WebP under 2MB', () => {
    const file = createFile('photo.webp', 'image/webp', 500_000);
    expect(() => validateAvatarFile(file)).not.toThrow();
  });

  it('rejects files exceeding 2MB', () => {
    const file = createFile('big.png', 'image/png', 3 * 1024 * 1024);
    expect(() => validateAvatarFile(file)).toThrow(FileValidationError);
    expect(() => validateAvatarFile(file)).toThrow(/2MB limit/);
  });

  it('rejects non-image file types', () => {
    const file = createFile('doc.pdf', 'application/pdf', 100_000);
    expect(() => validateAvatarFile(file)).toThrow(FileValidationError);
    expect(() => validateAvatarFile(file)).toThrow(/Only image files/);
  });

  it('rejects SVG files', () => {
    const file = createFile('icon.svg', 'image/svg+xml', 10_000);
    expect(() => validateAvatarFile(file)).toThrow(FileValidationError);
  });
});

describe('uploadAvatarFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads file and returns public URL', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/avatars/user-1/avatar_123.png' },
    });

    const file = createFile('photo.png', 'image/png', 500_000);
    const url = await uploadAvatarFile({ file, userId: 'user-1' });

    expect(mockUpload).toHaveBeenCalledOnce();
    expect(url).toBe('https://storage.example.com/avatars/user-1/avatar_123.png');
  });

  it('throws on upload error', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } });

    const file = createFile('photo.png', 'image/png', 500_000);
    await expect(uploadAvatarFile({ file, userId: 'user-1' })).rejects.toThrow(
      'Avatar upload failed: Bucket not found',
    );
  });

  it('validates file before uploading', async () => {
    const file = createFile('big.png', 'image/png', 3 * 1024 * 1024);
    await expect(uploadAvatarFile({ file, userId: 'user-1' })).rejects.toThrow(
      FileValidationError,
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
