package com.rikkei.jobs.candidate.dto;

import java.math.BigDecimal;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.core.exc.StreamReadException;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/**
 * Preserves exact decimal/exponent text for raw JSON numbers on {@link ManualOverrideRequest} so
 * IEEE-754 double underflow (such as {@code 1e-100000 -> 0.0}) is caught as a validation error
 * without modifying the global {@code ObjectMapper}/{@code JsonMapper}.
 */
public class ManualOverrideValueDeserializer extends ValueDeserializer<Object> {

    @Override
    public Object deserialize(JsonParser p, DeserializationContext ctxt) throws JacksonException {
        JsonToken token = p.currentToken();
        if (token == JsonToken.VALUE_NUMBER_FLOAT || token == JsonToken.VALUE_NUMBER_INT) {
            String rawText = p.getString();
            try {
                return new BigDecimal(rawText);
            } catch (NumberFormatException | ArithmeticException ex) {
                throw new StreamReadException(p, "Invalid numeric value for manual override", ex);
            }
        }
        if (token == JsonToken.VALUE_STRING) {
            return p.getString();
        }
        if (token == JsonToken.VALUE_TRUE) {
            return Boolean.TRUE;
        }
        if (token == JsonToken.VALUE_FALSE) {
            return Boolean.FALSE;
        }
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        return ctxt.handleUnexpectedToken(Object.class, p);
    }
}
