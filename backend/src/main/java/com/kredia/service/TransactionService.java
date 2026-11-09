package com.kredia.service;

import com.kredia.entity.wallet.Transaction;
import com.kredia.entity.wallet.Wallet;
import com.kredia.enums.TransactionStatus;
import com.kredia.repository.TransactionRepository;
import com.kredia.repository.WalletRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.kredia.service.EcheanceService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final TransactionAuditLogService auditLogService;
    private final FraudDetectionService fraudDetectionService;

    @Autowired
    public TransactionService(TransactionRepository transactionRepository, 
                              WalletRepository walletRepository,
                              TransactionAuditLogService auditLogService,
                              FraudDetectionService fraudDetectionService) {
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
        this.auditLogService = auditLogService;
        this.fraudDetectionService = fraudDetectionService;
    }

    public Transaction createTransaction(Transaction transaction) {
        if (transaction.getSourceWallet() == null || transaction.getSourceWallet().getWalletId() == null) {
            throw new IllegalArgumentException("Source wallet must be provided");
        }
        Wallet sourceWallet = walletRepository.findById(transaction.getSourceWallet().getWalletId())
                .orElseThrow(() -> new RuntimeException("Source wallet not found"));
        transaction.setSourceWallet(sourceWallet);

        if (transaction.getDestinationWallet() != null && transaction.getDestinationWallet().getWalletId() != null) {
            Wallet destinationWallet = walletRepository.findById(transaction.getDestinationWallet().getWalletId())
                    .orElseThrow(() -> new RuntimeException("Destination wallet not found"));
            transaction.setDestinationWallet(destinationWallet);
        }

        if (transaction.getTransactionDate() == null) {
            transaction.setTransactionDate(LocalDateTime.now());
        }

        // Initial status is PENDING
        if (transaction.getStatus() == null) {
            transaction.setStatus(TransactionStatus.PENDING);
        }

        // --- Core processing logic ---
        if (transaction.getAmount() == null || transaction.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        // Check if there is enough balance
        if (sourceWallet.getBalance().compareTo(transaction.getAmount()) < 0) {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setDescription("Insufficient balance");

        } else if (sourceWallet.getWalletId().equals(transaction.getDestinationWallet() != null ? transaction.getDestinationWallet().getWalletId() : null)) {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setDescription("Cannot transfer to the same wallet");
        } else {
            // Subtract from source
            sourceWallet.setBalance(sourceWallet.getBalance().subtract(transaction.getAmount()));
            sourceWallet.setUpdatedAt(LocalDateTime.now());
            walletRepository.save(sourceWallet);

            // Add to destination (if it exists)
            if (transaction.getDestinationWallet() != null) {
                 Wallet destWallet = transaction.getDestinationWallet();
                 destWallet.setBalance(destWallet.getBalance().add(transaction.getAmount()));
                 destWallet.setUpdatedAt(LocalDateTime.now());
                 walletRepository.save(destWallet);
            }


            transaction.setStatus(TransactionStatus.COMPLETED);
        }
        // --- End of processing logic ---

        Transaction savedTransaction = transactionRepository.save(transaction);
        
        // Audit the transaction (including the result status)

        // Audit the transaction
        auditLogService.auditTransaction(savedTransaction);

        // Analyze for fraud
        fraudDetectionService.analyzeTransaction(savedTransaction);


        return savedTransaction;
    }

    public Transaction updateTransactionStatus(Long transactionId, TransactionStatus status) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        transaction.setStatus(status);
        Transaction updatedTransaction = transactionRepository.save(transaction);

        // Audit the status change
        auditLogService.auditTransaction(updatedTransaction);

        return updatedTransaction;
    }

    public Transaction updateTransaction(Long transactionId, Transaction newTransactionDetails) {
        return transactionRepository.findById(transactionId).map(transaction -> {
            if (newTransactionDetails.getAmount() != null) {
                transaction.setAmount(newTransactionDetails.getAmount());
            }
            if (newTransactionDetails.getStatus() != null) {
                transaction.setStatus(newTransactionDetails.getStatus());
            }
            if (newTransactionDetails.getDescription() != null) {
                transaction.setDescription(newTransactionDetails.getDescription());
            }
            if (newTransactionDetails.getReference() != null) {
                transaction.setReference(newTransactionDetails.getReference());
            }
            return transactionRepository.save(transaction);
        }).orElseThrow(() -> new RuntimeException("Transaction not found"));
    }

    public void deleteTransaction(Long transactionId) {
        if (!transactionRepository.existsById(transactionId)) {
            throw new RuntimeException("Transaction not found");
        }
        transactionRepository.deleteById(transactionId);
    }

    public Optional<Transaction> getTransaction(Long transactionId) {
        return transactionRepository.findById(transactionId);
    }

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

    public List<Transaction> getTransactionsByUser(Long userId) {
        return transactionRepository.findBySourceWallet_User_IdOrDestinationWallet_User_Id(userId, userId);
    }

    /**
     * Creates a transaction on behalf of a client: the source wallet must belong to that client.
     */
    public Transaction createTransactionForClient(Transaction transaction, Long userId) {
        if (transaction.getSourceWallet() == null || transaction.getSourceWallet().getWalletId() == null) {
            throw new IllegalArgumentException("Source wallet must be provided");
        }
        Wallet sourceWallet = walletRepository.findById(transaction.getSourceWallet().getWalletId())
                .orElseThrow(() -> new RuntimeException("Source wallet not found"));
        if (sourceWallet.getUser() == null || !userId.equals(sourceWallet.getUser().getUserId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Source wallet does not belong to the current user");
        }
        return createTransaction(transaction);
    }
}