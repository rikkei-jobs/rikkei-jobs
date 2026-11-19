package com.rikkei.jobs.company;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.zip.CRC32;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;

/**
 * Generates minimal, real 1x1 PNG and baseline JPEG images in memory for unit and integration
 * tests, optionally padded to exact byte lengths via standard tEXt / COM segments.
 */
public final class CompanyTestImages {

    public static final byte[] PNG_MAGIC =
            new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    public static final byte[] JPEG_MAGIC = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    private static final byte[] JPEG_BEFORE_COMMENT = {
        (byte) 0xFF,
        (byte) 0xD8,
        (byte) 0xFF,
        (byte) 0xE0,
        0x00,
        0x10,
        0x4A,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        0x01,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x00
    };

    private static final byte[] JPEG_AFTER_COMMENT = buildJpegBodyAfterComment();

    private CompanyTestImages() {}

    public static byte[] minimalPng() {
        return buildPng(0);
    }

    public static byte[] exactPng(int targetBytes) {
        return buildPng(targetBytes);
    }

    public static byte[] minimalJpeg() {
        return buildJpeg(0);
    }

    public static byte[] exactJpeg(int targetBytes) {
        return buildJpeg(targetBytes);
    }

    /**
     * Builds a tiny-bytes PNG whose header declares arbitrary dimensions while keeping a 1x1 pixel
     * payload, so header-dimension checks can be tested without allocating huge pixel buffers.
     */
    public static byte[] pngWithDeclaredDimensions(int width, int height) {
        byte[] headerData = buildPngHeader(width, height, (byte) 2);
        byte[] headerChunk = pngChunk("IHDR", headerData);

        byte[] rawRow = {0x00, 0x22, 0x66, (byte) 0xAA};
        byte[] deflated = deflate(rawRow);
        byte[] dataChunk = pngChunk("IDAT", deflated);
        byte[] endChunk = pngChunk("IEND", new byte[0]);

        ByteArrayOutputStream out =
                new ByteArrayOutputStream(
                        PNG_MAGIC.length + headerChunk.length + dataChunk.length + endChunk.length);
        out.writeBytes(PNG_MAGIC);
        out.writeBytes(headerChunk);
        out.writeBytes(dataChunk);
        out.writeBytes(endChunk);
        return out.toByteArray();
    }

    /**
     * Generates a valid, decodable solid-black 8-bit grayscale PNG of the requested dimensions,
     * compressed into a compact payload well under 2 MB.
     */
    public static byte[] compressedGrayscalePng(int width, int height) {
        byte[] headerData = buildPngHeader(width, height, (byte) 0);
        byte[] headerChunk = pngChunk("IHDR", headerData);

        ByteArrayOutputStream deflatedOut = new ByteArrayOutputStream(32_768);
        Deflater deflater = new Deflater(Deflater.BEST_COMPRESSION);
        try (DeflaterOutputStream dos = new DeflaterOutputStream(deflatedOut, deflater)) {
            byte[] rowBuffer = new byte[1 + width];
            for (int y = 0; y < height; y++) {
                dos.write(rowBuffer);
            }
            dos.finish();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        } finally {
            deflater.end();
        }

        byte[] dataChunk = pngChunk("IDAT", deflatedOut.toByteArray());
        byte[] endChunk = pngChunk("IEND", new byte[0]);

        ByteArrayOutputStream out =
                new ByteArrayOutputStream(
                        PNG_MAGIC.length + headerChunk.length + dataChunk.length + endChunk.length);
        out.writeBytes(PNG_MAGIC);
        out.writeBytes(headerChunk);
        out.writeBytes(dataChunk);
        out.writeBytes(endChunk);
        return out.toByteArray();
    }

    private static byte[] buildPngHeader(int width, int height, byte colorType) {
        return new byte[] {
            (byte) ((width >>> 24) & 0xFF),
            (byte) ((width >>> 16) & 0xFF),
            (byte) ((width >>> 8) & 0xFF),
            (byte) (width & 0xFF),
            (byte) ((height >>> 24) & 0xFF),
            (byte) ((height >>> 16) & 0xFF),
            (byte) ((height >>> 8) & 0xFF),
            (byte) (height & 0xFF),
            8,
            colorType,
            0,
            0,
            0
        };
    }

    private static byte[] buildPng(int targetBytes) {
        byte[] headerData = {0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0};
        byte[] headerChunk = pngChunk("IHDR", headerData);

        byte[] rawRow = {0x00, 0x22, 0x66, (byte) 0xAA};
        byte[] deflated = deflate(rawRow);
        byte[] dataChunk = pngChunk("IDAT", deflated);

        byte[] endChunk = pngChunk("IEND", new byte[0]);
        int baseLength = PNG_MAGIC.length + headerChunk.length + dataChunk.length + endChunk.length;

        ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(baseLength, targetBytes));
        out.writeBytes(PNG_MAGIC);
        out.writeBytes(headerChunk);
        out.writeBytes(dataChunk);

