package com.rikkei.jobs;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PasswordHashTest {

    @Test
    void generateAndVerifyHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "Test@123";
        String hash = encoder.encode(rawPassword);
        System.out.println("GENERATED_BCRYPT_HASH=" + hash);
        assertTrue(encoder.matches(rawPassword, hash));
    }
}
