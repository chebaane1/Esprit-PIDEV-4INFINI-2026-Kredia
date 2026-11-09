package com.kredia.dto.ml;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response DTO from the application-prediction-service.
 *
 * status = 0 → applicant can repay (eligible)
 * status = 1 → default risk (not eligible / needs review)
 */
public record ApplicationPredictionResponse(
        @JsonProperty("demande_id")       Long demandeId,
        @JsonProperty("status")           int status,
        @JsonProperty("default_probability") double defaultProbability,
        @JsonProperty("eligibility_score")   double eligibilityScore,
        @JsonProperty("risk_level")       String riskLevel,
        String recommendation
) {}
