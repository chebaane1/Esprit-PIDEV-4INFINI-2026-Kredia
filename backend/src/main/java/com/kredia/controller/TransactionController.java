package com.kredia.controller;

import com.kredia.entity.wallet.Transaction;
import com.kredia.enums.TransactionStatus;
import com.kredia.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    @Autowired
    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','CLIENT')")
    @PostMapping
    public ResponseEntity<Transaction> createTransaction(@RequestBody Transaction transaction,
                                                         Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Transaction createdTransaction = isAdmin(authentication)
                ? transactionService.createTransaction(transaction)
                : transactionService.createTransactionForClient(transaction, userId);
        return new ResponseEntity<>(createdTransaction, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable Long id) {
        return transactionService.getTransaction(id)
                .map(transaction -> new ResponseEntity<>(transaction, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        List<Transaction> transactions = transactionService.getAllTransactions();
        return new ResponseEntity<>(transactions, HttpStatus.OK);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public ResponseEntity<List<Transaction>> getMyTransactions(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return new ResponseEntity<>(transactionService.getTransactionsByUser(userId), HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(@PathVariable Long id, @RequestBody Transaction transactionDetails) {
        try {
            Transaction updatedTransaction = transactionService.updateTransaction(id, transactionDetails);
            return new ResponseEntity<>(updatedTransaction, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Transaction> updateTransactionStatus(@PathVariable Long id, @RequestParam TransactionStatus status) {
        try {
            Transaction updatedTransaction = transactionService.updateTransactionStatus(id, status);
            return new ResponseEntity<>(updatedTransaction, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        try {
            transactionService.deleteTransaction(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }
}
