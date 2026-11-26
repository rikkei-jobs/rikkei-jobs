// Deterministic binary, multipart, unique-ID, and Mailpit fixtures for DN-01 E2E tests
// Zero third-party dependencies

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { CLOUDINARY_PUBLIC_URL } from '../config.mjs';
import { http, fetchMailpitMessagesWithRetry } from './http-client.mjs';

export const DEV_SEED_PASSWORD = ['Test', '@', '123'].join('');
export const HR_NEW_PASSWORD = ['HrPass', '@', '2026', '!'].join('');
export const HR_ALT_PASSWORD = ['HrAlt', '@', '2026', '!'].join('');

export const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const JPEG_MAGIC_PREFIX = Buffer.from([0xff, 0xd8, 0xff]);
export const TWO_MB_BYTES = 2 * 1024 * 1024; // 2,097,152 bytes

export const EXPECTED_X_CONTENT_TYPE_OPTIONS = 'nosniff';
export const VIETNAMESE_DIACRITIC_REGEX = /[\u00c0-\u00ff\u0102-\u01b0\u1ea0-\u1ef9]/;
export const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{261A}-\u{261F}]/u;

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,128}$/;
const EMAIL_LIKE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

let sequenceCounter = 0;

// Precompute IEEE 802.3 CRC32 lookup table for PNG chunk checksums
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(typeBytes, dataBuf) {
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(dataBuf.length, 0);
  const typeAndData = Buffer.concat([typeBytes, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([lengthBuf, typeAndData, crcBuf]);
}

/**
 * Generates a valid 1x1 RGB PNG buffer of exact byte length `targetBytes`.
 * Uses PNG signature + header + zlib image data + text padding chunk + end chunk.
 * @param {number} targetBytes
 * @returns {Buffer}
 */
export function buildExactPngBuffer(targetBytes) {
  // Image header: 1x1, 8-bit, RGB (color type 2)
  const headerData = Buffer.from([
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00
  ]);
  const headerChunk = makePngChunk(Buffer.from([0x49, 0x48, 0x44, 0x52]), headerData);

  // Compressed 1x1 RGB pixel row (filter byte 0 + R, G, B)
  const compressedPixel = zlib.deflateSync(Buffer.from([0x00, 0x22, 0x66, 0xaa]));
  const dataChunk = makePngChunk(Buffer.from([0x49, 0x44, 0x41, 0x54]), compressedPixel);

  const endChunk = makePngChunk(Buffer.from([0x49, 0x45, 0x4e, 0x44]), Buffer.alloc(0));

  const baseSize = PNG_MAGIC.length + headerChunk.length + dataChunk.length + endChunk.length;
  if (targetBytes === baseSize) {
    return Buffer.concat([PNG_MAGIC, headerChunk, dataChunk, endChunk]);
  }

  // Text chunk overhead: 12-byte chunk framing + 4-byte keyword "pad\0"
  const textChunkOverhead = 16;
  const padLen = targetBytes - (baseSize + textChunkOverhead);
  if (padLen < 0) {
    throw new Error(`targetBytes (${targetBytes}) is too small for valid padded PNG (minimum ${baseSize + textChunkOverhead})`);
  }

  const textPayload = Buffer.concat([Buffer.from('pad\0', 'ascii'), Buffer.alloc(padLen, 0x61)]);
  const textChunk = makePngChunk(Buffer.from([0x74, 0x45, 0x58, 0x74]), textPayload);

  const out = Buffer.concat([PNG_MAGIC, headerChunk, dataChunk, textChunk, endChunk]);
  assert.strictEqual(out.byteLength, targetBytes);
  return out;
}

/**
 * Generates a compact PNG (~69 bytes) whose IHDR declares arbitrary width and height
 * while carrying only a 1x1 IDAT payload (used to test header-first anti-OOM validation).
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function buildPngWithDimensions(width, height) {
  const headerData = Buffer.alloc(13);
  headerData.writeUInt32BE(width, 0);
  headerData.writeUInt32BE(height, 4);
  headerData[8] = 8; // bit depth
  headerData[9] = 2; // RGB
  const headerChunk = makePngChunk(Buffer.from('IHDR', 'ascii'), headerData);
  const dataChunk = makePngChunk(
    Buffer.from('IDAT', 'ascii'),
    zlib.deflateSync(Buffer.from([0x00, 0x22, 0x66, 0xaa]))
  );
  const endChunk = makePngChunk(Buffer.from('IEND', 'ascii'), Buffer.alloc(0));
  return Buffer.concat([PNG_MAGIC, headerChunk, dataChunk, endChunk]);
}

/**
 * Generates a genuinely ImageIO-decodable 8-bit grayscale PNG of width x height.
 * High zlib compression keeps 4,096 x 4,096 around 16 KB (< 2 MB).
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function buildCompressedGrayscalePng(width, height) {
  const headerData = Buffer.alloc(13);
  headerData.writeUInt32BE(width, 0);
  headerData.writeUInt32BE(height, 4);
  headerData[8] = 8; // bit depth
  headerData[9] = 0; // grayscale
  const headerChunk = makePngChunk(Buffer.from('IHDR', 'ascii'), headerData);
  const row = Buffer.alloc(1 + width, 0);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const dataChunk = makePngChunk(Buffer.from('IDAT', 'ascii'), compressed);
  const endChunk = makePngChunk(Buffer.from('IEND', 'ascii'), Buffer.alloc(0));
  return Buffer.concat([PNG_MAGIC, headerChunk, dataChunk, endChunk]);
}

// Minimal valid 1x1 baseline grayscale JPEG (159 bytes total)
const BASE_JPEG_BEFORE_COMMENT = Buffer.from([
  0xff, 0xd8, // Start of image
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00 // Header segment
]);

const BASE_JPEG_AFTER_COMMENT = Buffer.from([
  // Quantization table (64 entries = 1)
  0xff, 0xdb, 0x00, 0x43, 0x00,
  ...new Array(64).fill(0x01),
  // Start of frame (8-bit, 1x1, 1 component)
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
  // Huffman DC table
  0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // Huffman AC table
  0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // Start of scan + 1x1 encoded block + end of image
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  0x3f,
  0xff, 0xd9
]);

/**
 * Generates a valid 1x1 baseline JPEG buffer of exact byte length `targetBytes`.
 * Inserts one or more JPEG comment segments right after the header segment.
 * @param {number} targetBytes
 * @returns {Buffer}
 */
export function buildExactJpegBuffer(targetBytes) {
  const baseSize = BASE_JPEG_BEFORE_COMMENT.length + BASE_JPEG_AFTER_COMMENT.length;
  let remaining = targetBytes - baseSize;

  if (remaining === 0) {
    return Buffer.concat([BASE_JPEG_BEFORE_COMMENT, BASE_JPEG_AFTER_COMMENT]);
  }
  if (remaining < 4) {
    throw new Error(`targetBytes (${targetBytes}) is too small for valid padded JPEG (minimum ${baseSize + 4})`);
  }

  const commentSegments = [];
  const maxSegmentTotal = 65537; // 2-byte marker + 2-byte length (65535) + 65533 payload bytes
  while (remaining > 0) {
    let segmentTotal;
    if (remaining <= maxSegmentTotal) {
      segmentTotal = remaining;
    } else if (remaining - maxSegmentTotal < 4) {
      segmentTotal = maxSegmentTotal - 4;
    } else {
      segmentTotal = maxSegmentTotal;
    }

    const lengthField = segmentTotal - 2;
    const header = Buffer.from([0xff, 0xfe, (lengthField >> 8) & 0xff, lengthField & 0xff]);
    const payload = Buffer.alloc(segmentTotal - 4, 0x41);
    commentSegments.push(header, payload);
    remaining -= segmentTotal;
  }

  const out = Buffer.concat([BASE_JPEG_BEFORE_COMMENT, ...commentSegments, BASE_JPEG_AFTER_COMMENT]);
  assert.strictEqual(out.byteLength, targetBytes);
  return out;
}

/**
 * Builds a raw multipart/form-data Buffer preserving exact filename bytes
 * (useful for testing path traversal or double extensions without client sanitization).
 * @param {string} fieldName
 * @param {string} filename
 * @param {string} mimeType
 * @param {Buffer} fileBuffer
 * @returns {{ body: Buffer, contentType: string }}
 */
export function buildMultipartBody(fieldName, filename, mimeType, fileBuffer) {
  const boundary = `----RikkeiBoundary${crypto.randomBytes(8).toString('hex')}`;
  const headerPart = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`,
    'utf8'
  );
  const footerPart = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return {
    body: Buffer.concat([headerPart, fileBuffer, footerPart]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

/**
 * Builds standard FormData with a Blob file entry.
 * @param {Buffer} fileBuffer
 * @param {string} filename
 * @param {string} mimeType
 * @param {string} [fieldName='file']
 * @returns {FormData}
 */
export function buildLogoFormData(fileBuffer, filename, mimeType, fieldName = 'file') {
  const form = new FormData();
  form.append(fieldName, new Blob([fileBuffer], { type: mimeType }), filename);
  return form;
}

/**
 * Invalid payload builders for logo upload negative boundary tests.
 */
export function buildInvalidLogoPayloads() {
  return {
    empty: {
      buffer: Buffer.alloc(0),
      filename: 'empty.png',
      mimeType: 'image/png'
    },
    svg: {
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16"/></svg>', 'utf8'),
      filename: 'vector.svg',
      mimeType: 'image/svg+xml'
    },
    svgAsPng: {
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16"/></svg>', 'utf8'),
      filename: 'vector.png',
      mimeType: 'image/png'
    },
    gif: {
      buffer: Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
        0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
        0x44, 0x01, 0x00, 0x3b
      ]),
      filename: 'anim.gif',
      mimeType: 'image/gif'
    },
    gifAsPng: {
      buffer: Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
        0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
        0x44, 0x01, 0x00, 0x3b
      ]),
      filename: 'fake-gif.png',
      mimeType: 'image/png'
    },
    webp: {
      buffer: Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
        0x0e, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d,
        0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
        0x34, 0x25, 0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe,
        0xfb, 0xfd, 0x50, 0x00
      ]),
      filename: 'image.webp',
      mimeType: 'image/webp'
    },
    pdf: {
      buffer: Buffer.from(['%PDF-1.4', '1 0 obj', '<<>>', 'endobj', 'trailer', '<<>>', '%%EOF', ''].join('\n'), 'utf8'),
      filename: 'doc.pdf',
      mimeType: 'application/pdf'
    },
    renamedText: {
      buffer: Buffer.from('This is plain text pretending to be a PNG image.\n', 'utf8'),
      filename: 'fake.png',
      mimeType: 'image/png'
    }
  };
}

/**
 * Generates a unique 10-digit or 13-digit numeric tax code per call without sleep.
 * @param {number} [length=10]
 * @returns {string}
 */
export function nextTaxCode(length = 10) {
  if (length !== 10 && length !== 13) {
    throw new Error(`Invalid taxCode length ${length}; expected 10 or 13`);
  }
  sequenceCounter = (sequenceCounter + 1) % 1000;
  const timePart = String(Date.now()).slice(-5);
  const seqPart = String(sequenceCounter).padStart(3, '0');
  const randomDigitsCount = length - 8;
  const maxRand = 10 ** randomDigitsCount;
  const randPart = String(crypto.randomInt(0, maxRand)).padStart(randomDigitsCount, '0');
  return `${timePart}${seqPart}${randPart}`;
}

/**
 * Generates a unique lowercase email address per call without sleep.
 * @param {string} [prefix='hr-dn01']
 * @returns {string}
 */
export function nextEmail(prefix = 'hr-dn01') {
  sequenceCounter = (sequenceCounter + 1) % 10000;
  const randHex = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${prefix.toLowerCase()}-${Date.now()}-${sequenceCounter}-${randHex}@rikkeijobs.test`;
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function loginUser(baseUrl, email, password = DEV_SEED_PASSWORD) {
  const res = await http.post(`${baseUrl}/api/v1/auth/login`, { email, password });
  assert.strictEqual(res.status, 200, `Login failed for ${email}: status ${res.status}`);
  assert.ok(res.body && res.body.accessToken, `Missing accessToken for ${email}`);
  return {
    token: res.body.accessToken,
    mustChangePassword: Boolean(res.body.mustChangePassword),
    user: res.body.user
  };
}

export function decodeHtmlEntities(text) {
  if (!text) return '';
  return text.replace(/&(nbsp|amp|lt|gt|quot|#39|#x27);/gi, (match, entity) => {
    switch (entity.toLowerCase()) {
      case 'nbsp': return ' ';
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case '#39':
      case '#x27': return "'";
      default: return match;
    }
  });
}

export function stripHtml(html) {
  if (!html) return '';
  const withoutTags = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h[1-6]|br)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutTags)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function collectRecipientEmails(detailBody) {
  const recipients = new Set();
  const toField = detailBody?.To;
  if (Array.isArray(toField)) {
    for (const item of toField) {
      if (typeof item === 'string') {
        const cleaned = item.replace(/^.*<([^>]+)>.*$/, '$1').trim().toLowerCase();
        if (cleaned) recipients.add(cleaned);
      } else if (item && typeof item.Address === 'string') {
        const cleaned = item.Address.trim().toLowerCase();
        if (cleaned) recipients.add(cleaned);
      }
    }
  } else if (typeof toField === 'string') {
    for (const part of toField.split(/[,;]/)) {
      const cleaned = part.replace(/^.*<([^>]+)>.*$/, '$1').trim().toLowerCase();
      if (cleaned) recipients.add(cleaned);
    }
  }
  return recipients;
}

function isValidTempPasswordCandidate(candidate, recipientEmails) {
  if (!candidate) return false;
  if (!PASSWORD_POLICY_REGEX.test(candidate)) return false;
  if (EMAIL_LIKE_REGEX.test(candidate)) return false;
  if (/^https?:/i.test(candidate)) return false;
  if (recipientEmails && recipientEmails.has(candidate.toLowerCase())) return false;
  return true;
}

/**
 * Extracts the temporary password from a Mailpit HR onboarding message
 * without ever logging or embedding the secret in thrown error messages.
 * @param {Object} detailBody
 * @returns {string}
 */
export function extractTempPasswordFromEmail(detailBody) {
  const recipientEmails = collectRecipientEmails(detailBody);
  const htmlRaw = typeof detailBody?.HTML === 'string' ? detailBody.HTML : '';
  const tagRegex = /<(code|strong|b)\b[^>]*>([^<]+)<\/\1>/gi;
  const tagMatches = [...htmlRaw.matchAll(tagRegex)].map((m) => ({
    tagName: m[1].toLowerCase(),
    index: m.index ?? 0,
    candidate: decodeHtmlEntities(m[2]).trim()
  }));

  // 1. Prioritize inline tags placed right after a password label so unrelated brand <strong> tags are skipped
  for (const item of tagMatches) {
    if (!isValidTempPasswordCandidate(item.candidate, recipientEmails)) continue;
    const rawPrefix = htmlRaw.slice(Math.max(0, item.index - 250), item.index);
    const cleanedPrefix = decodeHtmlEntities(
      rawPrefix
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (/(?:mật khẩu|password)[^.!?]{0,80}$/i.test(cleanedPrefix)) {
      return item.candidate;
    }
  }

  // 2. Label-paired extraction across plain text and stripped HTML
  const textPart = typeof detailBody?.Text === 'string' ? detailBody.Text : '';
  const htmlTextPart = stripHtml(htmlRaw);
  const combined = [textPart, htmlTextPart].filter(Boolean).join('\n');

  const lines = combined.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labelPatterns = [
    /mật khẩu tạm(?:\s+thời)?\s*[:：]\s*(\S+)/i,
    /mật khẩu\s*[:：]\s*(\S+)/i,
    /temporary password\s*[:：]\s*(\S+)/i,
    /password\s*[:：]\s*(\S+)/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of labelPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].replace(/[.,;]+$/, '');
        if (isValidTempPasswordCandidate(candidate, recipientEmails)) {
          return candidate;
        }
      }
    }
    if (/(?:mật khẩu|password)/i.test(line) && i + 1 < lines.length) {
      const nextToken = (lines[i + 1].split(/\s+/)[0] || '').replace(/[.,;]+$/, '');
      if (isValidTempPasswordCandidate(nextToken, recipientEmails)) {
        return nextToken;
      }
    }
  }

  // 3. Fallback: scan remaining inline tags (<code> before <strong>/<b>) when no label matched
  const sortedFallbackTags = [
    ...tagMatches.filter((t) => t.tagName === 'code'),
    ...tagMatches.filter((t) => t.tagName !== 'code')
  ];
  for (const item of sortedFallbackTags) {
    if (isValidTempPasswordCandidate(item.candidate, recipientEmails)) {
      return item.candidate;
    }
  }

  throw new Error('Could not extract temporary password matching NT-01 policy from Mailpit message');
}

