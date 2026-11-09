package com.kredia.service;

import com.kredia.dto.ml.ApplicationPredictionRequest;
import com.kredia.dto.ml.ApplicationPredictionResponse;
import com.kredia.entity.credit.DemandeCredit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Calls the application-prediction-service (port 8002) to predict
 * whether a credit applicant can repay (status=0) or not (status=1).
 *
 * Uses ONLY fields available at application submission time:
 *   amount, income, dependents, term_months, repayment_type
 *
 * Distinct from DefaultPredictionService which uses post-approval data
 * (overdue_ratio, partial_ratio, interest_rate) on port 8001.
 */
@Service
public class ApplicationPredictionService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationPredictionService.class);

    private final RestTemplate restTemplate;

    @Value("${ml.application-prediction.url:http://localhost:8002}")
    private String mlServiceUrl;

    public ApplicationPredictionService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Predicts eligibility for a credit application.
     *
     * @param demande the credit application entity
     * @return prediction with status=0 (can repay) or status=1 (default risk),
     *         or null if the ML service is unavailable (fail-safe: don't block application)
     */
    public ApplicationPredictionResponse predictForDemande(DemandeCredit demande) {
        ApplicationPredictionRequest request = new ApplicationPredictionRequest(
                demande.getAmount(),
                demande.getIncome().floatValue(),
                demande.getDependents(),
                demande.getTermMonths(),
                demande.getRepaymentType().name()
        );

        String url = mlServiceUrl + "/predict-application";

        try {
            ApplicationPredictionResponse response =
                    restTemplate.postForObject(url, request, ApplicationPredictionResponse.class);
            log.info("ML prediction for demande {}: status={}, probability={}, risk={}",
                    demande.getId(),
                    response != null ? response.status() : "N/A",
                    response != null ? response.defaultProbability() : "N/A",
                    response != null ? response.riskLevel() : "N/A");
            return response;
        } catch (RestClientException e) {
            // Fail gracefully: ML service unavailable should not block application submission
            log.warn("Application prediction service unavailable ({}). " +
                     "Demande will be saved without ML prediction. Error: {}", url, e.getMessage());
            return null;
        }
    }
}
