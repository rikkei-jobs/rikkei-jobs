package com.rikkei.jobs.ai.service;

import java.nio.CharBuffer;
import java.text.Normalizer;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Masks direct personal identifiers ({@code [EMAIL]}, {@code [ID]}, {@code [PHONE]}) before any
 * external AI provider call or persistent audit log write.
 *
 * <h2>Normalization &amp; Idempotency</h2>
 *
 * <p>Detection operates on a normalized view of the input: invisible formatting, zero-width, and
 * bidirectional control characters ({@code U+00AD}, {@code U+034F}, {@code U+061C}, {@code
 * U+200B..U+200F}, {@code U+202A..U+202E}, {@code U+2060}, {@code U+2066..U+2069}, {@code U+FEFF})
 * are stripped and remaining code points are normalized with {@link Normalizer.Form#NFKC}
 * (converting full-width digits, {@code @}, punctuation, and special spaces to ASCII) while
 * tracking exact UTF-16 offsets back into the original string. Matched spans are replaced in the
 * original text so surrounding text and formatting stay readable, and claimed spans are locally
 * converged in bounded windows so adjacent PII (such as {@code 079-123-456-789-0912345678}) is
 * completely masked in a single call and {@link #mask(String)} is strictly idempotent.
 *
 * <h2>False-Positive Policy &amp; Priority</h2>
 *
 * <p>Matches are claimed in non-overlapping priority order: {@code EMAIL} -&gt; {@code ID} -&gt;
 * {@code PHONE}.
 *
 * <ul>
 *   <li><strong>Ordinary non-PII numbers preserved:</strong> 4-digit years ({@code 2026}),
 *       ISO/local dates ({@code 2026-11-23}), salary figures up to 10 digits ({@code 15.000.000},
 *       {@code 1.000.000.000}), version strings ({@code 4.1.2}), 9-digit numbers, 11-digit numbers
 *       without a Vietnamese phone prefix ({@code 02...} or {@code 84[35789]...}), and 13+ digit
 *       numbers without {@code 0084} prefix are NOT masked.
 *   <li><strong>Uniform 12-digit IDs &amp; group-width ambiguity:</strong> Only 12 plain digits,
 *       uniform grouped {@code 3-3-3-3}, {@code 4-4-4}, {@code 6-6} (with consistent space, dot, or
 *       hyphen separators), or {@code 1x12} space-separated digits with numeric boundaries are
 *       masked as {@code [ID]}. Space-grouped sequences of uniform group-width {@code k} ({@code 3
 *       3 3 3}, {@code 4 4 4}, {@code 6 6}) disallow an immediately adjacent space-separated group
 *       of the same width {@code k} so 16-digit payment cards ({@code 1234 5678 9012 3456}) and
 *       longer uniform digit sequences ({@code 2026 0791 2345 6789}, {@code 123 079 123 456 789},
 *       {@code 123456 079123 456789}) are preserved intact rather than partially masked with
 *       trailing digits leaked; mixed-width neighbors such as {@code 079 123 456 789 2026} or
 *       {@code 2026 079 123 456 789} still mask as {@code [ID]}. As a known trade-off, a 12-digit
 *       {@code 3-3-3-3} dotted figure such as {@code 100.000.000.000} or 12 plain digits starting
 *       with {@code 842} matches {@code [ID]} before {@code [PHONE]} because it is syntactically
 *       indistinguishable from a 12-digit national ID without country separators.
 *   <li><strong>Unicode {@code OTHER_NUMBER} circled digits:</strong> Circled digits ({@code
 *       U+2460}..{@code U+2469}, {@code U+24EA}) NFKC-expand to ASCII digits and participate in
 *       Pass 1 {@code ID}/{@code PHONE} matching so obfuscated identifiers such as {@code
 *       0791234567⑩} or {@code ⓪⑨12345678} mask cleanly rather than leaking. Any unclaimed {@code
 *       OTHER_NUMBER} position is neutralized after Pass 1 so standalone markers such as {@code
 *       a@b.com①0912345678} mask to {@code [EMAIL]①[PHONE]}; as an intentional consequence, an
 *       immediately adjacent circled digit whose expansion forms 12 digits with a 10-digit phone
 *       (such as {@code ⑩0912345678}, expanding to {@code 100912345678}) is treated as a 12-digit
 *       {@code [ID]} with zero PII leak and strict idempotency. {@code OTHER_NUMBER} positions are
 *       excluded from email local-part and domain matching so marker-adjacent {@code @domain}
 *       sequences never hijack trailing digits of {@code ID}/{@code PHONE} spans and behave
 *       identically across repeated masking passes.
 * </ul>
 *
 * <h2>Bounded Execution &amp; Fail-Closed Guarantee</h2>
 *
 * <p>Email detection records all {@code @} positions once during normalization and uses a linear
 * scan ({@code O(N)} time, {@code O(1)} stack) instead of backtracking regexes, {@code ID}/{@code
 * PHONE} patterns use only fixed or strictly bounded quantifiers, and local boundary convergence
 * only re-checks fixed {@code 32}-char windows and immediate neighboring {@code @} anchors around
 * newly claimed spans so hostile 1 MB inputs (including long domino chains) complete well under
 * 1000 ms without {@link StackOverflowError}. Multi-character NFKC expansions claim all normalized
 * code units sharing the same original UTF-16 span so no trailing digits remain to defeat adjacent
 * boundary checks. Any unexpected runtime error propagates to callers (fail-closed) rather than
 * returning unmasked text.
 */
@Component
public class PiiMasker {
    private static final int LOCAL_CONVERGENCE_WINDOW = 32;
    private static final char CLAIMED_SENTINEL = '#';
    private static final char NEUTRALIZED_BOUNDARY = '\u001F';

    private static final Pattern ID =
            Pattern.compile(
                    "(?<![0-9])(?:"
                            + "[0-9]{12}(?![0-9])"
                            + "|(?<![0-9][.-])(?:[0-9]{3}([.-])[0-9]{3}\\1[0-9]{3}\\1[0-9]{3}|[0-9]{4}([.-])[0-9]{4}\\2[0-9]{4}|[0-9]{6}[.-][0-9]{6})(?![.-][0-9])(?![0-9])"
                            + "|[0-9]{3} [0-9]{3} [0-9]{3} [0-9]{3}(?! [0-9]{3}(?![0-9]))(?![0-9])(?<!(?:^|[^0-9])[0-9]{3} [0-9]{3} [0-9]{3} [0-9]{3} [0-9]{3})"
                            + "|[0-9]{4} [0-9]{4} [0-9]{4}(?! [0-9]{4}(?![0-9]))(?![0-9])(?<!(?:^|[^0-9])[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4})"
                            + "|[0-9]{6} [0-9]{6}(?! [0-9]{6}(?![0-9]))(?![0-9])(?<!(?:^|[^0-9])[0-9]{6} [0-9]{6} [0-9]{6})"
                            + "|(?<!(?:^|[^0-9])[0-9] )(?:[0-9] ){11}[0-9](?![ ][0-9](?![0-9]))(?![0-9])"
                            + ")");
    private static final Pattern PHONE =
            Pattern.compile(
                    "(?<![0-9])(?:\\(?(?:\\+84|0084|84)\\)?[ .-]?(?:\\(0\\)[ .-]?)?|\\(?0[ .-]?)(?:[35789](?:[ .-]?[0-9]){8}|2(?:[ .-]?[0-9]\\)(?:[ .-]?[0-9]){8}|(?:[ .-]?[0-9]){2}\\)?(?:[ .-]?[0-9]){7}))(?![0-9])");

    public String mask(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }

        int len = text.length();
        StringBuilder normBuilder = new StringBuilder(len);
        int[] origStarts = new int[len];
        int[] origEnds = new int[len];
        int[] atPositions = new int[Math.min(len, 64)];
        int[] otherNumberPositions = null;
        int normLen = 0;
        int atCount = 0;
        int otherNumberCount = 0;

        for (int i = 0; i < len; ) {
            int cp = text.codePointAt(i);
            int charCount = Character.charCount(cp);
            if (!isIgnoredInvisible(cp)) {
                if (cp < 0x80) {
                    if (normLen == origStarts.length) {
                        int newCap = origStarts.length + Math.max(16, origStarts.length >> 1);
                        origStarts = Arrays.copyOf(origStarts, newCap);
                        origEnds = Arrays.copyOf(origEnds, newCap);
                    }
                    char ch = (char) cp;
                    if (ch == '@') {
                        if (atCount == atPositions.length) {
                            atPositions =
                                    Arrays.copyOf(
                                            atPositions,
                                            atPositions.length
                                                    + Math.max(16, atPositions.length >> 1));
                        }
                        atPositions[atCount++] = normLen;
                    }
                    normBuilder.append(ch);
                    origStarts[normLen] = i;
                    origEnds[normLen] = i + charCount;
                    normLen++;
                } else {
                    String nfkc =
                            Normalizer.normalize(
                                    new String(Character.toChars(cp)), Normalizer.Form.NFKC);
                    if (isNonJoiningUnitSymbol(cp, nfkc)) {
                        if (normLen == origStarts.length) {
                            int newCap = origStarts.length + Math.max(16, origStarts.length >> 1);
                            origStarts = Arrays.copyOf(origStarts, newCap);
                            origEnds = Arrays.copyOf(origEnds, newCap);
                        }
                        normBuilder.append(cp <= 0xFFFF ? (char) cp : NEUTRALIZED_BOUNDARY);
                        origStarts[normLen] = i;
                        origEnds[normLen] = i + charCount;
                        normLen++;
                    } else {
                        int nfkcLen = nfkc.length();
                        boolean isOtherNumber = Character.getType(cp) == Character.OTHER_NUMBER;
                        if (normLen + nfkcLen > origStarts.length) {
                            int newCap =
                                    Math.max(
                                            normLen + nfkcLen,
                                            origStarts.length
                                                    + Math.max(16, origStarts.length >> 1));
                            origStarts = Arrays.copyOf(origStarts, newCap);
                            origEnds = Arrays.copyOf(origEnds, newCap);
                        }
                        for (int j = 0; j < nfkcLen; j++) {
                            char ch = nfkc.charAt(j);
                            if (ch == '@') {
                                if (atCount == atPositions.length) {
                                    atPositions =
                                            Arrays.copyOf(
                                                    atPositions,
                                                    atPositions.length
                                                            + Math.max(
                                                                    16, atPositions.length >> 1));
                                }
                                atPositions[atCount++] = normLen;
                            }
                            if (isOtherNumber) {
                                if (otherNumberPositions == null) {
                                    otherNumberPositions = new int[16];
                                } else if (otherNumberCount == otherNumberPositions.length) {
                                    otherNumberPositions =
                                            Arrays.copyOf(
                                                    otherNumberPositions,
                                                    otherNumberPositions.length
                                                            + Math.max(
                                                                    16,
                                                                    otherNumberPositions.length
                                                                            >> 1));
                                }
                                otherNumberPositions[otherNumberCount++] = normLen;
                            }
                            normBuilder.append(ch);
                            origStarts[normLen] = i;
                            origEnds[normLen] = i + charCount;
                            normLen++;
                        }
                    }
                }
            }
            i += charCount;
        }

        if (normLen == 0) {
            return text;
        }

        char[] view = normBuilder.toString().toCharArray();
        CharBuffer viewBuf = CharBuffer.wrap(view);
        Matcher idMatcher =
                ID.matcher(viewBuf).useTransparentBounds(true).useAnchoringBounds(false);
        Matcher phoneMatcher =
                PHONE.matcher(viewBuf).useTransparentBounds(true).useAnchoringBounds(false);
        boolean[] otherNumberPos = null;
        if (otherNumberCount > 0) {
            otherNumberPos = new boolean[normLen];
            for (int i = 0; i < otherNumberCount; i++) {
                otherNumberPos[otherNumberPositions[i]] = true;
            }
        }
        MaskState state =
                new MaskState(
                        view,
                        normLen,
                        origStarts,
                        origEnds,
                        atPositions,
                        atCount,
                        otherNumberCount,
                        otherNumberPos,
                        idMatcher,
                        phoneMatcher);

        for (int i = 0; i < atCount; i++) {
            tryProcessAt(i, state, true);
        }
        state.pending.clear();

        collectPattern(state.idMatcher, "[ID]", state, 0, normLen);
        collectPattern(state.phoneMatcher, "[PHONE]", state, 0, normLen);
        if (!state.pending.isEmpty()) {
            convergePatterns(state);
        }

        // Re-evaluate only '@' anchors adjacent to newly claimed spans so convergence stays O(N).
        while (state.atSize > 0) {
            boolean emailClaimed = false;
            int waveSize = state.atSize;
            for (int i = 0; i < waveSize; i++) {
                int atIdx = state.pollAtIndex();
                emailClaimed |= tryProcessAt(atIdx, state, true);
            }
            if (!emailClaimed || state.pending.isEmpty()) {
                break;
            }
            convergePatterns(state);
        }

        // Any Unicode OTHER_NUMBER (e.g. circled digit ①) left unclaimed after Pass 1 acts as a
        // non-digit/non-domain boundary (e.g. "a@b.com①0912345678" -> "[EMAIL]①[PHONE]").
        if (otherNumberCount > 0) {
            boolean neutralizedAny = false;
            for (int i = 0; i < otherNumberCount; i++) {
                int pos = otherNumberPositions[i];
                if (!state.claimed[pos]) {
                    state.view[pos] = NEUTRALIZED_BOUNDARY;
                    state.enqueueNearbyAts(pos, pos + 1);
                    neutralizedAny = true;
                }
            }
            if (neutralizedAny) {
                collectPattern(state.idMatcher, "[ID]", state, 0, normLen);
                collectPattern(state.phoneMatcher, "[PHONE]", state, 0, normLen);
                if (!state.pending.isEmpty()) {
                    convergePatterns(state);
                }
                while (state.atSize > 0) {
                    boolean emailClaimed = false;
                    int waveSize = state.atSize;
                    for (int i = 0; i < waveSize; i++) {
                        int atIdx = state.pollAtIndex();
                        emailClaimed |= tryProcessAt(atIdx, state, true);
                    }
                    if (!emailClaimed || state.pending.isEmpty()) {
                        break;
                    }
                    convergePatterns(state);
                }
            }
        }

        // Flush any remaining '@' anchors whose digit-delimited prefix did not belong to a
        // preceding space-separated ID or PHONE.
        if (state.hasDeferredAt) {
            for (int i = 0; i < atCount; i++) {
                if (state.deferredAt[i] && !state.claimed[state.atPositions[i]]) {
                    state.enqueueAtIndex(i);
                }
            }
            state.hasDeferredAt = false;
            while (state.atSize > 0) {
                boolean emailClaimed = false;
                int waveSize = state.atSize;
                for (int i = 0; i < waveSize; i++) {
                    int atIdx = state.pollAtIndex();
                    emailClaimed |= tryProcessAt(atIdx, state, false);
                }
                if (!emailClaimed || state.pending.isEmpty()) {
                    break;
                }
                convergePatterns(state);
            }
        }

        if (state.spans.isEmpty()) {
            return text;
        }

        state.spans.sort(Comparator.comparingInt(Span::origStart));
        StringBuilder out = new StringBuilder(len);
        int cursor = 0;
        for (Span span : state.spans) {
            if (span.origStart < cursor) {
                continue;
            }
            out.append(text, cursor, span.origStart);
            out.append(span.replacement);
            cursor = span.origEnd;
        }
        out.append(text, cursor, len);
        return out.toString();
    }

    private static boolean isIgnoredInvisible(int cp) {
        return cp == 0x00AD
                || cp == 0x034F
                || cp == 0x061C
                || (cp >= 0x200B && cp <= 0x200F)
                || (cp >= 0x202A && cp <= 0x202E)
                || cp == 0x2060
                || (cp >= 0x2066 && cp <= 0x2069)
                || cp == 0xFEFF;
    }

    private static boolean tryProcessAt(int atIdx, MaskState state, boolean deferAmbiguous) {
        return tryProcessAtWithLimit(atIdx, state, deferAmbiguous, state.normLen, true);
    }

    private static boolean tryProcessAtWithLimit(
            int atIdx,
            MaskState state,
            boolean deferAmbiguous,
            int domainLimit,
            boolean allowResolvePreceding) {
        int at = state.atPositions[atIdx];
        if (state.claimed[at]) {
            return false;
        }
        char[] view = state.view;
        boolean[] claimed = state.claimed;
        int len = state.normLen;

        int left = at;
        while (left > 0
                && !claimed[left - 1]
                && !state.isOtherNumberPos(left - 1)
                && isEmailLocalChar(view[left - 1])) {
            left--;
        }
        // Trim delimiter punctuation left behind immediately after a claimed [ID]/[PHONE]/[EMAIL]
        // span, an excluded OTHER_NUMBER position, or a neutralized OTHER_NUMBER boundary.
        if (left > 0
                && (claimed[left - 1]
                        || state.isOtherNumberPos(left - 1)
                        || (state.otherNumberCount > 0
                                && view[left - 1] == NEUTRALIZED_BOUNDARY))) {
            while (left < at && isEmailDelimiterAfterClaimed(view[left])) {
                left++;
            }
        } else if (left > 0 && !claimed[left - 1] && view[left - 1] == '@') {
            if (deferAmbiguous) {
                state.deferredAt[atIdx] = true;
                state.hasDeferredAt = true;
                return false;
            }
            if (allowResolvePreceding
                    && atIdx > 0
                    && state.atPositions[atIdx - 1] == left - 1
                    && tryProcessAtWithLimit(atIdx - 1, state, false, at, false)) {
                left = at;
                while (left > 0
                        && !claimed[left - 1]
                        && !state.isOtherNumberPos(left - 1)
                        && isEmailLocalChar(view[left - 1])) {
                    left--;
                }
                if (left > 0
                        && (claimed[left - 1]
                                || state.isOtherNumberPos(left - 1)
                                || (state.otherNumberCount > 0
                                        && view[left - 1] == NEUTRALIZED_BOUNDARY))) {
                    while (left < at && isEmailDelimiterAfterClaimed(view[left])) {
                        left++;
                    }
                }
            }
        }
        if (left >= at) {
            return false;
        }
        boolean hasAlnumLocal = false;
        for (int i = left; i < at; i++) {
            char c = view[i];
            if (isAsciiAlpha(c) || isAsciiDigit(c)) {
                hasAlnumLocal = true;
                break;
            }
        }
        if (!hasAlnumLocal) {
            return false;
        }
        if (deferAmbiguous
                && isPrecededBySpacedNumberAndStartsWithDigitDelimiter(view, claimed, left, at)) {
            state.deferredAt[atIdx] = true;
            state.hasDeferredAt = true;
            return false;
        }

        int p = at + 1;
        int labelCount = 0;
        int curLabelLen = 0;
        boolean curLabelAllAlpha = true;
        int lastValidEnd = -1;
        int lastChainHyphenEnd = -1;

        while (p < domainLimit && !claimed[p] && !state.isOtherNumberPos(p)) {
            char c = view[p];
            if (c == '.') {
                if (curLabelLen == 0) {
                    break;
                }
                labelCount++;
                if (labelCount >= 2 && curLabelAllAlpha && curLabelLen >= 2) {
                    lastValidEnd = p;
                }
                curLabelLen = 0;
                curLabelAllAlpha = true;
                p++;
            } else if (isAsciiAlpha(c)) {
                curLabelLen++;
                p++;
            } else if (isAsciiDigit(c)) {
                curLabelLen++;
                curLabelAllAlpha = false;
                p++;
            } else if (c == '-') {
                if (curLabelLen == 0) {
                    break;
                }
                if (labelCount + 1 >= 2 && curLabelAllAlpha && curLabelLen >= 2) {
                    lastChainHyphenEnd = p;
                }
                // Stop before '-' if it trails into a claimed span ('#'), excluded OTHER_NUMBER,
                // or non-alphanumeric boundary.
                int q = p + 1;
                while (q < domainLimit && !claimed[q] && view[q] == '-') {
                    q++;
                }
                if (q >= domainLimit
                        || claimed[q]
                        || state.isOtherNumberPos(q)
                        || (!isAsciiAlpha(view[q]) && !isAsciiDigit(view[q]))) {
                    break;
                }
                curLabelLen++;
                curLabelAllAlpha = false;
                p++;
            } else {
                break;
            }
        }
        boolean stoppedAtAt = p < len && !claimed[p] && view[p] == '@';
        if (curLabelLen > 0 && !(stoppedAtAt && lastValidEnd > at + 1)) {
            labelCount++;
            if (labelCount >= 2 && curLabelAllAlpha && curLabelLen >= 2) {
                lastValidEnd = p;
            }
        }

        int resolvedEnd =
                (!deferAmbiguous && stoppedAtAt)
                        ? Math.max(lastValidEnd, lastChainHyphenEnd)
                        : lastValidEnd;
        if (resolvedEnd > at + 1) {
            // Do not truncate a multi-label domain onto an earlier label when the trailing
            // rejected label starts with an ASCII letter (e.g. ".com-0912345678",
            // ".vn0912345678", or ".com-note"). Once adjacent PII is claimed as '#', re-scan
            // claims the full domain.
            if ((deferAmbiguous || !stoppedAtAt)
                    && resolvedEnd < p
                    && curLabelLen > 0
                    && resolvedEnd + 1 < p
                    && view[resolvedEnd] == '.'
                    && isAsciiAlpha(view[resolvedEnd + 1])) {
                return false;
            }
            return tryClaim(left, resolvedEnd, "[EMAIL]", state);
        }
        return false;
    }

    private static boolean isPrecededBySpacedNumberAndStartsWithDigitDelimiter(
            char[] view, boolean[] claimed, int left, int at) {
        if (left <= 0 || claimed[left - 1]) {
            return false;
        }
        char before = view[left - 1];
        boolean spacedOrParenBoundary =
                before == ')'
                        || (before == ' '
                                && left >= 2
                                && (isAsciiDigit(view[left - 2]) || view[left - 2] == ')'));
        if (!spacedOrParenBoundary) {
            return false;
        }
        int p = left;
        if (!isAsciiDigit(view[p])) {
            return false;
        }
        while (p < at && isAsciiDigit(view[p])) {
            p++;
        }
        return p < at && isEmailDelimiterAfterClaimed(view[p]);
    }

    private static boolean isEmailDelimiterAfterClaimed(char c) {
        return c == '-' || c == '.' || c == '+' || c == '_' || c == '%';
    }

    private static boolean isNonJoiningUnitSymbol(int cp, String nfkc) {
        if (Character.getType(cp) != Character.OTHER_SYMBOL) {
            return false;
        }
        int nfkcLen = nfkc.length();
        if (nfkcLen < 2 || !isAsciiDigit(nfkc.charAt(nfkcLen - 1))) {
            return false;
        }
        for (int i = 0; i < nfkcLen; i++) {
            char c = nfkc.charAt(i);
            if (!isAsciiAlpha(c) && !isAsciiDigit(c)) {
                return false;
            }
        }
        return true;
    }

    private static boolean convergePatterns(MaskState state) {
        boolean claimedAny = false;
        char[] view = state.view;
        boolean[] claimed = state.claimed;
        int normLen = state.normLen;
        while (!state.pending.isEmpty()) {
            int[] span = state.pending.pop();
            if (hasUnclaimedNeighborLeft(view, claimed, span[0])) {
                int leftStart = Math.max(0, span[0] - LOCAL_CONVERGENCE_WINDOW);
                int leftEnd = span[0];
                if (hasAtLeastUnclaimedDigits(view, claimed, leftStart, leftEnd, 12)) {
                    claimedAny |=
                            collectPattern(state.idMatcher, "[ID]", state, leftStart, leftEnd);
                }
                if (hasAtLeastUnclaimedDigits(view, claimed, leftStart, leftEnd, 10)) {
                    claimedAny |=
                            collectPattern(
                                    state.phoneMatcher, "[PHONE]", state, leftStart, leftEnd);
                }
            }
            if (hasUnclaimedNeighborRight(view, claimed, span[1])) {
                int rightStart = span[1];
                int rightEnd = Math.min(normLen, span[1] + LOCAL_CONVERGENCE_WINDOW);
                if (hasAtLeastUnclaimedDigits(view, claimed, rightStart, rightEnd, 12)) {
                    claimedAny |=
                            collectPattern(state.idMatcher, "[ID]", state, rightStart, rightEnd);
                }
                if (hasAtLeastUnclaimedDigits(view, claimed, rightStart, rightEnd, 10)) {
                    claimedAny |=
                            collectPattern(
                                    state.phoneMatcher, "[PHONE]", state, rightStart, rightEnd);
                }
            }
        }
        return claimedAny;
    }

    private static boolean hasAtLeastUnclaimedDigits(
            char[] view, boolean[] claimed, int start, int end, int minDigits) {
        if (end - start < minDigits) {
            return false;
        }
        int count = 0;
        for (int i = start; i < end; i++) {
            if (!claimed[i] && isAsciiDigit(view[i]) && ++count >= minDigits) {
                return true;
            }
        }
        return false;
    }

    private static boolean collectPattern(
            Matcher matcher, String replacement, MaskState state, int regionStart, int regionEnd) {
        boolean claimedAny = false;
        matcher.region(regionStart, regionEnd);
        while (matcher.find()) {
            int start = matcher.start();
            int end = matcher.end();
            // Prevent a single-digit space-separated phone match from slicing a 11+ single-digit
            // token (e.g. "0 7 9 1 2 3 4 5 6 7 8 9 0") into "[PHONE] 8 9 0".
            if ("[PHONE]".equals(replacement)
                    && isContinuedSingleDigitRun(state.view, start, end)) {
                continue;
            }
            if (tryClaim(start, end, replacement, state)) {
                claimedAny = true;
            }
        }
        return claimedAny;
    }

    private static boolean hasUnclaimedNeighborLeft(char[] view, boolean[] claimed, int pos) {
        if (pos <= 0) {
            return false;
        }
        if (!claimed[pos - 1] && isAsciiDigit(view[pos - 1])) {
            return true;
        }
        char prev = view[pos - 1];
        return (prev == '-' || prev == '.' || prev == ' ')
                && pos >= 2
                && !claimed[pos - 2]
                && isAsciiDigit(view[pos - 2]);
    }

    private static boolean hasUnclaimedNeighborRight(char[] view, boolean[] claimed, int pos) {
        if (pos >= view.length) {
            return false;
        }
        char next = view[pos];
        if (!claimed[pos] && (isAsciiDigit(next) || next == '(' || next == '+')) {
            return true;
        }
        return (next == '-' || next == '.' || next == ' ')
                && pos + 1 < view.length
                && !claimed[pos + 1]
                && (isAsciiDigit(view[pos + 1]) || view[pos + 1] == '(' || view[pos + 1] == '+');
    }

    private static boolean isContinuedSingleDigitRun(char[] view, int start, int end) {
        if (end - start < 5 || end + 1 >= view.length) {
            return false;
        }
        boolean endsWithSpacedSingleDigits =
                isAsciiDigit(view[end - 1])
                        && view[end - 2] == ' '
                        && isAsciiDigit(view[end - 3])
                        && view[end - 4] == ' ';
        if (!endsWithSpacedSingleDigits) {
            return false;
        }
        return view[end] == ' '
                && isAsciiDigit(view[end + 1])
                && (end + 2 == view.length || !isAsciiDigit(view[end + 2]));
    }

    private static boolean isAsciiDigit(char c) {
        return c >= '0' && c <= '9';
    }

    private static boolean tryClaim(
            int normStart, int normEnd, String replacement, MaskState state) {
        if (normStart >= normEnd) {
            return false;
        }
        int origStart = state.origStarts[normStart];
        int origEnd = state.origEnds[normEnd - 1];
        int expandedStart = normStart;
        while (expandedStart > 0 && state.origEnds[expandedStart - 1] > origStart) {
            expandedStart--;
        }
        int expandedEnd = normEnd;
        while (expandedEnd < state.normLen && state.origStarts[expandedEnd] < origEnd) {
            expandedEnd++;
        }
        for (int i = expandedStart; i < expandedEnd; i++) {
            if (state.claimed[i]) {
                return false;
            }
        }
        for (int i = expandedStart; i < expandedEnd; i++) {
            state.claimed[i] = true;
            state.view[i] = CLAIMED_SENTINEL;
        }
        state.spans.add(new Span(origStart, origEnd, replacement));
        state.pending.push(new int[] {expandedStart, expandedEnd});
        state.enqueueNearbyAts(expandedStart, expandedEnd);
        return true;
    }

    private static boolean isEmailLocalChar(char c) {
        return isAsciiAlpha(c)
                || (c >= '0' && c <= '9')
                || c == '.'
                || c == '_'
                || c == '%'
                || c == '+'
                || c == '-';
    }

    private static boolean isAsciiAlpha(char c) {
        return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
    }

    private static final class MaskState {
        final char[] view;
        final int normLen;
        final boolean[] claimed;
        final int[] origStarts;
        final int[] origEnds;
        final List<Span> spans = new ArrayList<>();
        final Deque<int[]> pending = new ArrayDeque<>();
        final int[] atPositions;
        final int atCount;
        final int otherNumberCount;
        final boolean[] otherNumberPos;
        final int[] atQueue;
        final boolean[] inAtQueue;
        final boolean[] deferredAt;
        int atHead;
        int atTail;
        int atSize;
        boolean hasDeferredAt;
        final Matcher idMatcher;
        final Matcher phoneMatcher;

        MaskState(
                char[] view,
                int normLen,
                int[] origStarts,
                int[] origEnds,
                int[] atPositions,
                int atCount,
                int otherNumberCount,
                boolean[] otherNumberPos,
                Matcher idMatcher,
                Matcher phoneMatcher) {
            this.view = view;
            this.normLen = normLen;
            this.claimed = new boolean[normLen];
            this.origStarts = origStarts;
            this.origEnds = origEnds;
            this.atPositions = atPositions;
            this.atCount = atCount;
            this.otherNumberCount = otherNumberCount;
            this.otherNumberPos = otherNumberPos;
            this.atQueue = (atCount > 0) ? new int[atCount] : new int[0];
            this.inAtQueue = (atCount > 0) ? new boolean[atCount] : new boolean[0];
            this.deferredAt = (atCount > 0) ? new boolean[atCount] : new boolean[0];
            this.idMatcher = idMatcher;
            this.phoneMatcher = phoneMatcher;
        }

        boolean isOtherNumberPos(int index) {
            return otherNumberPos != null && otherNumberPos[index];
        }

        void enqueueAtIndex(int atIdx) {
            if (atIdx < 0 || atIdx >= atCount || inAtQueue[atIdx] || claimed[atPositions[atIdx]]) {
                return;
            }
            inAtQueue[atIdx] = true;
            atQueue[atTail] = atIdx;
            atTail++;
            if (atTail == atCount) {
                atTail = 0;
            }
            atSize++;
        }

        int pollAtIndex() {
            int idx = atQueue[atHead];
            atHead++;
            if (atHead == atCount) {
                atHead = 0;
            }
            atSize--;
            inAtQueue[idx] = false;
            return idx;
        }

        void enqueueNearbyAts(int spanStart, int spanEnd) {
            if (atCount == 0) {
                return;
            }
            int pos = Arrays.binarySearch(atPositions, 0, atCount, spanStart);
            int ins = (pos >= 0) ? pos : (-pos - 1);
            int leftIdx = ins - 1;
            if (leftIdx >= 0) {
                enqueueAtIndex(leftIdx);
            }
            int rightIdx = (pos >= 0) ? pos + 1 : ins;
            while (rightIdx < atCount && atPositions[rightIdx] < spanEnd) {
                rightIdx++;
            }
            if (rightIdx < atCount) {
                enqueueAtIndex(rightIdx);
            }
        }
    }

    private record Span(int origStart, int origEnd, String replacement) {}
}
