import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from './authApi';
import { AuthenticationPanel } from './AuthenticationPanel';
import { getAuthSession } from './session';

describe('AuthenticationPanel', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('authenticates HR, stores the bearer session, and calls the parent callback', async () => {
    const session = {
      accessToken: 'issued-test-token',
      tokenType: 'Bearer',
      expiresAt: '2027-01-01T00:00:00Z',
      userId: 44,
      fullName: 'HR Reviewer',
      role: 'HR' as const,
    };
    const login = vi.spyOn(authApi, 'loginHr').mockResolvedValue(session);
    const onAuthenticated = vi.fn();

    render(<AuthenticationPanel onAuthenticated={onAuthenticated} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nhà tuyển dụng' }));
    fireEvent.change(screen.getByLabelText('Email HR'), {
      target: { value: 'hr@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'test-password' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Đăng nhập nhà tuyển dụng' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('hr@example.test', 'test-password');
      expect(onAuthenticated).toHaveBeenCalledWith(session);
    });
    expect(getAuthSession()).toEqual(session);
  });
});
