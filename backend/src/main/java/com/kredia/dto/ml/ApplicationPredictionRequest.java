package com.kredia.dto.ml;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request DTO for the application-prediction-service.
 * Contains ONLY fields available at credit application submission time.
 * No interest_rate, overdue_ratio or partial_ratio (not known yet).
 */
public record ApplicationPredictionRequest(
        float amount,
        float income,
        int dependents,
        @JsonProperty("term_months") int termMonths,
        @JsonProperty("repayment_type") String repaymentType
) {}
