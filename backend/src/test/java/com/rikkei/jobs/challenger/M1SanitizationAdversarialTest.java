package com.rikkei.jobs.challenger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.exception.UnmappedRoleException;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.rikkei.jobs.identity.service.AuthService;
import com.rikkei.jobs.identity.service.SsoTicketService;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Empirical Challenger Test Suite for Milestone M1 (Defect C5). Attacks and stress-tests input
 * sanitization in UnmappedRoleException against Log Forging (CWE-117), Unicode Spoofing, Boundary
 * Truncation, DoS/ReDoS, and checks Vietnamese language preservation and SSO Ticket Burn.
 */
class M1SanitizationAdversarialTest {

    @Nested
    @DisplayName("Attack Vector 1: Log Splitting & Log Forging (CWE-117)")
    class LogSplittingAndForgingTests {

        @Test
        @DisplayName("Payload with CRLF in various positions must strip all line breaks")
        void testCrlfLogSplittingAttacks() {
            String[] payloads = {
                "ADMIN\r\n2026-11-12 [INFO] Malicious log line",
                "\r\n\r\nLEADING_CRLF",
                "TRAILING_CRLF\r\n",
                "MULTI\r\nLINE\r\nBREAK\r\nATTACK",
                "MIXED\rCARRIAGE\nLINEFEED\r\nBOTH",
                "TAB\tDELIMITER\tCONFUSION\tATTACK"
            };

            for (String payload : payloads) {
                String sanitized = UnmappedRoleException.sanitizeRole(payload);
                assertFalse(sanitized.contains("\r"), "Must not contain CR in: " + sanitized);
                assertFalse(sanitized.contains("\n"), "Must not contain LF in: " + sanitized);
                assertFalse(sanitized.contains("\t"), "Must not contain Tab in: " + sanitized);

                UnmappedRoleException ex = UnmappedRoleException.forRole(payload);
                assertFalse(
                        ex.getMessage().contains("\r"), "Exception message must not contain CR");
                assertFalse(
                        ex.getMessage().contains("\n"), "Exception message must not contain LF");
                assertFalse(
                        ex.getMessage().contains("\t"), "Exception message must not contain Tab");
            }
        }

        @Test
        @DisplayName(
                "ANSI escape sequences must be disarmed by stripping ESC/CSI control characters")
        void testAnsiEscapeSequencesDisarmed() {
            // ANSI escape sequences start with ESC (\u001B) or 8-bit CSI (\u009B)
            String redColor = "\u001B[31;1mCRITICAL_FAKE_ERROR\u001B[0m";
            String clearScreen = "\u001B[2J\u001B[HFAKE_LOGIN";
            String oscTitle = "\u001B]0;HACKED_WINDOW\u0007ATTACK";
            String csi8bit = "\u009B31mALERT\u009Bm";

            String sanitizedRed = UnmappedRoleException.sanitizeRole(redColor);
            assertFalse(sanitizedRed.contains("\u001B"), "ESC byte must be stripped");
            assertEquals("[31;1mCRITICAL_FAKE_ERROR[0m", sanitizedRed);

            String sanitizedClear = UnmappedRoleException.sanitizeRole(clearScreen);
            assertFalse(sanitizedClear.contains("\u001B"), "ESC byte must be stripped");
            assertEquals("[2J[HFAKE_LOGIN", sanitizedClear);

            String sanitizedOsc = UnmappedRoleException.sanitizeRole(oscTitle);
            assertFalse(sanitizedOsc.contains("\u001B"), "ESC byte must be stripped");
            assertFalse(sanitizedOsc.contains("\u0007"), "BEL byte must be stripped");
            assertEquals("]0;HACKED_WINDOWATTACK", sanitizedOsc);

            String sanitizedCsi8 = UnmappedRoleException.sanitizeRole(csi8bit);
            assertFalse(sanitizedCsi8.contains("\u009B"), "CSI 0x9B byte must be stripped");
            assertEquals("31mALERTm", sanitizedCsi8);
        }

