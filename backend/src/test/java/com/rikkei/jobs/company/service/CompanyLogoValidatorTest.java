package com.rikkei.jobs.company.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.PayloadTooLargeException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.company.CompanyTestImages;
import com.rikkei.jobs.company.service.CompanyLogoValidator.ValidatedLogo;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("CompanyLogoValidator Unit Tests (Magic Bytes, Filename Hygiene & 2 MB Boundary)")
class CompanyLogoValidatorTest {

    private final CompanyLogoValidator validator = new CompanyLogoValidator();

    @Test
    @DisplayName("Should accept valid PNG image with single .png and uppercase .PNG extension")
    void shouldAcceptValidPngLogo() {
        byte[] content = CompanyTestImages.minimalPng();
        for (String name : new String[] {"company-logo.png", "LOGO.PNG"}) {
            MockMultipartFile file = new MockMultipartFile("file", name, "image/png", content);

            ValidatedLogo result = validator.validate(file);

            assertEquals("image/png", result.contentType());
            assertEquals("png", result.extension());
            assertArrayEquals(content, result.data());
        }
    }

    @Test
    @DisplayName("Should accept valid JPEG image with .jpg or .jpeg extension")
    void shouldAcceptValidJpegLogo() {
        byte[] content = CompanyTestImages.minimalJpeg();
        MockMultipartFile file =
                new MockMultipartFile("file", "company-logo.jpeg", "image/jpeg", content);

        ValidatedLogo result = validator.validate(file);

        assertEquals("image/jpeg", result.contentType());
        assertEquals("jpg", result.extension());
        assertArrayEquals(content, result.data());
    }

    @Test
    @DisplayName("Should accept exact 2,097,152-byte PNG and reject 2,097,153-byte PNG with 413")
    void shouldEnforceExactTwoMegabyteBoundary() {
        byte[] exactMax = CompanyTestImages.exactPng(2_097_152);
        MockMultipartFile exactFile =
                new MockMultipartFile("file", "exact-2mb.png", "image/png", exactMax);

        ValidatedLogo validResult = validator.validate(exactFile);
        assertEquals(2_097_152, validResult.data().length);

        byte[] overMax = CompanyTestImages.exactPng(2_097_153);
        MockMultipartFile overFile =
                new MockMultipartFile("file", "over-2mb.png", "image/png", overMax);

        assertThrows(PayloadTooLargeException.class, () -> validator.validate(overFile));
    }

    @Test
    @DisplayName(
            "Should reject null, empty, truncated magic-only bytes, polyglots, and extension mismatches")
    void shouldRejectNullEmptyAndTruncatedFiles() {
        assertThrows(ValidationException.class, () -> validator.validate(null));

        MockMultipartFile emptyFile =
                new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        assertThrows(ValidationException.class, () -> validator.validate(emptyFile));

        MockMultipartFile truncated =
                new MockMultipartFile(
                        "file", "short.png", "image/png", new byte[] {(byte) 0x89, 0x50});
        assertThrows(ValidationException.class, () -> validator.validate(truncated));

        // Bare 8-byte PNG signature without image structure
        MockMultipartFile barePngMagic =
                new MockMultipartFile("file", "bare.png", "image/png", CompanyTestImages.PNG_MAGIC);
        assertThrows(ValidationException.class, () -> validator.validate(barePngMagic));

        // Bare 3-byte JPEG signature without image structure
        MockMultipartFile bareJpegMagic =
                new MockMultipartFile(
                        "file", "bare.jpg", "image/jpeg", CompanyTestImages.JPEG_MAGIC);
        assertThrows(ValidationException.class, () -> validator.validate(bareJpegMagic));

        // Polyglot PNG + trailing <svg>/<script>
        byte[] validPng = CompanyTestImages.minimalPng();
        byte[] markup =
                "<svg onload=alert(1)><script>alert(1)</script></svg>"
                        .getBytes(StandardCharsets.UTF_8);
        byte[] polyglot = new byte[validPng.length + markup.length];
        System.arraycopy(validPng, 0, polyglot, 0, validPng.length);
        System.arraycopy(markup, 0, polyglot, validPng.length, markup.length);
        MockMultipartFile polyglotFile =
                new MockMultipartFile("file", "polyglot.png", "image/png", polyglot);
        assertThrows(ValidationException.class, () -> validator.validate(polyglotFile));

        // Extension mismatch (PNG bytes named .jpg, JPEG bytes named .png)
        MockMultipartFile pngAsJpg =
                new MockMultipartFile("file", "actually-png.jpg", "image/jpeg", validPng);
        assertThrows(ValidationException.class, () -> validator.validate(pngAsJpg));

        MockMultipartFile jpgAsPng =
                new MockMultipartFile(
                        "file", "actually-jpg.png", "image/png", CompanyTestImages.minimalJpeg());
        assertThrows(ValidationException.class, () -> validator.validate(jpgAsPng));
    }

