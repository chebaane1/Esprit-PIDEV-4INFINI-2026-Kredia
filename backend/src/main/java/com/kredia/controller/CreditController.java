package com.kredia.controller;

import com.kredia.dto.ml.ApplicationPredictionResponse;
import com.kredia.entity.credit.Credit;
import com.kredia.entity.credit.DemandeCredit;
import com.kredia.repository.DemandeCreditRepository;
import com.kredia.service.ApplicationPredictionService;
import jakarta.validation.Valid;
import com.kredia.service.CreditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/credits")
public class CreditController {

    private final CreditService creditService;
    private final com.kredia.service.CreditExcelExportService creditExcelExportService;
    private final com.kredia.service.StatisticsPdfExportService statisticsPdfExportService;
    private final com.kredia.service.DefaultPredictionService defaultPredictionService;
    private final ApplicationPredictionService applicationPredictionService;
    private final DemandeCreditRepository demandeCreditRepository;

    @Autowired
    public CreditController(CreditService creditService,
            com.kredia.service.CreditExcelExportService creditExcelExportService,
            com.kredia.service.StatisticsPdfExportService statisticsPdfExportService,
            com.kredia.service.DefaultPredictionService defaultPredictionService,
            ApplicationPredictionService applicationPredictionService,
            DemandeCreditRepository demandeCreditRepository) {
        this.creditService = creditService;
        this.creditExcelExportService = creditExcelExportService;
        this.statisticsPdfExportService = statisticsPdfExportService;
        this.defaultPredictionService = defaultPredictionService;
        this.applicationPredictionService = applicationPredictionService;
        this.demandeCreditRepository = demandeCreditRepository;
    }

    /**
     * Submit a credit application.
     * Automatically calls the ML application-prediction-service to get status=0/1.
     * Returns both the saved demande and the ML prediction result.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createDemande(@Valid @RequestBody DemandeCredit demandeCredit) {
        DemandeCredit created = creditService.createDemande(demandeCredit);

        // Call ML prediction service (fail-safe: won't block if service is down)
        ApplicationPredictionResponse mlPrediction = applicationPredictionService.predictForDemande(created);

        Map<String, Object> response = new HashMap<>();
        response.put("demande", created);
        response.put("mlPrediction", mlPrediction);  // null if service unavailable

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Re-run ML application prediction on an existing demande.
     * Useful for admin review dashboard.
     */
    @PostMapping("/demandes/{id}/predict-application")
    public ResponseEntity<?> predictApplication(@PathVariable Long id) {
        try {
            DemandeCredit demande = demandeCreditRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Demande not found: " + id));
            ApplicationPredictionResponse prediction = applicationPredictionService.predictForDemande(demande);
            if (prediction == null) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("ML prediction service is currently unavailable.");
            }
            return ResponseEntity.ok(prediction);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Credit> getCreditById(@PathVariable Long id) {
        return creditService.getCreditById(id)
                .map(credit -> new ResponseEntity<>(credit, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping
    public ResponseEntity<List<Credit>> getAllCredits() {
        List<Credit> credits = creditService.getAllCredits();
        return new ResponseEntity<>(credits, HttpStatus.OK);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<DemandeCredit>> getPendingCredits() {
        List<DemandeCredit> credits = creditService.getPendingCredits();
        return new ResponseEntity<>(credits, HttpStatus.OK);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PostMapping("/{id}/approve")
    public ResponseEntity<Credit> approveCreditRequest(@PathVariable Long id) {
        try {
            return new ResponseEntity<>(creditService.approveRequest(id), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PostMapping("/{id}/reject")
    public ResponseEntity<DemandeCredit> rejectCreditRequest(@PathVariable Long id) {
        try {
            return new ResponseEntity<>(creditService.rejectRequest(id), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<List<Credit>> getCreditsByUserId(@PathVariable Long userId) {
        List<Credit> credits = creditService.getCreditsByUserId(userId);
        return new ResponseEntity<>(credits, HttpStatus.OK);
    }

    @GetMapping("/demandes/by-user/{userId}")
    public ResponseEntity<List<DemandeCredit>> getDemandeCreditsByUserId(@PathVariable Long userId) {
        List<DemandeCredit> demandes = creditService.getDemandeCreditsByUserId(userId);
        return new ResponseEntity<>(demandes, HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Credit> updateCredit(@PathVariable Long id, @Valid @RequestBody Credit creditDetails) {
        try {
            Credit updatedCredit = creditService.updateCredit(id, creditDetails);
            return new ResponseEntity<>(updatedCredit, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCredit(@PathVariable Long id) {
        creditService.deleteCredit(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportCreditToExcel(@PathVariable Long id) {
        try {
            byte[] excelData = creditExcelExportService.generateCreditExcel(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(
                    MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=credit_" + id + ".xlsx");
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{id}/statistics/pdf")
    public ResponseEntity<byte[]> exportStatisticsPdf(@PathVariable Long id) {
        try {
            byte[] pdfData = statisticsPdfExportService.generateStatisticsPdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=statistiques_credit_" + id + ".pdf");
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfData);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{id}/predict-default")
    public ResponseEntity<?> predictDefault(@PathVariable Long id) {
        try {
            com.kredia.dto.ml.DefaultPredictionResponse response = defaultPredictionService.predictForCredit(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
