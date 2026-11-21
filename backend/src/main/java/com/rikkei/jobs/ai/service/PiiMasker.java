package com.rikkei.jobs.ai.service;

import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Masks direct identifiers before any provider call or persistent audit write. */
@Component
public class PiiMasker {
    private static final Pattern EMAIL =
            Pattern.compile("[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}");
    private static final Pattern ID = Pattern.compile("(?<![0-9])[0-9]{12}(?![0-9])");
    private static final Pattern PHONE =
            Pattern.compile(
                    "(?<![0-9])(?:\\(?(?:\\+84|0084)\\)?[ .-]?|\\(?0)(?:[35789](?:[ .-]?[0-9]){8}|2(?:[ .-]?[0-9]\\)?(?:[ .-]?[0-9]){8}|(?:[ .-]?[0-9]){2}\\)?(?:[ .-]?[0-9]){7}))(?![0-9])");

    public String mask(String text) {
        if (text == null) {
            return "";
        }
        // Mask national IDs first so a 12-digit identifier cannot be partially interpreted as a
        // phone.
        String masked = EMAIL.matcher(text).replaceAll("[EMAIL]");
        masked = ID.matcher(masked).replaceAll("[ID]");
        return PHONE.matcher(masked).replaceAll("[PHONE]");
    }
}
