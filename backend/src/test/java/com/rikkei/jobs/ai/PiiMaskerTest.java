package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.ai.service.PiiMasker;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

class PiiMaskerTest {
    private final PiiMasker masker = new PiiMasker();

    @ParameterizedTest
    @CsvSource(
            value = {
                "a@b.com, 0912345678|[EMAIL], [PHONE]",
                "Email: first.last+job@example.com.vn|Email: [EMAIL]",
                "<USER@EXAMPLE.COM>|<[EMAIL]>",
                "0912345678|[PHONE]",
                "+84912345678|[PHONE]",
                "0084912345678|[PHONE]",
                "(+84) 912 345 678|[PHONE]",
                "090-123-4567|[PHONE]",
                "03 1234 5678|[PHONE]",
                "(024) 3825 1234|[PHONE]",
                "ID 001203004567|ID [ID]",
                "ID: 123456789012.|ID: [ID].",
                "a@b.com / c@d.vn / 0987654321|[EMAIL] / [EMAIL] / [PHONE]",
                "Java 85/100, Spring 90/100|Java 85/100, Spring 90/100",
                "[EMAIL] [PHONE] [ID]|[EMAIL] [PHONE] [ID]",
                "number 1234567890123|number 1234567890123",
                "079 123 456 789|[ID]",
                "079.123.456.789|[ID]",
                "079-123-456-789|[ID]",
                "0791 2345 6789|[ID]",
                "0791-2345-6789|[ID]",
                "079123 456789|[ID]",
                "0 7 9 1 2 3 4 5 6 7 8 9|[ID]",
                "84912345678|[PHONE]",
                " 84 912345678| [PHONE]",
                "84-912-345-678|[PHONE]",
                "(84) 912 345 678|[PHONE]",
                "84-28-3822-1234|[PHONE]",
                "842838221234|[ID]",
                "0 9 1 2 3 4 5 6 7 8|[PHONE]",
                "+84 9 1 2 3 4 5 6 7 8|[PHONE]",
                "(028) 3822 1234|[PHONE]",
                "0912.345.678|[PHONE]",
                "09 12 34 56 78|[PHONE]",
                "0218 385 1234|[PHONE]",
                "Ứng viên SĐT 0912345678, CCCD 079 123 456 789, email hr@rikkei.vn|Ứng viên SĐT [PHONE], CCCD [ID], email [EMAIL]",
                "2026-11-23|2026-11-23",
                "2026-11-23 09 12 34 56 78|2026-11-23 [PHONE]",
                "Experience 2020-2026|Experience 2020-2026",
                "Salary 15.000.000 VND|Salary 15.000.000 VND",
                "Salary 25,000,000 VND|Salary 25,000,000 VND",
                "Spring Boot 4.1.2 and Java 25.0.5.8|Spring Boot 4.1.2 and Java 25.0.5.8",
                "Order 123456789 and 123 456 789|Order 123456789 and 123 456 789",
                "Code 12345678901|Code 12345678901",
                "Code 079 123 456 7890|Code 079 123 456 7890",
                "079123456789 0912345678|[ID] [PHONE]",
                "0912345678 079123456789|[PHONE] [ID]",
                "2026 079123456789|2026 [ID]",
                "2026-11-23 079 123 456 789|2026-11-23 [ID]",
                "079 123 456 789 2026|[ID] 2026",
                "079-123-456-789 0912345678|[ID] [PHONE]",
                "2026-11-23 079-123-456-789|2026-11-23 [ID]",
                "2026 0 7 9 1 2 3 4 5 6 7 8 9|2026 [ID]",
                "0 7 9 1 2 3 4 5 6 7 8 9 0|0 7 9 1 2 3 4 5 6 7 8 9 0",
                "1234-5678-9012-3456|1234-5678-9012-3456",
                "1.000.000.000|1.000.000.000",
                "+84 (0) 912 345 678|[PHONE]",
                "84 (0) 912-345-678|[PHONE]",
                "bad a@b.c and a@b.123|bad a@b.c and a@b.123",
                "Email: a@b.com.|Email: [EMAIL].",
                "079-123-456-789-0912345678|[ID]-[PHONE]",
                "079.123.456.789.0912345678|[ID].[PHONE]",
                "079-123-456-789.0912345678|[ID].[PHONE]",
                "079-123-456-789-079123456789|[ID]-[ID]",
                "0912345678-079-123-456-789|[PHONE]-[ID]",
                "0 7 9 1 2 3 4 5 6 7 8 9 0 9 1 2 3 4 5 6 7 8|[ID] [PHONE]",
                "0 9 1 2 3 4 5 6 7 8 0 9 1 2 3 4 5 6 7 8|[PHONE] [PHONE]",
                "0 9 1 2 3 4 5 6 7 8 0 7 9 1 2 3 4 5 6 7 8 9|0 9 1 2 3 4 5 6 7 8 0 7 9 1 2 3 4 5 6 7 8 9",
                "2026-11-23-079-123-456-789|2026-11-23-079-123-456-789",
                "1234 5678 9012 3456|1234 5678 9012 3456",
                "2026 0791 2345 6789|2026 0791 2345 6789",
                "123 079 123 456 789|123 079 123 456 789",
                "123456 079123 456789|123456 079123 456789",
                "123 456 789 012 345|123 456 789 012 345",
                "2026 079 123 456 789|2026 [ID]",
                "123 0791 2345 6789|123 [ID]",
                "2026 079123 456789|2026 [ID]",
                "079 123 456 789 0912345678|[ID] [PHONE]",
                "a@b.com0912345678|[EMAIL][PHONE]",
                "a@b.com079123456789|[EMAIL][ID]",
                "a@b.vn079123456789|[EMAIL][ID]",
                "a@b.co0912345678|[EMAIL][PHONE]",
                "a@b.com079-123-456-789|[EMAIL][ID]",
                "a@b.com-079-123-456-789-0912345678|[EMAIL]-[ID]-[PHONE]",
                "a@b.com-0912345678|[EMAIL]-[PHONE]",
                "0912345678-a@b.com-079-123-456-789|[PHONE]-[EMAIL]-[ID]",
                "0912345678@company.com|[EMAIL]",
                "user@sub-1.example.com|[EMAIL]",
                "user@v2.example.io|[EMAIL]",
                "079-123-456-789.a@b.com|[EMAIL]",
                "a@b.com123-079-123-456-789|a@b.com123-079-123-456-789",
                "a@b.com#0912345678|[EMAIL]#[PHONE]",
                "#a@b.com#|#[EMAIL]#",
                "079-123-456-789-123user@example.com0912345678|[EMAIL][PHONE]",
                "079 123 456 789 123a@b.com0912345678|[ID] [EMAIL][PHONE]",
                "a@b.com-(028)38221234|[EMAIL]-[PHONE]",
                "(028)38221234-a@b.com-0912345678|[PHONE]-[EMAIL]-[PHONE]",
                "user@sub-1.example.com-0912345678|[EMAIL]-[PHONE]",
                "user@v2.example.io079123456789|[EMAIL][ID]",
                "a@b.com.vn0912345678|[EMAIL][PHONE]",
                "a@b.com.vn-0912345678|[EMAIL]-[PHONE]",
                "a@b.co.uk079-123-456-789|[EMAIL][ID]",
                "user@sub.example.com-079-123-456-789|[EMAIL]-[ID]",
                "user@sub-1.example.com0912345678|[EMAIL][PHONE]",
                "user@sub.example.com-note|user@sub.example.com-note",
                "user@sub.example.com-2026|user@sub.example.com-2026",
                "a@b.com.2026|[EMAIL].2026",
                "user@sub.example.com.2026|[EMAIL].2026",
                "0912 345 678-a@b.com|[PHONE]-[EMAIL]",
                "079 123 456 789-a@b.com|[ID]-[EMAIL]",
                "+84 912 345 678-a@b.com|[PHONE]-[EMAIL]",
                "0 9 1 2 3 4 5 6 7 8-a@b.com|[PHONE]-[EMAIL]",
                "0 7 9 1 2 3 4 5 6 7 8 9-a@b.com|[ID]-[EMAIL]",
                "0912 345 678.a@b.com|[PHONE].[EMAIL]",
                "079 123 456 789.a@b.com|[ID].[EMAIL]",
                "(028)38221234-a@b.com|[PHONE]-[EMAIL]",
                "2026 123-user@b.com|2026 [EMAIL]",
                "079 123 456 789 123-a@b.com|[ID] [EMAIL]",
                "123a@b.com079 123 456 789 123a@b.com0912345678|[EMAIL][ID] [EMAIL][PHONE]",
                "079 123 456 789 123a@b.com079 123 456 789 123a@b.com0912345678|[ID] [EMAIL][ID] [EMAIL][PHONE]",
                "a@b.com-0912345678-c@d.com|[EMAIL]-[PHONE]-[EMAIL]",
                "user@sub-1.example.com-0912345678-c@d.org|[EMAIL]-[PHONE]-[EMAIL]",
                "user@sub.example.com.a@b.com|[EMAIL].[EMAIL]",
                "a@b.com-0912345678-c@d.com.vn|[EMAIL]-[PHONE]-[EMAIL]",
                "user@sub-1.example.com-079-123-456-789-c@d.com|[EMAIL]-[ID]-[EMAIL]",
                "a@b.com.c@d.com|[EMAIL].[EMAIL]",
                "a@b.com-c@d.com|[EMAIL]-[EMAIL]",
                "a@b.com0912345678-c@d.com|[EMAIL][PHONE]-[EMAIL]",
                "a@b.com.cc@d.com|[EMAIL].[EMAIL]",
                "a@b.com-c@d.com-e@f.com|[EMAIL]-[EMAIL]-[EMAIL]",
                "user@sub-1.example.com-c@d.org|[EMAIL]-[EMAIL]",
                "a@b.com-0912 345 678-c@d.com|[EMAIL]-[PHONE]-[EMAIL]",
                "0912 345 678+a@b.com|[PHONE]+[EMAIL]",
                "0912 345 678_a@b.com|[PHONE]_[EMAIL]",
                "0912 345 678%a@b.com|[PHONE]%[EMAIL]",
                "079 123 456 789+a@b.com|[ID]+[EMAIL]",
                "079 123 456 789_a@b.com|[ID]_[EMAIL]",
                "(028) 3822 1234+a@b.com|[PHONE]+[EMAIL]",
                "0 9 1 2 3 4 5 6 7 8_a@b.com|[PHONE]_[EMAIL]",
                "foo+bar@b.com|[EMAIL]",
                "123_abc@b.com|[EMAIL]",
                "2026 123+user@b.com|2026 [EMAIL]",
                "2026 123_user@b.com|2026 [EMAIL]",
                "(028) 3822-1234-a@b.com|[PHONE]-[EMAIL]",
                "(028) 3822-1234+a@b.com|[PHONE]+[EMAIL]",
                "(028) 3822-1234.a@b.com|[PHONE].[EMAIL]",
                "(028) 3822-1234_a@b.com|[PHONE]_[EMAIL]",
                "2026 123%user@b.com|2026 [EMAIL]",
                "079 123 456 789 123+a@b.com|[ID] [EMAIL]",
                "a@b.com-0912345678-c@d.com-0912345678-e@f.com|[EMAIL]-[PHONE]-[EMAIL]-[PHONE]-[EMAIL]",
                "a@b.com-c@d.com-e@f.com-g@h.com|[EMAIL]-[EMAIL]-[EMAIL]-[EMAIL]",
                "foo (bar) 123-a@b.com|foo (bar) [EMAIL]",
                "0912 345 678+@b.com|[PHONE]+@b.com",
                "0912 345 678-@b.com|[PHONE]-@b.com",
                "0912 345 678.@b.com|[PHONE].@b.com",
                "0912 345 678_@b.com|[PHONE]_@b.com",
                "0912 345 678%@b.com|[PHONE]%@b.com",
                "079 123 456 789+@b.com|[ID]+@b.com",
                "(028) 3822-1234-@b.com|[PHONE]-@b.com",
                "a@b.com-@d.com|[EMAIL]-@d.com",
                "a@b.com+@d.com|[EMAIL]+@d.com",
                "a@b.com.@d.com|[EMAIL].@d.com",
                "+@b.com|+@b.com",
                "-@b.com|-@b.com",
                ".@b.com|.@b.com",
                "_@b.com|_@b.com",
                "%@b.com|%@b.com"
            },
            delimiter = '|',
            ignoreLeadingAndTrailingWhitespace = false)
    void masksPersonalDataWithoutCorruptingSkillData(String input, String expected) {
        assertEquals(expected, masker.mask(input));
        assertEquals(expected, masker.mask(masker.mask(input)));
    }

