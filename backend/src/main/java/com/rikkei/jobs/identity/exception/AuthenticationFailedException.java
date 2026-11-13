package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public class AuthenticationFailedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public AuthenticationFailedException() {
        super("UNAUTHORIZED", "Thông tin xác thực không hợp lệ", HttpStatus.UNAUTHORIZED);
    }

    public AuthenticationFailedException(Throwable cause) {
        super("UNAUTHORIZED", "Thông tin xác thực không hợp lệ", HttpStatus.UNAUTHORIZED, cause);
    }
}
