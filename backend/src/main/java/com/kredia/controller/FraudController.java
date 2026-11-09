package com.kredia.controller;

import com.kredia.entity.wallet.Transaction;
import com.kredia.service.FraudDetectionService;
import com.kredia.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fraud")
public class FraudController {

    private final FraudDetectionService fraudDetectionService;
    private final TransactionService transactionService;

    @Autowired
    public FraudController(FraudDetectionService fraudDetectionService, TransactionService transactionService) {
        this.fraudDetectionService = fraudDetectionService;
        this.transactionService = transactionService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/suspected")
    public ResponseEntity<List<Transaction>> getSuspectedTransactions() {
        List<Transaction> suspected = fraudDetectionService.getSuspectedTransactions();
        return new ResponseEntity<>(suspected, HttpStatus.OK);
    }
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PostMapping("/analyze-transaction/{transactionId}")
    public ResponseEntity<?> analyzeTransactionWithAI(@PathVariable Long transactionId) {
        return transactionService.getTransaction(transactionId).map(transaction -> {
            try {
                String aiDescription = fraudDetectionService.generateTransactionDescriptionWithGemini(transaction);
                return new ResponseEntity<>(Map.of("message", "AI analysis completed", "analysis", aiDescription), HttpStatus.OK);
            } catch (Exception e) {
                return new ResponseEntity<>(Map.of("error", "AI analysis failed: " + e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }).orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

}
