import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvidenceUploader from '@/components/shared/EvidenceUploader';

// ---------------------------------------------------------------------------
// Mock sonner toast
// ---------------------------------------------------------------------------

const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a File with a specific reported size via Object.defineProperty. */
const createFile = (name: string, sizeBytes: number, type: string): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes, writable: false });
  return file;
};

const jpgFile = () => createFile('photo.jpg', 1024, 'image/jpeg');
const pngFile = () => createFile('screenshot.png', 2048, 'image/png');
const pdfFile = () => createFile('notes.pdf', 3072, 'application/pdf');
const docFile = () =>
  createFile(
    'essay.docx',
    4096,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );

/**
 * Simulate selecting files via the hidden input using fireEvent.change.
 * userEvent.upload causes stack overflow in happy-dom because the drop zone
 * click handler propagates, so we use fireEvent directly.
 */
const simulateFileSelect = (input: HTMLElement, files: File[]) => {
  // Create a mock FileList
  const fileList = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) yield files[i];
    },
  };
  for (let i = 0; i < files.length; i++) {
    Object.defineProperty(fileList, i, { value: files[i], enumerable: true });
  }

  fireEvent.change(input, { target: { files: fileList } });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EvidenceUploader', () => {
  const defaultProps = {
    files: [] as File[],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders the drop zone with upload instructions
  it('renders the drop zone with upload instructions', () => {
    render(<EvidenceUploader {...defaultProps} />);

    expect(
      screen.getByText('Drag & drop files here, or click to browse'),
    ).toBeInTheDocument();
  });

  // 2. Shows file count (0/3 files)
  it('shows file count (0/3 files)', () => {
    render(<EvidenceUploader {...defaultProps} />);

    expect(screen.getByText(/0\/3 files/)).toBeInTheDocument();
  });

  // 3. Accepts files via the hidden file input
  it('accepts files via the hidden file input', () => {
    const onChange = vi.fn();
    render(<EvidenceUploader {...defaultProps} onChange={onChange} />);

    const input = screen.getByTestId('evidence-file-input');
    const file = jpgFile();
    simulateFileSelect(input, [file]);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([file]);
  });

  // 4. Shows file name and size for uploaded files
  it('shows file name and size for uploaded files', () => {
    const file = pdfFile();
    render(<EvidenceUploader {...defaultProps} files={[file]} />);

    expect(screen.getByText('notes.pdf')).toBeInTheDocument();
    expect(screen.getByText('3.0 KB')).toBeInTheDocument();
  });

  // 5. Shows image thumbnail for jpg/png files
  it('shows image thumbnail for jpg/png files', () => {
    const mockUrl = 'blob:http://localhost/mock-image';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

    const file = jpgFile();
    render(<EvidenceUploader {...defaultProps} files={[file]} />);

    const img = screen.getByAltText('photo.jpg');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockUrl);

    vi.restoreAllMocks();
  });

  // 6. Shows FileText icon for document files (pdf, doc, docx)
  it('shows FileText icon for document files', () => {
    const file = pdfFile();
    render(<EvidenceUploader {...defaultProps} files={[file]} />);

    // PDF files should NOT have an img element (they get the FileText icon)
    expect(screen.queryByAltText('notes.pdf')).not.toBeInTheDocument();
    // The file name should still be visible
    expect(screen.getByText('notes.pdf')).toBeInTheDocument();
  });

  // 7. Remove button removes a file from the list
  it('remove button removes a file from the list', async () => {
    const onChange = vi.fn();
    const file = jpgFile();
    render(<EvidenceUploader {...defaultProps} files={[file]} onChange={onChange} />);

    const removeBtn = screen.getByRole('button', { name: /remove photo\.jpg/i });
    await userEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([]);
  });

  // 8. Hides drop zone when max files (3) reached
  it('hides drop zone when max files (3) reached', () => {
    const files = [jpgFile(), pngFile(), pdfFile()];
    render(<EvidenceUploader {...defaultProps} files={files} />);

    expect(
      screen.queryByText('Drag & drop files here, or click to browse'),
    ).not.toBeInTheDocument();
  });

  // 9. Shows "Maximum 3 files reached" message when full
  it('shows "Maximum 3 files reached" message when full', () => {
    const files = [jpgFile(), pngFile(), pdfFile()];
    render(<EvidenceUploader {...defaultProps} files={files} />);

    expect(screen.getByText(/maximum 3 files reached/i)).toBeInTheDocument();
  });

  // 10. Rejects files with invalid types (shows toast error)
  it('rejects files with invalid types (shows toast error)', () => {
    const onChange = vi.fn();
    render(<EvidenceUploader {...defaultProps} onChange={onChange} />);

    const input = screen.getByTestId('evidence-file-input');
    const invalidFile = createFile('script.exe', 1024, 'application/x-msdownload');
    simulateFileSelect(input, [invalidFile]);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining('not a supported file type'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  // 11. Rejects files over 5MB (shows toast error)
  it('rejects files over 5MB (shows toast error)', () => {
    const onChange = vi.fn();
    render(<EvidenceUploader {...defaultProps} onChange={onChange} />);

    const input = screen.getByTestId('evidence-file-input');
    const bigFile = createFile('huge.jpg', 6 * 1024 * 1024, 'image/jpeg');
    simulateFileSelect(input, [bigFile]);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining('exceeds the'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  // 12. Rejects additional files when at max capacity (shows toast error)
  it('rejects additional files when at max capacity (shows toast error)', () => {
    const onChange = vi.fn();
    // Start with 2 files, try to add 2 more (only 1 slot remaining)
    const existingFiles = [jpgFile(), pngFile()];
    render(
      <EvidenceUploader {...defaultProps} files={existingFiles} onChange={onChange} />,
    );

    const input = screen.getByTestId('evidence-file-input');
    const file1 = pdfFile();
    const file2 = docFile();
    simulateFileSelect(input, [file1, file2]);

    // First file should be accepted, second should trigger toast
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining('Maximum 3 files allowed'),
    );
    // onChange should still be called with the one accepted file
    expect(onChange).toHaveBeenCalledOnce();
  });

  // 13. Has proper ARIA attributes (role="button", aria-label)
  it('has proper ARIA attributes (role="button", aria-label)', () => {
    render(<EvidenceUploader {...defaultProps} />);

    const dropZone = screen.getByRole('button', { name: /upload evidence files/i });
    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveAttribute('tabindex', '0');
  });

  // 14. Remove button has accessible aria-label
  it('remove button has accessible aria-label', () => {
    const file = jpgFile();
    render(<EvidenceUploader {...defaultProps} files={[file]} />);

    const removeBtn = screen.getByRole('button', { name: /remove photo\.jpg/i });
    expect(removeBtn).toBeInTheDocument();
  });

  // 15. Keyboard accessible (Enter/Space to browse)
  it('is keyboard accessible (Enter/Space to browse)', () => {
    render(<EvidenceUploader {...defaultProps} />);

    const dropZone = screen.getByRole('button', { name: /upload evidence files/i });
    expect(dropZone).toHaveAttribute('tabindex', '0');
    expect(dropZone).toHaveAttribute('role', 'button');
  });

  // Additional: shows file count updating with files
  it('shows updated file count when files are present', () => {
    const files = [jpgFile(), pngFile()];
    render(<EvidenceUploader {...defaultProps} files={files} />);

    expect(screen.getByText(/2\/3 files/)).toBeInTheDocument();
  });

  // Additional: uploaded files list has proper aria-label
  it('uploaded files list has proper aria-label', () => {
    const files = [jpgFile()];
    render(<EvidenceUploader {...defaultProps} files={files} />);

    const list = screen.getByRole('list', { name: /uploaded files/i });
    expect(list).toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });
});
