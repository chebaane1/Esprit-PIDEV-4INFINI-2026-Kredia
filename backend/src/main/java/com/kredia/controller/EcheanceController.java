package com.kredia.controller;

import com.kredia.dto.echeance.EcheancePaymentRequest;
import com.kredia.dto.echeance.EcheancePaymentResponse;
import com.kredia.service.EcheanceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/echeances")
public class EcheanceController {

    private final EcheanceService echeanceService;

    @Autowired
    public EcheanceController(EcheanceService echeanceService) {
        this.echeanceService = echeanceService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','CLIENT')")
    @PutMapping("/{echeanceId}/pay")
    public ResponseEntity<?> payEcheance(@PathVariable Long echeanceId, 
                                         @Valid @RequestBody EcheancePaymentRequest request) {
        try {
            return new ResponseEntity<>(echeanceService.payEcheance(echeanceId, request.amount()), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<EcheancePaymentResponse> getEcheanceById(@PathVariable Long id) {
        try {
            return new ResponseEntity<>(echeanceService.getEcheanceById(id), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<List<EcheancePaymentResponse>> getAllEcheances() {
        return new ResponseEntity<>(echeanceService.getAllEcheances(), HttpStatus.OK);
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<List<EcheancePaymentResponse>> getEcheancesByUserId(
            @PathVariable Long userId,
            @RequestParam(required = false) Long creditId) {
        List<EcheancePaymentResponse> result = creditId != null
                ? echeanceService.getEcheancesByCreditId(creditId)
                : echeanceService.getEcheancesByUserId(userId);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @GetMapping("/by-credit/{creditId}")
    public ResponseEntity<List<EcheancePaymentResponse>> getEcheancesByCreditId(@PathVariable Long creditId) {
        return new ResponseEntity<>(echeanceService.getEcheancesByCreditId(creditId), HttpStatus.OK);
    }
}

