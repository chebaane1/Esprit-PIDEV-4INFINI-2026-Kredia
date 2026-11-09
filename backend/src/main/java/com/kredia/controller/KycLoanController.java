package com.kredia.controller;

import com.kredia.dto.kyc.KycLoanResponse;
import com.kredia.enums.DocumentTypeLoan;
import com.kredia.service.KycLoanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/kyc-loans")
public class KycLoanController {

    private final KycLoanService kycLoanService;

    @Autowired
    public KycLoanController(KycLoanService kycLoanService) {
        this.kycLoanService = kycLoanService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("creditId") Long creditId,
            @RequestParam("userId") Long userId,
            @RequestParam("documentType") DocumentTypeLoan documentType,
            @RequestParam("file") MultipartFile file) {
        try {
            KycLoanResponse response = kycLoanService.uploadDocument(creditId, userId, documentType, file);
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/credits/{creditId}/create-from-url")
    public ResponseEntity<?> createFromUrl(@PathVariable Long creditId, @RequestBody Map<String, Object> request) {
        try {
            DocumentTypeLoan documentType = DocumentTypeLoan.valueOf(request.get("document_type").toString());
            String documentPath = request.get("document_path").toString();
            
            KycLoanResponse response = kycLoanService.createFromUrl(creditId, documentType, documentPath);
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/credit/{creditId}")
    public ResponseEntity<List<KycLoanResponse>> getDocumentsByCredit(@PathVariable Long creditId) {
        return new ResponseEntity<>(kycLoanService.getDocumentsByCredit(creditId), HttpStatus.OK);
    }

    @GetMapping("/{kycLoanId}")
    public ResponseEntity<?> getDocumentById(@PathVariable Long kycLoanId) {
        try {
            return new ResponseEntity<>(kycLoanService.getDocumentById(kycLoanId), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<List<KycLoanResponse>> getAllDocuments() {
        return new ResponseEntity<>(kycLoanService.getAllDocuments(), HttpStatus.OK);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PutMapping("/{kycLoanId}/approve")
    public ResponseEntity<?> approveDocument(@PathVariable Long kycLoanId) {
        try {
            return new ResponseEntity<>(kycLoanService.manuallyApprove(kycLoanId), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PutMapping("/{kycLoanId}/reject")
    public ResponseEntity<?> rejectDocument(@PathVariable Long kycLoanId) {
        try {
            return new ResponseEntity<>(kycLoanService.manuallyReject(kycLoanId), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PutMapping("/{kycLoanId}/verify")
    public ResponseEntity<?> forceVerification(@PathVariable Long kycLoanId) {
        try {
            KycLoanResponse response = kycLoanService.forceVerification(kycLoanId);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<List<KycLoanResponse>> getDocumentsByUser(@PathVariable Long userId) {
        return new ResponseEntity<>(kycLoanService.getDocumentsByUser(userId), HttpStatus.OK);
    }

    @GetMapping("/by-demande/{demandeId}")
    public ResponseEntity<List<KycLoanResponse>> getDocumentsByDemande(@PathVariable Long demandeId) {
        return new ResponseEntity<>(kycLoanService.getDocumentsByDemande(demandeId), HttpStatus.OK);
    }

    /**
     * Admin utility: fix credit_id for all KYC loans linked to approved demandes
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/fix-credit-links")
    public ResponseEntity<String> fixCreditLinks() {
        int updated = kycLoanService.fixCreditLinksForApprovedDemandes();
        return ResponseEntity.ok("Updated " + updated + " KYC loan(s)");
    }
}