        @Test
        @DisplayName("NULL byte injection (poisoning / truncation attack) must be stripped")
        void testNullBytePoisoningStripped() {
            String embeddedNull = "USER\u0000ROLE_ADMIN";
            String leadingTrailingNull = "\u0000GUEST\u0000";
            String pureNull = "\u0000\u0000\u0000";

            assertEquals("USERROLE_ADMIN", UnmappedRoleException.sanitizeRole(embeddedNull));
            assertEquals("GUEST", UnmappedRoleException.sanitizeRole(leadingTrailingNull));
            assertEquals("", UnmappedRoleException.sanitizeRole(pureNull));

            UnmappedRoleException ex = UnmappedRoleException.forRole(embeddedNull);
            assertFalse(
                    ex.getMessage().contains("\u0000"),
                    "Exception message must not contain NULL byte");
            assertEquals(
                    "Vai trò LMS không được hỗ trợ trong hệ thống: USERROLE_ADMIN",
                    ex.getMessage());
        }

        @Test
        @DisplayName("All ASCII C0 control characters (0x00 to 0x1F and 0x7F) must be stripped")
        void testAllAsciiControlCharactersStripped() {
            StringBuilder sb = new StringBuilder();
            for (char c = 0; c <= 31; c++) {
                sb.append(c);
            }
            sb.append((char) 127); // DEL
            String allC0 = sb.toString();

            // When isolated, all control chars should yield empty string
            assertEquals("", UnmappedRoleException.sanitizeRole(allC0));

            // When interspersed with text
            String interspersed =
                    "R" + (char) 0 + "O" + (char) 7 + "L" + (char) 27 + "E" + (char) 127;
            assertEquals("ROLE", UnmappedRoleException.sanitizeRole(interspersed));
        }

        @Test
        @DisplayName("C1 control characters (0x80 to 0x9F) including NEL (0x85) must be stripped")
        void testC1ControlCharactersStripped() {
            StringBuilder sb = new StringBuilder();
            for (char c = 0x80; c <= 0x9F; c++) {
                sb.append(c);
            }
            String allC1 = sb.toString();

            assertEquals("", UnmappedRoleException.sanitizeRole(allC1));

            // Next Line (NEL - \u0085) is an alternative newline character
            String nelAttack = "ROLE\u0085INJECTED_LOG";
            assertEquals("ROLEINJECTED_LOG", UnmappedRoleException.sanitizeRole(nelAttack));
            assertFalse(UnmappedRoleException.sanitizeRole(nelAttack).contains("\u0085"));
        }
    }

    @Nested
    @DisplayName("Attack Vector 2: Unicode Specials, Bidi Spoofing & Zero-Width Injections")
    class UnicodeSpecialsAndBidiTests {

        @Test
        @DisplayName("Bidi directional overrides (RLO, LRO, RLE, LRE, PDF) must be stripped")
        void testBidiOverridesStripped() {
            // RLO (\u202E) reverses visual display order
            String rloAttack = "\u202ENIMDA_ROLE"; // Visually appears as ELOR_ADMIN
            String sanitized = UnmappedRoleException.sanitizeRole(rloAttack);
            assertFalse(sanitized.contains("\u202E"), "RLO must be stripped");
            assertEquals("NIMDA_ROLE", sanitized);

            // Test all bidi formatting characters (\u202A to \u202E)
            String allBidi = "\u202A\u202B\u202C\u202D\u202ERIBIDI\u202C";
            assertEquals("RIBIDI", UnmappedRoleException.sanitizeRole(allBidi));
        }

        @Test
        @DisplayName("Unicode directional isolates (\u2066 to \u2069) must be stripped")
        void testDirectionalIsolatesStripped() {
            // LRI (\u2066), RLI (\u2067), FSI (\u2068), PDI (\u2069)
            String isolateAttack = "\u2066ISOLATE\u2067_ROLE\u2068\u2069";
            String sanitized = UnmappedRoleException.sanitizeRole(isolateAttack);
            assertFalse(sanitized.contains("\u2066"));
            assertFalse(sanitized.contains("\u2067"));
            assertFalse(sanitized.contains("\u2068"));
            assertFalse(sanitized.contains("\u2069"));
            assertEquals("ISOLATE_ROLE", sanitized);
        }

