import { request } from '../../../shared/api/httpClient';

export interface MockLmsTicketResponse {
  ticket: string;
  lmsUserId: string;
  expiresInSeconds?: number;
}

export const getMockLmsUrl = (): string => {
  return import.meta.env.VITE_MOCK_LMS_URL || 'http://127.0.0.1:9000';
};

/**
 * Dev-only helper to request a fresh SSO ticket from mock LMS server.
 */
export async function requestDevLmsTicket(lmsUserId: string): Promise<string> {
  const mockUrl = getMockLmsUrl();
  const data = await request<MockLmsTicketResponse>(`${mockUrl}/lms/sso/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': 'dev-key',
    },
    body: JSON.stringify({ lmsUserId }),
    skipAuth: true,
  });

  if (!data.ticket) {
    throw new Error('Phản hồi từ Mock LMS không chứa mã vé (ticket).');
  }

  return data.ticket;
}
