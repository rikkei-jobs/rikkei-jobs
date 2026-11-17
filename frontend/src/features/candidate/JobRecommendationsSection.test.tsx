import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { JobRecommendationsSection } from './JobRecommendationsSection';
import * as api from './api/jobRecommendations';
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders section title and recommendations cards correctly', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);

    render(<JobRecommendationsSection />);

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
    expect(screen.getByText(/Đã lưu bộ nhớ đệm/i)).toBeInTheDocument();
  });

  it('does not expose a candidate selector anymore', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);

    render(<JobRecommendationsSection />);

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/Chọn ứng viên/i)).not.toBeInTheDocument();
  });

  it('triggers fresh calculation when clicking "Làm mới"', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchJobRecommendations')
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        isCached: false,
      });

    render(<JobRecommendationsSection />);

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

    render(<JobRecommendationsSection />);

    await waitFor(() => {
      expect(screen.getByText(/Mạng không khả dụng/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });
  });
});
