package com.rikkei.jobs.identity;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Mutable Clock implementation for deterministic time testing ("time machine"). Allows test cases
 * to fast-forward time to test TTLs (SSO 60s, lockout 15m, reset token 30m, JWT 8h) with zero
 * Thread.sleep().
 */
public final class MutableClock extends Clock {

    private Instant currentInstant;
    private final ZoneId zone;

    public MutableClock(Instant initial) {
        this(initial, ZoneOffset.UTC);
    }

    public MutableClock(Instant initial, ZoneId zone) {
        this.currentInstant = initial;
        this.zone = zone;
    }

    public synchronized void setInstant(Instant next) {
        this.currentInstant = next;
    }

    public synchronized void fastForward(Duration duration) {
        this.currentInstant = this.currentInstant.plus(duration);
    }

    @Override
    public synchronized Instant instant() {
        return currentInstant;
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId newZone) {
        return new MutableClock(currentInstant, newZone);
    }
}