        @Test
        @DisplayName("Zero-width characters (ZWSP, ZWNJ, ZWJ, LRM, RLM, BOM) must be stripped")
        void testZeroWidthCharactersStripped() {
            // ZWSP (\u200B), ZWNJ (\u200C), ZWJ (\u200D), LRM (\u200E), RLM (\u200F), BOM (\uFEFF)
            String zwspAttack = "CAN\u200BDID\u200CATE\u200D_\u200ERO\u200FLE\uFEFF";
            String sanitized = UnmappedRoleException.sanitizeRole(zwspAttack);
            assertEquals("CANDIDATE_ROLE", sanitized);
            assertFalse(sanitized.contains("\u200B"));
            assertFalse(sanitized.contains("\u200C"));
            assertFalse(sanitized.contains("\u200D"));
            assertFalse(sanitized.contains("\u200E"));
            assertFalse(sanitized.contains("\u200F"));
            assertFalse(sanitized.contains("\uFEFF"));
        }
    }

    @Nested
    @DisplayName("Attack Vector 3: Length Boundaries, ReDoS & Denial of Service Stress")
    class BoundaryAndDosStressTests {

        @Test
        @DisplayName("Strict boundary at 64 characters: 63, 64, 65 chars")
        void testExactBoundaries() {
            String len63 = "A".repeat(63);
            String len64 = "B".repeat(64);
            String len65 = "C".repeat(65);

            assertEquals(63, UnmappedRoleException.sanitizeRole(len63).length());
            assertEquals(len63, UnmappedRoleException.sanitizeRole(len63));

            assertEquals(64, UnmappedRoleException.sanitizeRole(len64).length());
            assertEquals(len64, UnmappedRoleException.sanitizeRole(len64));

            String sanitized65 = UnmappedRoleException.sanitizeRole(len65);
            assertEquals(64, sanitized65.length(), "Length 65 must be truncated to exactly 64");
            assertEquals("C".repeat(64), sanitized65);
        }

        @Test
        @DisplayName(
                "Large payloads (1,000 and 10,000 chars) are truncated safely without memory pressure")
        void testLargePayloadTruncation() {
            String len1k = "X".repeat(1000);
            String len10k = "Y".repeat(10000);

            String s1k = UnmappedRoleException.sanitizeRole(len1k);
            assertEquals(64, s1k.length());
            assertEquals("X".repeat(64), s1k);

            String s10k = UnmappedRoleException.sanitizeRole(len10k);
            assertEquals(64, s10k.length());
            assertEquals("Y".repeat(64), s10k);
        }

        @Test
        @DisplayName(
                "1 MegaByte (1,000,000 chars) payload DoS stress test: linear execution, no ReDoS")
        void testOneMegabytePayloadDosResistance() {
            StringBuilder hugePayload = new StringBuilder(1_000_000);
            // Mix with control characters every 100 characters to stress regex matching
            for (int i = 0; i < 10_000; i++) {
                hugePayload.append("ROLE_SEGMENT_");
                hugePayload.append("\r\n\t\u0000\u202E");
                hugePayload.append("DATA_PORTION_XYZ_");
            }

            long start = System.nanoTime();
            String result = UnmappedRoleException.sanitizeRole(hugePayload.toString());
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;

            assertEquals(64, result.length());
            assertFalse(result.contains("\r"));
            assertFalse(result.contains("\n"));
            assertFalse(result.contains("\t"));
            assertFalse(result.contains("\u0000"));
            assertFalse(result.contains("\u202E"));
            // 1MB processing should complete comfortably in under 500ms on modern JVM
            assertTrue(
                    elapsedMs < 500, "1MB sanitization took " + elapsedMs + "ms, expected < 500ms");
        }

        @Test
        @DisplayName(
                "Multithreaded concurrency stress: 10 threads x 1,000 invocations with varying attack payloads")
        void testMultithreadedConcurrencyStress() throws Exception {
            int threadCount = 10;
            int iterationsPerThread = 1000;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            List<Callable<Boolean>> tasks = new ArrayList<>();

            for (int t = 0; t < threadCount; t++) {
                final int threadId = t;
                tasks.add(
                        () -> {
                            for (int i = 0; i < iterationsPerThread; i++) {
                                String payload =
                                        "ROLE_"
                                                + threadId
                                                + "_"
                                                + i
                                                + "\r\n\u0000\u202E"
                                                + "Z".repeat(100);
                                String sanitized = UnmappedRoleException.sanitizeRole(payload);
                                if (sanitized.length() > 64
                                        || sanitized.contains("\r")
                                        || sanitized.contains("\n")) {
                                    return false;
                                }
                            }
                            return true;
                        });
            }

            List<Future<Boolean>> futures = executor.invokeAll(tasks, 10, TimeUnit.SECONDS);
            executor.shutdown();

            for (Future<Boolean> future : futures) {
                assertTrue(future.get(), "Concurrent sanitization iteration failed assertion");
            }
        }
    }

