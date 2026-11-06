package com.kredia.controller;

import com.kredia.entity.wallet.TransactionAuditLog;
import com.kredia.service.TransactionAuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
public class TransactionAuditLogController {

    private final TransactionAuditLogService auditLogService;

    @Autowired
    public TransactionAuditLogController(TransactionAuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @PostMapping
    public ResponseEntity<TransactionAuditLog> createAuditLog(@RequestBody TransactionAuditLog auditLog) {
        TransactionAuditLog createdLog = auditLogService.createAuditLog(auditLog);
        return new ResponseEntity<>(createdLog, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionAuditLog> getAuditLogById(@PathVariable Long id) {
        return auditLogService.getAuditLog(id)
                .map(log -> new ResponseEntity<>(log, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping
    public ResponseEntity<List<TransactionAuditLog>> getAllAuditLogs() {
        List<TransactionAuditLog> logs = auditLogService.getAllAuditLogs();
        return new ResponseEntity<>(logs, HttpStatus.OK);
    }

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<List<TransactionAuditLog>> getAuditLogsByTransactionId(@PathVariable Long transactionId) {
        List<TransactionAuditLog> logs = auditLogService.getAuditLogsByTransactionId(transactionId);
        return new ResponseEntity<>(logs, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionAuditLog> updateAuditLog(@PathVariable Long id, @RequestBody TransactionAuditLog logDetails) {
        try {
            TransactionAuditLog updatedLog = auditLogService.updateAuditLog(id, logDetails);
            return new ResponseEntity<>(updatedLog, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAuditLog(@PathVariable Long id) {
        try {
            auditLogService.deleteAuditLog(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}