    @Test
    @DisplayName("Should reject SVG, GIF, WebP, PDF, and renamed text masquerading as PNG")
    void shouldRejectDisguisedAndUnsupportedFormats() {
        byte[][] badPayloads = {
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".getBytes(StandardCharsets.UTF_8),
            "GIF89a\u0001\u0000\u0001\u0000".getBytes(StandardCharsets.US_ASCII),
            new byte[] {
                'R', 'I', 'F', 'F', 0x1a, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '
            },
            "%PDF-1.4\n%%EOF".getBytes(StandardCharsets.US_ASCII),
            "Plain text disguised as PNG".getBytes(StandardCharsets.UTF_8)
        };

        for (byte[] payload : badPayloads) {
            MockMultipartFile disguised =
                    new MockMultipartFile("file", "disguised.png", "image/png", payload);
            assertThrows(ValidationException.class, () -> validator.validate(disguised));
        }
    }

    @Test
    @DisplayName(
            "Should accept legitimate multi-dot filenames like my.company.png and rikkei.jobs.v2.jpg")
    void shouldAcceptValidMultiDotFilenames() {
        byte[] pngContent = CompanyTestImages.minimalPng();
        for (String name : new String[] {"my.company.png", "logo.2026.png"}) {
            MockMultipartFile file = new MockMultipartFile("file", name, "image/png", pngContent);
            ValidatedLogo result = validator.validate(file);
            assertEquals("image/png", result.contentType());
            assertEquals("png", result.extension());
        }

        byte[] jpgContent = CompanyTestImages.minimalJpeg();
        MockMultipartFile jpgFile =
                new MockMultipartFile("file", "rikkei.jobs.v2.jpg", "image/jpeg", jpgContent);
        ValidatedLogo jpgResult = validator.validate(jpgFile);
        assertEquals("image/jpeg", jpgResult.contentType());
        assertEquals("jpg", jpgResult.extension());
    }

    @Test
    @DisplayName("Should reject oversized file based on getSize() before reading bytes into memory")
    void shouldRejectOversizedFileBeforeCallingGetBytes() throws IOException {
        MultipartFile oversized = mock(MultipartFile.class);
        when(oversized.isEmpty()).thenReturn(false);
        when(oversized.getOriginalFilename()).thenReturn("oversized.png");
        when(oversized.getSize()).thenReturn(CompanyLogoValidator.MAX_LOGO_BYTES + 1);

        assertThrows(PayloadTooLargeException.class, () -> validator.validate(oversized));
        verify(oversized, never()).getBytes();
    }

    @Test
    @DisplayName(
            "Should reject path traversal, control chars, whitespace/empty dot segments, and dangerous intermediate extensions")
    void shouldRejectUnsafeFilenames() {
        byte[] validPng = CompanyTestImages.minimalPng();
        String[] unsafeNames = {
            "",
            "   ",
            "../../x.png",
            "..\\x.png",
            "dir/logo.png",
            "logo\0.png",
            "logo\n.png",
            "logo\u007F.png",
            "a.php.jpg",
            "a.php .jpg",
            "a. .png",
            "logo.png ",
            "evil.svg.png",
            "logo.html.jpg",
            "shell.exe.png",
            "a..png",
            "logo.png.exe",
            "no-extension",
            ".png",
            "logo."
        };

        for (String name : unsafeNames) {
            MockMultipartFile file = new MockMultipartFile("file", name, "image/png", validPng);
            assertThrows(
                    ValidationException.class,
                    () -> validator.validate(file),
                    "Expected rejection for filename: " + name);
        }
    }

    @Test
    @DisplayName(
            "Should reject tiny-bytes PNG declaring 100,000x100,000 header dimensions before pixel allocation without OOM")
    void shouldRejectDecompressionBombPngWithoutOom() {
        byte[] bombPng = CompanyTestImages.pngWithDeclaredDimensions(100_000, 100_000);
        assertTrue(bombPng.length < 1_024);
        MockMultipartFile file = new MockMultipartFile("file", "bomb.png", "image/png", bombPng);

        ValidationException ex =
                assertThrows(ValidationException.class, () -> validator.validate(file));
        assertFalse(ex.getMessage().isBlank());
    }

    @Test
    @DisplayName("Should accept valid compressed 4,096x4,096 PNG under 2 MB")
    void shouldAcceptValid4096By4096Png() {
        byte[] maxValidPng = CompanyTestImages.compressedGrayscalePng(4_096, 4_096);
        assertTrue(maxValidPng.length < CompanyLogoValidator.MAX_LOGO_BYTES);
        MockMultipartFile file =
                new MockMultipartFile("file", "max-4096.png", "image/png", maxValidPng);

        ValidatedLogo result = validator.validate(file);

        assertEquals("image/png", result.contentType());
        assertEquals("png", result.extension());
        assertArrayEquals(maxValidPng, result.data());
    }

    @Test
    @DisplayName("Should reject boundary dimensions 4,097x1, 1x4,097, and pixel count > 16,777,216")
    void shouldRejectDimensionsAndPixelsAbove4096Boundary() {
        byte[][] overBoundaryImages = {
            CompanyTestImages.compressedGrayscalePng(4_097, 1),
            CompanyTestImages.compressedGrayscalePng(1, 4_097),
            CompanyTestImages.compressedGrayscalePng(4_096, 4_097),
            CompanyTestImages.compressedGrayscalePng(5_000, 4_000)
        };

        for (byte[] payload : overBoundaryImages) {
            MockMultipartFile file =
                    new MockMultipartFile("file", "over-dim.png", "image/png", payload);
            assertThrows(ValidationException.class, () -> validator.validate(file));
        }
    }
}