        if (targetBytes > 0 && targetBytes != baseLength) {
            int textOverhead = 16; // 12-byte chunk framing + 4-byte "pad\0"
            int padLen = targetBytes - (baseLength + textOverhead);
            if (padLen < 0) {
                throw new IllegalArgumentException(
                        "targetBytes too small for padded PNG: " + targetBytes);
            }
            byte[] textData = new byte[4 + padLen];
            textData[0] = 'p';
            textData[1] = 'a';
            textData[2] = 'd';
            textData[3] = 0;
            Arrays.fill(textData, 4, textData.length, (byte) 'a');
            out.writeBytes(pngChunk("tEXt", textData));
        }

        out.writeBytes(endChunk);
        return out.toByteArray();
    }

    private static byte[] buildJpeg(int targetBytes) {
        int baseLength = JPEG_BEFORE_COMMENT.length + JPEG_AFTER_COMMENT.length;
        if (targetBytes <= 0 || targetBytes == baseLength) {
            ByteArrayOutputStream out = new ByteArrayOutputStream(baseLength);
            out.writeBytes(JPEG_BEFORE_COMMENT);
            out.writeBytes(JPEG_AFTER_COMMENT);
            return out.toByteArray();
        }

        int remaining = targetBytes - baseLength;
        if (remaining < 4) {
            throw new IllegalArgumentException(
                    "targetBytes too small for padded JPEG: " + targetBytes);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream(targetBytes);
        out.writeBytes(JPEG_BEFORE_COMMENT);

        int maxSegmentTotal = 65_537;
        while (remaining > 0) {
            int segmentTotal;
            if (remaining <= maxSegmentTotal) {
                segmentTotal = remaining;
            } else if (remaining - maxSegmentTotal < 4) {
                segmentTotal = maxSegmentTotal - 4;
            } else {
                segmentTotal = maxSegmentTotal;
            }
            int lengthField = segmentTotal - 2;
            out.write(0xFF);
            out.write(0xFE);
            out.write((lengthField >> 8) & 0xFF);
            out.write(lengthField & 0xFF);
            byte[] payload = new byte[segmentTotal - 4];
            Arrays.fill(payload, (byte) 'A');
            out.writeBytes(payload);
            remaining -= segmentTotal;
        }

        out.writeBytes(JPEG_AFTER_COMMENT);
        return out.toByteArray();
    }

    private static byte[] pngChunk(String type, byte[] data) {
        byte[] typeBytes = type.getBytes(StandardCharsets.US_ASCII);
        CRC32 crc = new CRC32();
        crc.update(typeBytes);
        crc.update(data);
        long crcVal = crc.getValue();

        ByteArrayOutputStream out = new ByteArrayOutputStream(12 + data.length);
        writeIntBe(out, data.length);
        out.writeBytes(typeBytes);
        out.writeBytes(data);
        writeIntBe(out, (int) crcVal);
        return out.toByteArray();
    }

    private static void writeIntBe(ByteArrayOutputStream out, int value) {
        out.write((value >>> 24) & 0xFF);
        out.write((value >>> 16) & 0xFF);
        out.write((value >>> 8) & 0xFF);
        out.write(value & 0xFF);
    }

    private static byte[] deflate(byte[] input) {
        Deflater deflater = new Deflater();
        deflater.setInput(input);
        deflater.finish();
        ByteArrayOutputStream out = new ByteArrayOutputStream(32);
        byte[] buf = new byte[64];
        while (!deflater.finished()) {
            int count = deflater.deflate(buf);
            out.write(buf, 0, count);
        }
        deflater.end();
        return out.toByteArray();
    }

    private static byte[] buildJpegBodyAfterComment() {
        ByteArrayOutputStream out = new ByteArrayOutputStream(160);
        // Quantization table (64 entries = 1)
        out.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xDB, 0x00, 0x43, 0x00});
        byte[] qTable = new byte[64];
        Arrays.fill(qTable, (byte) 0x01);
        out.writeBytes(qTable);
        // Start of frame (8-bit, 1x1, 1 component)
        out.writeBytes(
                new byte[] {
                    (byte) 0xFF,
                    (byte) 0xC0,
                    0x00,
                    0x0B,
                    0x08,
                    0x00,
                    0x01,
                    0x00,
                    0x01,
                    0x01,
                    0x01,
                    0x11,
                    0x00
                });
        // Huffman DC table
        out.writeBytes(
                new byte[] {
                    (byte) 0xFF,
                    (byte) 0xC4,
                    0x00,
                    0x14,
                    0x00,
                    0x01,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00
                });
        // Huffman AC table
        out.writeBytes(
                new byte[] {
                    (byte) 0xFF,
                    (byte) 0xC4,
                    0x00,
                    0x14,
                    0x10,
                    0x01,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00,
                    0x00
                });
        // Start of scan + 1x1 block + EOI
        out.writeBytes(
                new byte[] {
                    (byte) 0xFF,
                    (byte) 0xDA,
                    0x00,
                    0x08,
                    0x01,
                    0x01,
                    0x00,
                    0x00,
                    0x3F,
                    0x00,
                    0x3F,
                    (byte) 0xFF,
                    (byte) 0xD9
                });
        return out.toByteArray();
    }
}
