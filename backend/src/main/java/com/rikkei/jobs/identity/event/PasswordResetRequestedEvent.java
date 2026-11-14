package com.rikkei.jobs.identity.event;

/**
 * Domain event dispatched when a valid user requests a password reset link. Consumed strictly
 * AFTER_COMMIT to decouple email delivery from database transaction.
 */
public record PasswordResetRequestedEvent(Long userId, String email, String rawToken) {}
