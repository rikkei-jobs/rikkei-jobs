package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.identity.dto.AuthSessionResponse;

public interface AuthService {

    AuthSessionResponse authenticateHr(String email, String password);

    AuthSessionResponse authenticateCandidate(String ticket);
}
