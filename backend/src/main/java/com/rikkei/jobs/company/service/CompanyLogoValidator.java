package com.rikkei.jobs.company.service;

import com.rikkei.jobs.common.exception.PayloadTooLargeException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Validates uploaded company logo files: safe filename without dangerous intermediate extensions,
 * exact 2 MB boundary checked before reading bytes, real PNG/JPEG magic bytes + decoded ImageIO
 * structure, and anti-polyglot markup checks.
 */
@Component
public class CompanyLogoValidator {

    public static final long MAX_LOGO_BYTES = 2_097_152L;
    public static final int MAX_IMAGE_DIMENSION = 4_096;
    public static final long MAX_IMAGE_PIXELS = (long) MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION;
    private static final String INVALID_IMAGE_FORMAT_MESSAGE =
            "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG hoặc PNG hợp lệ";
    private static final String IMAGE_DIMENSIONS_TOO_LARGE_MESSAGE =
            "Kích thước ảnh vượt quá giới hạn tối đa cho phép";

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png");
    private static final Set<String> DANGEROUS_INTERMEDIATE_EXTENSIONS =
            Set.of(
                    "php",
                    "php3",
                    "php4",
                    "php5",
                    "phtml",
                    "phar",
                    "exe",
                    "dll",
                    "bat",
                    "cmd",
                    "sh",
                    "bash",
                    "ps1",
                    "js",
                    "mjs",
                    "cjs",
                    "jsp",
                    "jspx",
                    "asp",
                    "aspx",
                    "cgi",
                    "pl",
                    "py",
                    "rb",
                    "jar",
                    "war",
                    "svg",
                    "html",
                    "htm",
                    "xml",
                    "pdf",
                    "htaccess");
    private static final byte[] PNG_MAGIC =
            new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[][] FORBIDDEN_MARKUP_MARKERS = {
        "<svg".getBytes(StandardCharsets.US_ASCII),
        "<script".getBytes(StandardCharsets.US_ASCII),
        "<html".getBytes(StandardCharsets.US_ASCII),
        "<!doctype".getBytes(StandardCharsets.US_ASCII)
    };

