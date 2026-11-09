package com.kredia.controller;

import com.kredia.dto.wallet.VirtualCardExternalPaymentRequest;
import com.kredia.dto.wallet.VirtualCardExternalPaymentResponse;
import com.kredia.dto.wallet.WalletAmountRequest;
import com.kredia.entity.wallet.VirtualCard;
import com.kredia.entity.wallet.Wallet;
import com.kredia.service.PaypalService;
import com.kredia.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

    private final WalletService walletService;
    private final PaypalService paypalService;

    @Autowired
    public WalletController(WalletService walletService, PaypalService paypalService) {
        this.walletService = walletService;
        this.paypalService = paypalService;
    }

    @io.swagger.v3.oas.annotations.Operation(summary = "Create a new wallet", description = "Creates a wallet for an existing user")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Wallet created successfully")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Wallet> createWallet(@RequestBody Wallet wallet) {
        Wallet createdWallet = walletService.createWallet(wallet);
        return new ResponseEntity<>(createdWallet, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping
    public ResponseEntity<List<Wallet>> getAllWallets() {
        return new ResponseEntity<>(walletService.getAllWallets(), HttpStatus.OK);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public ResponseEntity<List<Wallet>> getMyWallets(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return new ResponseEntity<>(walletService.getWalletsByUser(userId), HttpStatus.OK);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Wallet>> getWalletsByUser(@PathVariable Long userId) {
        return new ResponseEntity<>(walletService.getWalletsByUser(userId), HttpStatus.OK);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/unfreeze")
    public ResponseEntity<Void> unfreezeWallet(@PathVariable Long id) {
        try {
            walletService.unfreezeWallet(id);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Wallet> updateWallet(@PathVariable Long id, @RequestBody Wallet walletDetails) {
        try {
            Wallet updatedWallet = walletService.updateWallet(id, walletDetails);
            return new ResponseEntity<>(updatedWallet, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWallet(@PathVariable Long id) {
        try {
            walletService.deleteWallet(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','CLIENT')")
    @PostMapping("/{id}/deposit")
    public ResponseEntity<?> deposit(@PathVariable Long id,
                                     @Valid @RequestBody WalletAmountRequest request,
                                     Authentication authentication) {
        ensureWalletAccess(id, authentication);
        try {
            return new ResponseEntity<>(walletService.deposit(id, request.amount()), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(Map.of("message", e.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','CLIENT')")
    @PostMapping("/{id}/withdraw")
    public ResponseEntity<?> withdraw(@PathVariable Long id,
                                      @Valid @RequestBody WalletAmountRequest request,
                                      Authentication authentication) {
        ensureWalletAccess(id, authentication);
        try {
            return new ResponseEntity<>(walletService.withdraw(id, request.amount()), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(Map.of("message", e.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/freeze")
    public ResponseEntity<Void> freezeWallet(@PathVariable Long id) {
        try {
            walletService.freezeWallet(id);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @io.swagger.v3.oas.annotations.Operation(
            summary = "Generate a virtual card for a wallet",
            description = "Creates a new virtual card linked to the specified wallet using the PayPal integration"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201",
            description = "Virtual card generated successfully"
    )
    @PreAuthorize("hasAnyRole('ADMIN','CLIENT')")
    @PostMapping("/{id}/virtual-card")
    public ResponseEntity<VirtualCard> generateVirtualCard(@PathVariable("id") Long walletId,
                                                           Authentication authentication) {
        ensureWalletAccess(walletId, authentication);
        try {
            VirtualCard virtualCard = paypalService.generateVirtualCard(walletId);
            return new ResponseEntity<>(virtualCard, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get virtual cards for a wallet",
            description = "Returns all virtual cards linked to the specified wallet"
    )
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/virtual-cards")
    public ResponseEntity<List<VirtualCard>> getVirtualCardsByWallet(@PathVariable("id") Long walletId,
                                                                     Authentication authentication) {
        ensureWalletAccess(walletId, authentication);
        return new ResponseEntity<>(paypalService.getVirtualCardsByWalletId(walletId), HttpStatus.OK);
    }

    @io.swagger.v3.oas.annotations.Operation(
            summary = "Create an external payment using a virtual card",
            description = "Uses virtual card details to pay external bodies and returns a PayPal approval link or confirmation"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "External payment created successfully"
    )
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/virtual-cards/{virtualCardId}/external-payment")
    public ResponseEntity<?> createExternalPayment(
            @PathVariable Long virtualCardId,
            @Valid @RequestBody VirtualCardExternalPaymentRequest request
    ) {
        try {
            VirtualCardExternalPaymentResponse paymentResponse = paypalService.createExternalPayment(
                    virtualCardId,
                    request.cardNumber(),
                    request.cvv(),
                    request.expiryDate(),
                    request.amount()
            );
            return new ResponseEntity<>(paymentResponse, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(Map.of("message", e.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    private void ensureWalletAccess(Long walletId, Authentication authentication) {
        boolean privileged = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())
                        || "ROLE_SUPER_ADMIN".equals(a.getAuthority())
                        || "ROLE_AGENT".equals(a.getAuthority()));
        if (privileged) {
            return;
        }
        Long userId = (Long) authentication.getPrincipal();
        boolean owns = walletService.getWalletsByUser(userId).stream()
                .anyMatch(w -> walletId.equals(w.getWalletId()));
        if (!owns) {
            throw new AccessDeniedException("This wallet does not belong to the current user");
        }
    }

}
