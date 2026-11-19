import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ApplicationProgressStepper } from '../components/ApplicationProgressStepper';

describe('ApplicationProgressStepper Component', () => {
  it('renders all 5 pipeline steps', () => {
    render(<ApplicationProgressStepper status="SUBMITTED" />);

    expect(screen.getByText('Đã gửi')).toBeInTheDocument();
    expect(screen.getByText('Sàng lọc')).toBeInTheDocument();
    expect(screen.getByText('Phỏng vấn')).toBeInTheDocument();
    expect(screen.getByText('Đề nghị (Offer)')).toBeInTheDocument();
    expect(screen.getByText('Nhận việc')).toBeInTheDocument();
  });

  it('renders alert when status is REJECTED', () => {
    render(<ApplicationProgressStepper status="REJECTED" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/Đơn ứng tuyển chưa phù hợp ở giai đoạn này/i),
    ).toBeInTheDocument();
  });

  it('renders notice when status is WITHDRAWN', () => {
    render(<ApplicationProgressStepper status="WITHDRAWN" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByText(/Ứng viên đã chủ động rút hồ sơ ứng tuyển này/i),
    ).toBeInTheDocument();
  });
});
