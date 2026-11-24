import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobRecommendationsSection } from './JobRecommendationsSection';
import * as api from './api/jobRecommendations';
import { recruitmentApi } from '../recruitment';
import type { JobRecommendationsResponse } from './types';

describe('JobRecommendationsSection Component', () => {
  const mockResponse: JobRecommendationsResponse = {
    items: [
      {
        id: 1,
        jobId: 1,
        title: 'Kỹ sư Java Backend',
        companyName: 'Rikkeisoft',
        location: 'Hà Nội',
        salaryRange: '15 - 25 triệu',
        deadline: '2027-12-31T23:59:59+07:00',
        score: 95,
        explanation:
          'Hồ sơ của bạn phù hợp 95% với vị trí này nhờ năng lực tốt về Java và Spring Boot.',
        isAiGenerated: true,
        rank: 1,
        matchingSkills: ['Lập trình Java', 'Framework Spring Boot'],
        missingSkills: [],
        requiredSkills: [
          {
            skillCode: 'JAVA',
            skillName: 'Lập trình Java',
            requiredLevel: 75,
            candidateScore: 85,
            mandatory: true,
            satisfied: true,
          },
        ],
      },
      {
        id: 2,
        jobId: 2,
        title: 'Fresher Java Developer',
        companyName: 'FPT Software',
        location: 'Đà Nẵng',
        salaryRange: '8 - 14 triệu',
        deadline: '2027-12-31T23:59:59+07:00',
        score: 70,
        explanation: 'Gợi ý hệ thống dựa trên điểm kỹ năng phù hợp.',
        isAiGenerated: false,
        rank: 2,
        matchingSkills: ['Lập trình Java'],
        missingSkills: ['Cơ sở dữ liệu & SQL (35/50)'],
        requiredSkills: [
          {
            skillCode: 'JAVA',
            skillName: 'Lập trình Java',
            requiredLevel: 60,
            candidateScore: 80,
            mandatory: true,
            satisfied: true,
          },
        ],
      },
    ],
    total: 2,
    candidateId: 1,
    isCached: true,
    cachedAt: '2026-11-11T06:00:00Z',
    activeProvider: 'MOCK',
  };

  const renderSection = () =>
    render(
      <MemoryRouter>
        <JobRecommendationsSection />
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders section title and recommendations cards correctly', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);

    renderSection();

    expect(screen.getByText(/Việc làm phù hợp với bạn/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang phân tích hồ sơ kỹ năng/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
      expect(screen.getByText('Fresher Java Developer')).toBeInTheDocument();
    });

    expect(screen.getByText('95% khớp')).toBeInTheDocument();
    expect(screen.getByText('70% khớp')).toBeInTheDocument();
    expect(document.querySelector('.ai-label')).toHaveTextContent('Do AI tạo');
    expect(document.querySelector('.system-label')).toHaveTextContent('Gợi ý hệ thống');
    expect(screen.getByText(/Cập nhật trong ngày/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI Provider/i)).not.toBeInTheDocument();
    const applyButtons = screen.getAllByRole('button', { name: /^Ứng tuyển$/i });
    expect(applyButtons).toHaveLength(2);
    applyButtons.forEach((button) => {
      expect(button).toBeEnabled();
    });
  });

  it('opens ApplyDialog when clicking "Ứng tuyển" on a job card', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [{ id: 11, title: 'CV Java Backend', isDefault: true }],
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByRole('button', { name: /^Ứng tuyển$/i });
    fireEvent.click(applyButtons[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Nộp hồ sơ ứng tuyển');
    expect(dialog).toHaveTextContent('Kỹ sư Java Backend — Rikkeisoft');
    expect(await screen.findByText('CV Java Backend')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại ứng tuyển' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not expose a candidate selector anymore', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/Chọn ứng viên/i)).not.toBeInTheDocument();
  });

  it('links each card to the JD detail route', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link', { name: /Chi tiết JD/i });
    expect(links[0]).toHaveAttribute('href', '/candidate/jobs/1');
  });

  it('triggers fresh calculation when clicking "Làm mới"', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchJobRecommendations')
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        isCached: false,
      });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Làm mới/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(10, true);
    });
  });

  it('displays error message when API call fails and retries on demand', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchJobRecommendations')
      .mockRejectedValueOnce(new Error('Mạng không khả dụng'))
      .mockResolvedValueOnce(mockResponse);

    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/Mạng không khả dụng/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });
  });

  it('displays notice banner together with fallback recommendations when meta.message is present (A2)', async () => {
    const quotaNotice =
      'Bạn đã dùng hết lượt AI trong ngày. Đang hiển thị gợi ý dựa trên điểm kỹ năng.';
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce({
      ...mockResponse,
      items: [mockResponse.items[1]],
      total: 1,
      message: quotaNotice,
    });
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'unavailable',
      items: [],
      reason: 'Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau.',
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Fresher Java Developer')).toBeInTheDocument();
    });

    expect(screen.getByRole('status')).toHaveTextContent(quotaNotice);
    const applyButton = screen.getByRole('button', { name: /^Ứng tuyển$/i });
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Nộp hồ sơ ứng tuyển');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Dịch vụ quản lý CV hiện chưa sẵn sàng/i,
    );
    expect(screen.getByRole('status')).toHaveTextContent(quotaNotice);

    fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại ứng tuyển' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays disabled notice when recommendations list is empty and meta.message is present (A3)', async () => {
    const disabledNotice = 'AI đang tạm tắt';
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce({
      ...mockResponse,
      items: [],
      total: 0,
      message: disabledNotice,
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(disabledNotice);
    });
  });
});
