package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.io.Serial;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import org.slf4j.Logger;

/**
 * Classifies sync failures into expected upstream/validation outcomes (WARN without stack trace)
 * vs. unexpected internal/database failures (ERROR once with message-redacted stack trace) (F8).
 */
public final class SyncFailureLogger {

    private SyncFailureLogger() {}

    public static boolean isExpectedSyncFailure(Throwable ex) {
        return ex instanceof InvalidServiceKeyException
                || ex instanceof ExternalResourceNotFoundException
                || ex instanceof ExternalUnavailableException
                || ex instanceof ValidationException
                || ex instanceof ConflictException
                || ex instanceof ResourceNotFoundException;
    }

    public static String rootCauseClassName(Throwable ex) {
        if (ex == null) {
            return "unknown";
        }
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        Throwable current = ex;
        while (current.getCause() != null && visited.add(current)) {
            current = current.getCause();
        }
        return current.getClass().getName();
    }

    /**
     * Builds a parallel Throwable chain preserving original exception class names, causes,
     * suppressed throwables, and stack frames while replacing untrusted exception messages with
     * {@code [redacted]} so DB error details, PII, service keys, payloads, and URL queries cannot
     * leak through logger stack traces.
     */
    public static Throwable sanitizeThrowableForLog(Throwable ex) {
        if (ex == null) {
            return null;
        }
        return sanitizeRecursive(ex, Collections.newSetFromMap(new IdentityHashMap<>()));
    }

    private static Throwable sanitizeRecursive(Throwable source, Set<Throwable> visited) {
        if (source == null || !visited.add(source)) {
            return null;
        }
        Throwable sanitizedCause = sanitizeRecursive(source.getCause(), visited);
        SanitizedLogThrowable copy =
                new SanitizedLogThrowable(
                        source.getClass().getName() + ": [redacted]", sanitizedCause);
        copy.setStackTrace(source.getStackTrace());
        for (Throwable suppressed : source.getSuppressed()) {
            Throwable sanitizedSuppressed = sanitizeRecursive(suppressed, visited);
            if (sanitizedSuppressed != null) {
                copy.addSuppressed(sanitizedSuppressed);
            }
        }
        return copy;
    }

    public static void logTriggerFailure(
            Logger logger, String contextMessage, Long userId, Throwable ex) {
        if (isExpectedSyncFailure(ex)) {
            logger.warn(
                    "{}: userId={}, reason={}",
                    contextMessage,
                    userId,
                    SyncRunPersistenceService.sanitizeError(ex));
        } else {
            logger.error(
                    "{}: userId={}, exceptionType={}, rootCauseType={}",
                    contextMessage,
                    userId,
                    ex.getClass().getName(),
                    rootCauseClassName(ex),
                    sanitizeThrowableForLog(ex));
        }
    }

    private static final class SanitizedLogThrowable extends RuntimeException {

        @Serial private static final long serialVersionUID = 1L;

        private SanitizedLogThrowable(String message, Throwable cause) {
            super(message, cause, true, true);
        }
    }
}
