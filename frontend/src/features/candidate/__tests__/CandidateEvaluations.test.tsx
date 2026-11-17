import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { CandidateEvaluations } from '../components/CandidateEvaluations';
import type { CandidateEvaluationsData } from '../types';
import {
  setAuthSessionHandlers,
  resetAuthSessionState,
  setAuthToken,
} from '../../../shared/api/httpClient';

const MOCK_EVALUATIONS_DATA: CandidateEvaluationsData = {
  userId: 10,
  evaluations: [
    {
      id: 101,
      mentor: {
        id: 201,
        name: 'Nguyễn Văn Mentor',
        email: 'mentor.nguyen@rikkeisoft.com',
      },
      templateId: 1,
      context: 'INTERNSHIP',
      submittedAt: '2026-11-15T14:30:00Z',
      overallComment: 'Thực tập sinh có tinh thần học hỏi tốt, nắm vững Spring Boot.',
      scores: [
        {
          criterionId: 1,
          criterionDescription: 'Kiến thức Java Core và OOP',
          skillCode: 'JAVA_CORE',
          score: 85,
          comment: 'Nắm vững Collections, Streams API và đa luồng cơ bản.',
        },
        {
          criterionId: 2,
          criterionDescription: 'Xây dựng REST API với Spring Boot',
          skillCode: 'SPRING_BOOT',
          score: 78,
          comment: 'Thiết kế RESTful chuẩn mực, validation tốt.',
        },
      ],
    },
    {
      id: 102,
      mentor: {
        id: 202,
        name: 'Trần Thị Phỏng Vấn',
        email: 'interviewer.tran@rikkeisoft.com',
      },
      templateId: 2,
      context: 'INTERVIEW',
      submittedAt: '2026-11-16T09:00:00Z',
      overallComment: 'Giao tiếp rõ ràng, tư duy thuật toán mạch lạc.',
      scores: [
        {
          criterionId: 3,
          criterionDescription: 'Giải thuật và Cấu trúc dữ liệu',
          skillCode: 'DATA_STRUCTURES',
          score: 90,
          comment: 'Giải quyết tốt bài toán tìm kiếm và quy hoạch động.',
        },
      ],
    },
  ],
};

const okResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const errorResponse = (status: number, message: string, code = 'ERROR'): Response =>
  ({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ code, message }),
  }) as unknown as Response;

describe('CandidateEvaluations Component', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  it('renders loading state initially while fetching evaluations', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<CandidateEvaluations userId={10} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Đang tải đánh giá')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chờ trong giây lát...')).toBeInTheDocument();

    // Clean up pending promise wrapped in act
    await act(async () => {
      resolveFetch(okResponse(MOCK_EVALUATIONS_DATA));
    });
  });

  it('renders safe account missing state when no userId is provided', () => {
    render(<CandidateEvaluations />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy tài khoản')).toBeInTheDocument();
    expect(
      screen.getByText('Không tìm thấy thông tin tài khoản ứng viên. Vui lòng đăng nhập lại.')
    ).toBeInTheDocument();
  });

  it('renders empty state when candidate has no submitted evaluations', async () => {
    const emptyData: CandidateEvaluationsData = { userId: 10, evaluations: [] };
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(emptyData));

    render(<CandidateEvaluations userId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Chưa có đánh giá nào từ mentor')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Các phiếu đánh giá từ mentor sẽ xuất hiện tại đây sau khi được gửi.')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders successfully the list of submitted evaluations with mentor info and context', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(MOCK_EVALUATIONS_DATA));

    render(<CandidateEvaluations userId={10} candidateName="Lê Văn Ứng Viên" />);

    await waitFor(() => {
      expect(screen.getByText('Đánh giá từ mentor')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Theo dõi kết quả đánh giá và nhận xét từ mentor dành cho ứng viên Lê Văn Ứng Viên.'
      )
    ).toBeInTheDocument();

    // Overview total count
    expect(screen.getByTestId('evaluations-count')).toHaveTextContent('2');

    // Mentors info
    expect(screen.getByText('Đánh giá từ Nguyễn Văn Mentor')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá từ Trần Thị Phỏng Vấn')).toBeInTheDocument();
    expect(screen.getByText('mentor.nguyen@rikkeisoft.com', { exact: false })).toBeInTheDocument();

    // Context badges
    expect(screen.getByText('Thực tập')).toBeInTheDocument();
    expect(screen.getByText('Phỏng vấn')).toBeInTheDocument();
  });

  it('toggles accordion details on button click with proper aria-expanded', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(MOCK_EVALUATIONS_DATA));

    render(<CandidateEvaluations userId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Đánh giá từ Nguyễn Văn Mentor')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    expect(toggleButtons).toHaveLength(2);
    expect(toggleButtons[0]).toHaveAttribute('aria-expanded', 'false');

    // Initially details should not be rendered
    expect(
      screen.queryByText('Kiến thức Java Core và OOP')
    ).not.toBeInTheDocument();

    // Click to expand first evaluation
    fireEvent.click(toggleButtons[0]);

    expect(toggleButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(toggleButtons[0]).toHaveTextContent('Ẩn chi tiết');

    // Scores and criteria should now be visible
    expect(screen.getByText('Kết quả theo từng tiêu chí')).toBeInTheDocument();
    expect(screen.getByText('Kiến thức Java Core và OOP')).toBeInTheDocument();
    expect(screen.getByText('JAVA_CORE')).toBeInTheDocument();
    expect(screen.getByText('Xây dựng REST API với Spring Boot')).toBeInTheDocument();
    expect(
      screen.getByText('Thực tập sinh có tinh thần học hỏi tốt, nắm vững Spring Boot.')
    ).toBeInTheDocument();

    // Score numbers and badges
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Xuất sắc')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('Khá')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButtons[0]);
    expect(toggleButtons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByText('Kiến thức Java Core và OOP')
    ).not.toBeInTheDocument();
  });

  it('renders error state when API call fails and allows retry', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(500, 'Máy chủ nội bộ gặp sự cố'))
      .mockResolvedValueOnce(okResponse(MOCK_EVALUATIONS_DATA));

    render(<CandidateEvaluations userId={10} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Không thể tải dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Máy chủ nội bộ gặp sự cố')).toBeInTheDocument();

    // Click retry button
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    // After retry, evaluations should load successfully
    await waitFor(() => {
      expect(screen.getByText('Đánh giá từ Nguyễn Văn Mentor')).toBeInTheDocument();
    });
  });

  it('conforms to WCAG accessibility attributes (role, aria-expanded, aria-controls, progressbar)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(MOCK_EVALUATIONS_DATA));

    render(<CandidateEvaluations userId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Đánh giá từ Nguyễn Văn Mentor')).toBeInTheDocument();
    });

    const toggleButton = screen.getAllByRole('button', { name: /Xem chi tiết/i })[0];
    const detailsId = toggleButton.getAttribute('aria-controls');
    expect(detailsId).toBeTruthy();

    fireEvent.click(toggleButton);

    const detailsElement = document.getElementById(detailsId!);
    expect(detailsElement).toBeInTheDocument();

    // Check progress bars accessibility
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '85');
    expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0');
    expect(progressBars[0]).toHaveAttribute('aria-valuemax', '100');
  });
});