    @ParameterizedTest
    @MethodSource("unicodeObfuscatedInputs")
    void masksObfuscatedUnicodeAndFullWidthPiiIdempotently(String input, String expected) {
        String once = masker.mask(input);
        assertEquals(expected, once);
        assertEquals(expected, masker.mask(once));
    }

    static Stream<Arguments> unicodeObfuscatedInputs() {
        return Stream.of(
                Arguments.of("091\u200B234\u200D5678", "[PHONE]"),
                Arguments.of("091\u202A234\u202C5678", "[PHONE]"),
                Arguments.of("091\u2066234\u20695678", "[PHONE]"),
                Arguments.of("\uFEFF0912345678", "\uFEFF[PHONE]"),
                Arguments.of("091\u034F234\u061C5678", "[PHONE]"),
                Arguments.of("079\u200B123\u00AD456\u2060789", "[ID]"),
                Arguments.of("a\u200B@\u200Cb.com", "[EMAIL]"),
                Arguments.of(
                        "\uFF10\uFF19\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18", "[PHONE]"),
                Arguments.of("\uFF41\uFF20\uFF42\uFF0E\uFF43\uFF4F\uFF4D", "[EMAIL]"),
                Arguments.of(
                        "\uFF10\uFF17\uFF19\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19",
                        "[ID]"),
                Arguments.of(
                        "\uFF0B\uFF18\uFF14 \uFF19\uFF11\uFF12 \uFF13\uFF14\uFF15 \uFF16\uFF17\uFF18",
                        "[PHONE]"),
                Arguments.of("a@b.com\u200B0912345678", "[EMAIL]\u200B[PHONE]"),
                Arguments.of(
                        "\uFF41\uFF20\uFF42\uFF0E\uFF43\uFF4F\uFF4D\uFF10\uFF19\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18",
                        "[EMAIL][PHONE]"),
                Arguments.of(
                        "user\u200B@sub-1.example.com\u200B0912345678", "[EMAIL]\u200B[PHONE]"),
                Arguments.of("a@b.com\u33A80912345678", "[EMAIL][PHONE]"),
                Arguments.of("a@b.com\u33AF0912345678", "[EMAIL][PHONE]"),
                Arguments.of("a@b.com\u33A8079123456789", "[EMAIL][ID]"),
                Arguments.of("a@b.com\u33A8079-123-456-789", "[EMAIL][ID]"),
                Arguments.of("a@b.com\u33AF079-123-456-789", "[EMAIL][ID]"),
                Arguments.of("a@b.com\u33A8-0912345678", "[EMAIL]-[PHONE]"),
                Arguments.of("a@b.com\u33A10912345678", "[EMAIL]\u33A1[PHONE]"),
                Arguments.of("user@sub.example.com\u33A10912345678", "[EMAIL]\u33A1[PHONE]"),
                Arguments.of("a@b.com\u33A1079123456789", "[EMAIL]\u33A1[ID]"),
                Arguments.of("a@b.com\u33A1079-123-456-789", "[EMAIL]\u33A1[ID]"),
                Arguments.of("\u33A10912345678", "\u33A1[PHONE]"),
                Arguments.of("50\u33A10912345678", "50\u33A1[PHONE]"),
                Arguments.of("50\u33A50912345678", "50\u33A5[PHONE]"),
                Arguments.of("50\u33A1", "50\u33A1"),
                Arguments.of("a@b.com\u24600912345678", "[EMAIL]\u2460[PHONE]"),
                Arguments.of("a@b.com\u2460-c@d.com", "[EMAIL]\u2460-[EMAIL]"),
                Arguments.of("0791234567\u2469", "[ID]"),
                Arguments.of("\u24EA\u246812345678", "[PHONE]"),
                Arguments.of("\u24690912345678", "[ID]"),
                Arguments.of("a@b.com\u2460@d.com", "[EMAIL]\u2460@d.com"),
                Arguments.of("a@b.com\u2460+@d.com", "[EMAIL]\u2460+@d.com"),
                Arguments.of("a@b.com\u2460-@d.com", "[EMAIL]\u2460-@d.com"),
                Arguments.of("a@b.com-\u2460+@d.com", "[EMAIL]-\u2460+@d.com"),
                Arguments.of("079 123 456 789\u2460@d.com", "[ID]\u2460@d.com"),
                Arguments.of("0912 345 678\u2460@d.com", "[PHONE]\u2460@d.com"),
                Arguments.of("079 123 456 789\u2460+@d.com", "[ID]\u2460+@d.com"),
                Arguments.of("0912 345 678\u2460+@d.com", "[PHONE]\u2460+@d.com"),
                Arguments.of("a@b.com\u00B2@d.com", "[EMAIL]\u00B2@d.com"),
                Arguments.of("a@b.com\u00B2+@d.com", "[EMAIL]\u00B2+@d.com"),
                Arguments.of("a@b.com\u00B3@d.com", "[EMAIL]\u00B3@d.com"),
                Arguments.of("a@b.com\u00B9@d.com", "[EMAIL]\u00B9@d.com"),
                Arguments.of("a@b.com\u2070+@d.com", "[EMAIL]\u2070+@d.com"),
                Arguments.of("a@b.com\u2081+@d.com", "[EMAIL]\u2081+@d.com"),
                Arguments.of("a@b.com\u24EA@d.com", "[EMAIL]\u24EA@d.com"),
                Arguments.of("a@b.com\u2469@d.com", "[EMAIL]\u2469@d.com"),
                Arguments.of("079 123 456 789\u00B2+@d.com", "[ID]\u00B2+@d.com"),
                Arguments.of("0912 345 678\u00B2+@d.com", "[PHONE]\u00B2+@d.com"),
                Arguments.of("a@b.com-0912345678\u2460@d.com", "[EMAIL]-[PHONE]\u2460@d.com"),
                Arguments.of("0912 345 678-a@b.com\u2460@d.com", "[PHONE]-[EMAIL]\u2460@d.com"),
                Arguments.of("\u2460@d.com", "\u2460@d.com"),
                Arguments.of("\u00B2+@d.com", "\u00B2+@d.com"),
                Arguments.of("a@b.com\u24600912345678\u2461c@d.com", "[EMAIL][ID][EMAIL]"),
                Arguments.of("a@b.com-\u24600912345678", "[EMAIL]-\u2460[PHONE]"),
                Arguments.of("a@b.com-\u2460vn", "[EMAIL]-\u2460vn"),
                Arguments.of("a@\u2460.com", "a@\u2460.com"));
    }

