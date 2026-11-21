package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.rikkei.jobs.ai.service.PiiMasker;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

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
                "number 1234567890123|number 1234567890123"
            },
            delimiter = '|')
    void masksPersonalDataWithoutCorruptingSkillData(String input, String expected) {
        assertEquals(expected, masker.mask(input));
        assertEquals(expected, masker.mask(masker.mask(input)));
    }

    @Test
    void nullAndEmptyAreSafe() {
        assertEquals("", masker.mask(null));
        assertEquals("", masker.mask(""));
    }
}