    @Nested
    @DisplayName("Attack Vector 4: Null, Empty, Blank and Pure-Control Payloads")
    class NullAndBlankPayloadTests {

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\r\n", "\n", "\r", "  \r\n\t  "})
        @DisplayName("Null, empty and blank inputs yield empty string and fallback message")
        void testNullAndBlankInputs(String input) {
            assertEquals("", UnmappedRoleException.sanitizeRole(input));

            UnmappedRoleException ex = UnmappedRoleException.forRole(input);
            assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống: [trống]", ex.getMessage());
        }

        @Test
        @DisplayName("Pure control characters (all stripped) fall back cleanly to [trống]")
        void testPureControlCharactersFallback() {
            String pureControls =
                    "\r\n\t\u0000\u0007\u001B\u007F\u0080\u0085\u009F\u200B\u202E\uFEFF";
            assertEquals("", UnmappedRoleException.sanitizeRole(pureControls));

            UnmappedRoleException ex = UnmappedRoleException.forRole(pureControls);
            assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống: [trống]", ex.getMessage());
        }

        @Test
        @DisplayName("Direct exception constructor with null or blank message falls back safely")
        void testDirectConstructorNullOrBlank() {
            UnmappedRoleException ex1 = new UnmappedRoleException(null);
            assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống", ex1.getMessage());

            UnmappedRoleException ex2 = new UnmappedRoleException("   \r\n   ");
            assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống", ex2.getMessage());
        }
    }

    @Nested
    @DisplayName("Attack Vector 5: Vietnamese Diacritics Preservation & Integrity")
    class VietnamesePreservationTests {

        @Test
        @DisplayName("Specific LMS Vietnamese roles are preserved 100% without corruption")
        void testSpecificVietnameseRoles() {
            String[] roles = {
                "GIẢNG_VIÊN",
                "HỌC_VIÊN",
                "TRỢ_GIẢNG",
                "QUẢN_LÝ_ĐÀO_TẠO",
                "CHUYÊN_VIÊN_TUYỂN_DỤNG",
                "NGHIÊN_CỨU_SINH_THỰC_TẬP"
            };

            for (String role : roles) {
                assertEquals(role, UnmappedRoleException.sanitizeRole(role));
                UnmappedRoleException ex = UnmappedRoleException.forRole(role);
                assertEquals(
                        "Vai trò LMS không được hỗ trợ trong hệ thống: " + role, ex.getMessage());
            }
        }

        @Test
        @DisplayName(
                "Comprehensive Vietnamese character set (all tone marks and compound vowels) preserved")
        void testAllVietnameseCharactersPreserved() {
            char[] chars = {
                'A', 'À', 'Á', 'Ả', 'Ã', 'Ạ', 'Ă', 'Ằ', 'Ắ', 'Ẳ', 'Ẵ', 'Ặ', 'Â', 'Ầ', 'Ấ', 'Ẩ', 'Ẫ',
                'Ậ', 'E', 'È', 'É', 'Ẻ', 'Ẽ', 'Ẹ', 'Ê', 'Ề', 'Ế', 'Ể', 'Ễ', 'Ệ', 'I', 'Ì', 'Í', 'Ỉ',
                'Ĩ', 'Ị', 'O', 'Ò', 'Ó', 'Ỏ', 'Õ', 'Ọ', 'Ô', 'Ồ', 'Ố', 'Ổ', 'Ỗ', 'Ộ', 'Ơ', 'Ờ', 'Ớ',
                'Ở', 'Ỡ', 'Ợ', 'U', 'Ù', 'Ú', 'Ủ', 'Ũ', 'Ụ', 'Ư', 'Ừ', 'Ứ', 'Ử', 'Ữ', 'Ự', 'Y', 'Ỳ',
                'Ý', 'Ỷ', 'Ỹ', 'Ỵ', 'Đ', 'a', 'à', 'á', 'ả', 'ã', 'ạ', 'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ',
                'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ', 'e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ề', 'ế', 'ể', 'ễ',
                'ệ', 'i', 'ì', 'í', 'ỉ', 'ĩ', 'ị', 'o', 'ò', 'ó', 'ỏ', 'õ', 'ọ', 'ô', 'ồ', 'ố', 'ổ',
                'ỗ', 'ộ', 'ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ', 'u', 'ù', 'ú', 'ủ', 'ũ', 'ụ', 'ư', 'ừ', 'ứ',
                'ử', 'ữ', 'ự', 'y', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ', 'đ'
            };
            String allVietnamese = new String(chars);

            // Sanitize 64 chars at a time
            String chunk1 = allVietnamese.substring(0, 64);
            assertEquals(chunk1, UnmappedRoleException.sanitizeRole(chunk1));
        }