    @ParameterizedTest
    @MethodSource("hostileOneMbInputs")
    void masksOneMegabyteHostileInputsWithinBoundedTime(String label, String input) {
        long startNs = System.nanoTime();
        String output = masker.mask(input);
        long elapsedMs = (System.nanoTime() - startNs) / 1_000_000L;
        assertTrue(
                elapsedMs < 1000L,
                label + " took " + elapsedMs + " ms (limit 1000 ms), outLen=" + output.length());
        assertEquals(output, masker.mask(output), label + " must be idempotent");
    }

    static Stream<Arguments> hostileOneMbInputs() {
        return Stream.of(
                Arguments.of("1M_zeros", "0".repeat(1_000_000)),
                Arguments.of("1M_a", "a".repeat(1_000_000)),
                Arguments.of("1M_email_dots", "a@" + "b.".repeat(499_999)),
                Arguments.of("1M_spaced_zeros", "0 ".repeat(500_000)),
                Arguments.of("1M_phones", "0912345678 ".repeat(90_909)),
                Arguments.of(
                        "1M_hyphen_id_chain", "079-123-456-789-".repeat(62_500) + "0912345678"),
                Arguments.of(
                        "1M_adjacent_id_pairs", "079-123-456-789-079123456789 ".repeat(34_000)),
                Arguments.of("1M_spaced_single_phones", "0 9 1 2 3 4 5 6 7 8 ".repeat(50_000)),
                Arguments.of("1M_email_phone_pairs", "a@b.com0912345678 ".repeat(55_556)),
                Arguments.of(
                        "1M_domino_email_id",
                        "123a@b.com079 123 456 789 ".repeat(37_037) + "123a@b.com0912345678"),
                Arguments.of(
                        "1M_domino_id_email",
                        "079 123 456 789 123a@b.com".repeat(38_460) + "0912345678"),
                Arguments.of(
                        "1M_email_phone_hyphen_chain",
                        "a@b.com-0912345678-".repeat(52_630) + "c@d.com"),
                Arguments.of("1M_email_dot_chain", "a@b.com.".repeat(125_000) + "c@d.com"),
                Arguments.of("1M_email_hyphen_chain", "a@b.com-".repeat(125_000) + "c@d.com"),
                Arguments.of("1M_other_number_at_chain", "a@b.com\u2460+@d.com-".repeat(66_666)));
    }

    @Test
    void oneMegabyteEmailPhoneHyphenChainProducesExactOutputWithinOneSecond() {
        String input = "a@b.com-0912345678-".repeat(52_630) + "c@d.com";
        String expected = "[EMAIL]-[PHONE]-".repeat(52_630) + "[EMAIL]";
        long startNs = System.nanoTime();
        String actual = masker.mask(input);
        long elapsedMs = (System.nanoTime() - startNs) / 1_000_000L;
        assertTrue(elapsedMs < 1000L, "1M_email_phone_hyphen_chain took " + elapsedMs + " ms");
        assertEquals(expected, actual);
        assertEquals(expected, masker.mask(actual));
    }

    @Test
    void nullAndEmptyAreSafe() {
        assertEquals("", masker.mask(null));
        assertEquals("", masker.mask(""));
    }
}
