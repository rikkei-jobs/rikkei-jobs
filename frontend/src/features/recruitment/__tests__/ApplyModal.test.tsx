import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplyModal } from '../components/ApplyModal';
import * as api from '../api/applicationApi';
import { ApiError } from '../../../shared/api/http';

describe('ApplyModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnUploadCv = vi.fn();
  const cvOptions = [
    {
      id: 8,
      title: 'CV kỹ sư backend',
      originalFilename: 'backend.pdf',
      fileSize: 1024,
      updatedAt: '2026-11-10T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <ApplyModal
        jobId={101}
        jobTitle="Backend Java"
        companyName="Rikkei Digital"
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onUploadCv={mockOnUploadCv}
        cvOptions={cvOptions}
      />,
    );

    expect(screen.getByText('Ứng tuyển vị trí việc làm')).toBeInTheDocument();
    expect(screen.getByText(/Backend Java/)).toBeInTheDocument();
    expect(screen.getByText('Rikkei Digital')).toBeInTheDocument();
    expect(screen.getByLabelText(/Chọn CV ứng tuyển/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ApplyModal
        jobId={101}
        jobTitle="Backend Java"
        companyName="Rikkei Digital"
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onUploadCv={mockOnUploadCv}
        cvOptions={cvOptions}
      />,
    );

    expect(screen.queryByText('Ứng tuyển vị trí việc làm')).not.toBeInTheDocument();
  });

  it('submits application successfully and invokes onSuccess', async () => {
    const mockDetail = {
      id: 1,
      jobId: 101,
      jobTitle: 'Backend Java',
      companyName: 'Rikkei Digital',
      cvId: 8,
      cvSnapshotUrl: '/snapshots/cv1.pdf',
      coverLetter: 'Hello',
      status: 'SUBMITTED' as const,
      canWithdraw: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      histories: [],
    };

    vi.spyOn(api, 'applyJob').mockResolvedValueOnce(mockDetail);

    render(
      <ApplyModal
        jobId={101}
        jobTitle="Backend Java"
        companyName="Rikkei Digital"
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onUploadCv={mockOnUploadCv}
        cvOptions={cvOptions}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Xác nhận nộp đơn/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockDetail);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays 409 duplicate error message when candidate already has open application', async () => {
    render(
      <ApplyModal
        jobId={101}
        jobTitle="Backend Java"
        companyName="Rikkei Digital"
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onUploadCv={mockOnUploadCv}
        cvOptions={cvOptions}
      />,
    );

    vi.spyOn(api, 'applyJob').mockRejectedValueOnce(
      new ApiError(409, {
        code: 'ALREADY_APPLIED',
        message: 'Ứng viên đã nộp hồ sơ',
      }),
    );

    const submitBtn = screen.getByRole('button', { name: /Xác nhận nộp đơn/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bạn đã nộp hồ sơ cho vị trí này/i)).toBeInTheDocument();
    });
  });

  it('requires an uploaded CV before enabling submission', () => {
    render(
      <ApplyModal
        jobId={101}
        jobTitle="Backend Java"
        companyName="Rikkei Digital"
        isOpen
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onUploadCv={mockOnUploadCv}
        cvOptions={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Tải CV PDF' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Xác nhận nộp đơn/i })).toBeDisabled();
  });
});