        @Test
        @DisplayName(
                "Vietnamese combined with CRLF attack strips CRLF while preserving all accents")
        void testVietnameseWithCrlfAttack() {
            String input = "GIẢNG_VIÊN_\r\nCHUYÊN_TRÁCH_\tBẬC_CAO";
            String expected = "GIẢNG_VIÊN_CHUYÊN_TRÁCH_BẬC_CAO";

            String result = UnmappedRoleException.sanitizeRole(input);
            assertEquals(expected, result);
            assertFalse(result.contains("\r"));
            assertFalse(result.contains("\n"));
            assertFalse(result.contains("\t"));
        }
    }

    @Nested
    @DisplayName("Attack Vector 6: AuthService Integration & SSO Ticket Burn on Unmapped Role")
    class AuthServiceSsoIntegrationTests {

        @Test
        @DisplayName("AuthService.ssoLogin throws sanitized UnmappedRoleException and burns ticket")
        void testSsoLoginBurnsTicketAndSanitizesRoleException() {
            UserRepository userRepository = mock(UserRepository.class);
            RoleRepository roleRepository = mock(RoleRepository.class);
            SsoTicketService ssoTicketService = mock(SsoTicketService.class);
            com.rikkei.jobs.identity.repository.PasswordResetTokenRepository
                    passwordResetTokenRepository =
                            mock(
                                    com.rikkei.jobs.identity.repository.PasswordResetTokenRepository
                                            .class);
            ExternalApiClient externalApiClient = mock(ExternalApiClient.class);
            JwtService jwtService = mock(JwtService.class);
            ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
            PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
            Clock clock = Clock.fixed(Instant.parse("2026-11-12T12:00:00Z"), ZoneOffset.UTC);
            ObjectMapper objectMapper = new ObjectMapper();

            AuthService authService =
                    new AuthService(
                            userRepository,
                            roleRepository,
                            ssoTicketService,
                            passwordResetTokenRepository,
                            externalApiClient,
                            jwtService,
                            eventPublisher,
                            passwordEncoder,
                            clock,
                            objectMapper);

            String ticket = "sso-ticket-attack-123";
            OffsetDateTime now = OffsetDateTime.now(clock);

            // Mock consumeTicket to succeed (ticket burned)
            when(ssoTicketService.consumeTicket(eq(ticket), any(OffsetDateTime.class)))
                    .thenReturn(true);

            // Malicious role with CRLF log injection attack
            String maliciousLmsJson =
                    """
                {
                    "lmsUserId": "lms-attacker-666",
                    "email": "attacker@rikkei.edu.vn",
                    "fullName": "Malicious Role Attacker",
                    "role": "FAKE_ADMIN\\r\\n2026-11-12 [INFO] Escalated to root",
                    "issuedAt": "2026-11-12T12:00:00Z"
                }
                """;

            when(externalApiClient.verifySsoTicket(ticket)).thenReturn(maliciousLmsJson);

            SsoLoginRequest request = new SsoLoginRequest(ticket);

            UnmappedRoleException ex =
                    assertThrows(UnmappedRoleException.class, () -> authService.ssoLogin(request));

            // Verify ticket was burned prior to exception
            verify(ssoTicketService).consumeTicket(eq(ticket), any(OffsetDateTime.class));

            // Verify exception message is cleanly sanitized
            assertFalse(ex.getMessage().contains("\r"), "Exception message must not contain CR");
            assertFalse(ex.getMessage().contains("\n"), "Exception message must not contain LF");
            assertEquals(
                    "Vai trò LMS không được hỗ trợ trong hệ thống: FAKE_ADMIN2026-11-12 [INFO] Escalated to root",
                    ex.getMessage());
        }
    }
}