    public ValidatedLogo validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Tệp logo không được để trống");
        }

        String extension = validateFilename(file.getOriginalFilename());

        // Reject declared oversized uploads before reading the payload into heap memory.
        if (file.getSize() > MAX_LOGO_BYTES) {
            throw new PayloadTooLargeException(
                    "Dung lượng tệp tải lên vượt quá giới hạn tối đa 2 MB");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ValidationException("Không thể đọc dữ liệu tệp logo");
        }

        if (bytes.length == 0) {
            throw new ValidationException("Tệp logo không được để trống");
        }
        if (bytes.length > MAX_LOGO_BYTES) {
            throw new PayloadTooLargeException(
                    "Dung lượng tệp tải lên vượt quá giới hạn tối đa 2 MB");
        }

        if (containsEmbeddedMarkup(bytes)) {
            throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
        }

        boolean isPngExt = "png".equals(extension);
        boolean isJpgExt = "jpg".equals(extension) || "jpeg".equals(extension);

        if (isPng(bytes)) {
            if (!isPngExt) {
                throw new ValidationException(
                        "Phần mở rộng tệp không khớp với định dạng ảnh PNG thực tế");
            }
            validateDecodedImage(bytes, "png");
            return new ValidatedLogo(bytes, "image/png", "png");
        }
        if (isJpeg(bytes)) {
            if (!isJpgExt) {
                throw new ValidationException(
                        "Phần mở rộng tệp không khớp với định dạng ảnh JPG thực tế");
            }
            validateDecodedImage(bytes, "jpeg");
            return new ValidatedLogo(bytes, "image/jpeg", "jpg");
        }

        throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
    }

    private static String validateFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ValidationException("Tên tệp logo không hợp lệ");
        }
        if (originalFilename.contains("..")
                || originalFilename.contains("/")
                || originalFilename.contains("\\")) {
            throw new ValidationException(
                    "Tên tệp logo không được chứa ký tự điều hướng đường dẫn");
        }
        for (int i = 0; i < originalFilename.length(); i++) {
            if (Character.isISOControl(originalFilename.charAt(i))) {
                throw new ValidationException("Tên tệp logo chứa ký tự điều khiển không hợp lệ");
            }
        }

        String[] parts = originalFilename.split("\\.", -1);
        if (parts.length < 2) {
            throw new ValidationException("Phần mở rộng tệp phải là .jpg, .jpeg hoặc .png");
        }
        for (String part : parts) {
            if (part.trim().isEmpty()) {
                throw new ValidationException("Tên tệp logo không hợp lệ");
            }
        }

        for (int i = 1; i < parts.length - 1; i++) {
            String intermediate = parts[i].trim().toLowerCase(Locale.ROOT);
            if (DANGEROUS_INTERMEDIATE_EXTENSIONS.contains(intermediate)) {
                throw new ValidationException(
                        "Tên tệp logo chứa phần mở rộng trung gian không được phép");
            }
        }

        String rawExtension = parts[parts.length - 1];
        if (!rawExtension.equals(rawExtension.trim())) {
            throw new ValidationException("Phần mở rộng tệp phải là .jpg, .jpeg hoặc .png");
        }
        String extension = rawExtension.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ValidationException("Phần mở rộng tệp phải là .jpg, .jpeg hoặc .png");
        }
        return extension;
    }

    private static boolean isPng(byte[] bytes) {
        if (bytes.length < PNG_MAGIC.length) {
            return false;
        }
        for (int i = 0; i < PNG_MAGIC.length; i++) {
            if (bytes[i] != PNG_MAGIC[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean isJpeg(byte[] bytes) {
        return bytes.length >= 3
                && bytes[0] == (byte) 0xFF
                && bytes[1] == (byte) 0xD8
                && bytes[2] == (byte) 0xFF;
    }

    private static void validateDecodedImage(byte[] bytes, String expectedFormat) {
        try (ImageInputStream iis =
                ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (iis == null) {
                throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
            }
            ImageReader reader = readers.next();
            try {
                String formatName = reader.getFormatName();
                if (formatName == null || !expectedFormat.equalsIgnoreCase(formatName.trim())) {
                    throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
                }
                // Check image bounds before pixel allocation to guard against decompression bombs.
                reader.setInput(iis, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                validateDimensions(width, height);
                BufferedImage decoded = reader.read(0);
                if (decoded == null) {
                    throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
                }
                validateDimensions(decoded.getWidth(), decoded.getHeight());
            } finally {
                reader.dispose();
            }
        } catch (ValidationException ex) {
            throw ex;
        } catch (IOException | RuntimeException ex) {
            throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
        }
    }

    private static void validateDimensions(int width, int height) {
        if (width < 1 || height < 1) {
            throw new ValidationException(INVALID_IMAGE_FORMAT_MESSAGE);
        }
        if (width > MAX_IMAGE_DIMENSION
                || height > MAX_IMAGE_DIMENSION
                || (long) width * (long) height > MAX_IMAGE_PIXELS) {
            throw new ValidationException(IMAGE_DIMENSIONS_TOO_LARGE_MESSAGE);
        }
    }

    private static boolean containsEmbeddedMarkup(byte[] bytes) {
        for (byte[] marker : FORBIDDEN_MARKUP_MARKERS) {
            if (indexOfAsciiIgnoreCase(bytes, marker) >= 0) {
                return true;
            }
        }
        return false;
    }

    private static int indexOfAsciiIgnoreCase(byte[] haystack, byte[] lowercaseNeedle) {
        int limit = haystack.length - lowercaseNeedle.length;
        for (int i = 0; i <= limit; i++) {
            boolean matched = true;
            for (int j = 0; j < lowercaseNeedle.length; j++) {
                byte b = haystack[i + j];
                if (b >= 'A' && b <= 'Z') {
                    b = (byte) (b + ('a' - 'A'));
                }
                if (b != lowercaseNeedle[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                return i;
            }
        }
        return -1;
    }

    public record ValidatedLogo(byte[] data, String contentType, String extension) {}
}