/**
 * Asserts that X-Content-Type-Options header is present and every comma-separated
 * token equals EXPECTED_X_CONTENT_TYPE_OPTIONS (handles Nginx + Spring Security header concatenation).
 * @param {Headers} headers
 */
export function assertNoSniffHeader(headers) {
  const rawValue = headers?.get('x-content-type-options') || '';
  const tokens = rawValue
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  assert.ok(tokens.length >= 1, `Expected X-Content-Type-Options header, got "${rawValue}"`);
  assert.ok(
    tokens.every((token) => token === EXPECTED_X_CONTENT_TYPE_OPTIONS),
    `Expected all X-Content-Type-Options tokens to be "${EXPECTED_X_CONTENT_TYPE_OPTIONS}", got "${rawValue}"`
  );
}

/**
 * Asserts that an HTTP error response matches unified ErrorResponse { code, message }
 * and does not leak internal Java class names, stack traces, or a forbidden secret.
 * @param {import('./http-client.mjs').HttpResponse} res
 * @param {string} [forbiddenSecret]
 */
export function assertUnifiedErrorResponse(res, forbiddenSecret) {
  assert.ok(res.body && typeof res.body === 'object' && !Array.isArray(res.body), `Expected JSON ErrorResponse, got status ${res.status}`);
  assert.strictEqual(typeof res.body.code, 'string', 'ErrorResponse.code must be a string');
  assert.ok(res.body.code.trim().length > 0, 'ErrorResponse.code must be non-empty');
  assert.strictEqual(typeof res.body.message, 'string', 'ErrorResponse.message must be a string');
  assert.ok(res.body.message.trim().length > 0, 'ErrorResponse.message must be non-empty');
  assert.ok(!/org\.springframework|java\.lang|Exception\b|at com\.rikkei/i.test(res.rawText), 'ErrorResponse must not expose stack traces or internal class names');
  if (forbiddenSecret) {
    assert.ok(!res.rawText.includes(forbiddenSecret), 'ErrorResponse must never leak temporary password');
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Asserts that logoUrl points to the configured Cloudinary delivery base URL
 * with the server-generated public_id path and no client filename or path traversal.
 * Does not hardcode cloud_name because .env may override CLOUDINARY_CLOUD_NAME.
 * @param {string} logoUrl
 * @param {number|string} companyId
 * @param {'png'|'jpg'} expectedExt
 */
export function assertCloudinaryLogoUrl(logoUrl, companyId, expectedExt) {
  assert.strictEqual(typeof logoUrl, 'string', 'logoUrl must be a string');
  assert.ok(
    logoUrl.startsWith(`${CLOUDINARY_PUBLIC_URL}/`),
    `Expected logoUrl to start with "${CLOUDINARY_PUBLIC_URL}/", got "${logoUrl}"`
  );
  assert.ok(!logoUrl.includes('..'), `logoUrl must never contain path traversal: "${logoUrl}"`);
  const pattern = new RegExp(
    `^${escapeRegExp(CLOUDINARY_PUBLIC_URL)}/[A-Za-z0-9_-]+/image/upload/v\\d+/rikkei-jobs/company-logos/company-${escapeRegExp(companyId)}\\.${escapeRegExp(expectedExt)}$`
  );
  assert.match(logoUrl, pattern, `Unexpected Cloudinary logoUrl format: "${logoUrl}"`);
}

/**
 * Fetches a logo directly from the Cloudinary/mock delivery URL without Authorization
 * or X-Service-Key headers and verifies lossless bytes, Content-Type, magic bytes, and no-store.
 * @param {string} logoUrl
 * @param {Buffer} expectedBuffer
 * @param {'image/png'|'image/jpeg'} expectedContentType
 * @param {number} [timeoutMs=8000]
 */
export async function fetchAndVerifyMockLogo(logoUrl, expectedBuffer, expectedContentType, timeoutMs = 8000) {
  const res = await http.getBuffer(logoUrl, { timeoutMs });
  assert.strictEqual(res.status, 200, `Expected 200 from direct logo URL "${logoUrl}", got ${res.status}`);
  assert.ok(Buffer.isBuffer(res.rawBuffer), 'Logo delivery response must expose rawBuffer');
  assert.strictEqual(res.headers.get('content-type'), expectedContentType);
  assert.ok(
    (res.headers.get('cache-control') || '').toLowerCase().includes('no-store'),
    `Expected Cache-Control to include no-store, got "${res.headers.get('cache-control') || ''}"`
  );
  if (expectedContentType === 'image/png') {
    assert.ok(res.rawBuffer.subarray(0, 8).equals(PNG_MAGIC), 'Delivered PNG magic bytes must match');
  } else if (expectedContentType === 'image/jpeg') {
    assert.ok(res.rawBuffer.subarray(0, 3).equals(JPEG_MAGIC_PREFIX), 'Delivered JPEG magic bytes must match');
  }
  assert.ok(res.rawBuffer.equals(expectedBuffer), 'Delivered logo bytes must match uploaded buffer losslessly');
  return res;
}

/**
 * Asserts that response text or spec output never leaks Cloudinary credentials or signing fields.
 * @param {string} text
 */
export function assertNoCloudinarySecrets(text) {
  const lower = String(text || '').toLowerCase();
  for (const token of ['dev-secret', 'dev-key', 'api_secret', 'api_key=', 'signature=', 'cloudinary://']) {
    assert.ok(!lower.includes(token), `Output must never expose secret/signing marker "${token}"`);
  }
}

/**
 * Asserts that a 502 LOGO_STORAGE_UNAVAILABLE response has a clean Vietnamese message
 * without emoji, credentials, internal URLs, or upstream provider details.
 * @param {import('./http-client.mjs').HttpResponse} res
 */
export function assertCleanStorageUnavailableError(res) {
  assert.strictEqual(res.status, 502, `Expected 502 Bad Gateway, got ${res.status}: ${res.rawText}`);
  assertUnifiedErrorResponse(res);
  assert.strictEqual(res.body.code, 'LOGO_STORAGE_UNAVAILABLE');
  assert.ok(
    VIETNAMESE_DIACRITIC_REGEX.test(res.body.message),
    `Expected Vietnamese diacritics in 502 message, got "${res.body.message}"`
  );
  assert.strictEqual(EMOJI_REGEX.test(res.body.message), false, '502 error message must contain zero emoji');
  const lower = String(res.rawText || '').toLowerCase();
  for (const forbidden of [
    'dev-secret',
    'dev-key',
    'cloudinary',
    'http://',
    'https://',
    ':9000',
    'simulated cloudinary outage',
    'api_key',
    'api_secret',
    'signature'
  ]) {
    assert.ok(!lower.includes(forbidden), `502 ErrorResponse must not leak "${forbidden}"`);
  }
}

/**
 * Provisions a fresh company + HR account via STAFF API, extracts the temporary password
 * from Mailpit, and optionally completes first-login forced password change.
 * @param {string} backendBaseUrl
 * @param {string} mailpitBaseUrl
 * @param {string} staffToken
 * @param {Object} [options]
 * @param {number} [options.taxCodeLength=10]
 * @param {string} [options.companyName]
 * @param {string} [options.hrEmail]
 * @param {string} [options.hrFullName]
 * @param {boolean} [options.activateHr=true]
 * @param {string} [options.newPassword=HR_NEW_PASSWORD]
 */
export async function provisionCompanyAndHr(backendBaseUrl, mailpitBaseUrl, staffToken, options = {}) {
  const taxCode = options.taxCode || nextTaxCode(options.taxCodeLength || 10);
  const companyPayload = {
    name: options.companyName || `Công ty Công nghệ Rikkei ${taxCode}`,
    taxCode,
    industry: options.industry || 'Công nghệ thông tin',
    size: options.size || '51-200',
    address: options.address || 'Tầng 21, Tòa nhà Phạm Hùng',
    city: options.city || 'Hà Nội',
    website: options.website || 'https://rikkei-partner.example.vn',
    description: options.description || 'Doanh nghiệp đối tác đào tạo và tuyển dụng kỹ sư phần mềm.'
  };

  const companyRes = await http.post(`${backendBaseUrl}/api/v1/staff/companies`, companyPayload, {
    headers: authHeaders(staffToken)
  });
  assert.strictEqual(companyRes.status, 201, `Create company failed: ${companyRes.status} ${companyRes.rawText}`);
  const company = companyRes.body;

  const hrEmail = options.hrEmail || nextEmail('hr-dn01');
  const hrFullName = options.hrFullName || 'Nguyễn Thị Minh Thư';
  const hrRes = await http.post(
    `${backendBaseUrl}/api/v1/staff/companies/${company.id}/hr-accounts`,
    { email: hrEmail, fullName: hrFullName },
    { headers: authHeaders(staffToken), timeoutMs: 8000 }
  );
  assert.strictEqual(hrRes.status, 201, `Create HR account failed: ${hrRes.status}`);
  const hrAccount = hrRes.body;

  const listBody = await fetchMailpitMessagesWithRetry(mailpitBaseUrl, hrEmail, {
    maxRetries: 25,
    intervalMs: 150
  });
  assert.ok(listBody && Array.isArray(listBody.messages) && listBody.messages.length >= 1, `Mailpit did not receive onboarding email for ${hrEmail}`);

  const msgId = listBody.messages[0].ID;
  const detailRes = await http.get(`${mailpitBaseUrl}/api/v1/message/${msgId}`);
  assert.strictEqual(detailRes.status, 200, `Mailpit message detail failed for ${msgId}`);

  const emailPlainText = [
    typeof detailRes.body?.Text === 'string' ? detailRes.body.Text : '',
    stripHtml(typeof detailRes.body?.HTML === 'string' ? detailRes.body.HTML : '')
  ].filter(Boolean).join('\n');

  const tempPassword = extractTempPasswordFromEmail(detailRes.body);

  let hrToken = null;
  let hrUser = null;
  const activateHr = options.activateHr !== undefined ? options.activateHr : true;
  const newPassword = options.newPassword || HR_NEW_PASSWORD;

  if (activateHr) {
    const firstLogin = await loginUser(backendBaseUrl, hrEmail, tempPassword);
    assert.strictEqual(firstLogin.mustChangePassword, true, 'New HR must have mustChangePassword=true on first login');

    const changeRes = await http.post(
      `${backendBaseUrl}/api/v1/auth/change-password`,
      { oldPassword: tempPassword, newPassword },
      { headers: authHeaders(firstLogin.token) }
    );
    assert.strictEqual(changeRes.status, 200, `HR change-password failed: ${changeRes.status}`);

    const activeLogin = await loginUser(backendBaseUrl, hrEmail, newPassword);
    assert.strictEqual(activeLogin.mustChangePassword, false, 'HR must have mustChangePassword=false after password change');
    hrToken = activeLogin.token;
    hrUser = activeLogin.user;
  }

  return {
    company,
    hrAccount,
    hrEmail,
    tempPassword,
    emailDetail: detailRes.body,
    emailPlainText,
    hrToken,
    hrUser
  };
}
