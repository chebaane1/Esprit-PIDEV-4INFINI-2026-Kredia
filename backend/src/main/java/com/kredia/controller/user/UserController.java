package com.kredia.controller.user;

import com.kredia.dto.ApiResponse;
import com.kredia.dto.user.AdminStatsDTO;
import com.kredia.dto.user.AgentPerformanceDTO;
import com.kredia.dto.user.ClientEligibilityDTO;
import com.kredia.dto.user.ClientRiskScoreDTO;
import com.kredia.dto.user.UserActivityResponseDTO;
import com.kredia.dto.user.ClientProfileUpdateDTO;
import com.kredia.dto.user.AdminUserUpdateDTO;
import com.kredia.dto.user.UserRequestDTO;
import com.kredia.dto.user.UserResponseDTO;
import com.kredia.dto.user.UserRoleChangeRequestDTO;
import com.kredia.entity.user.KycDocument;
import com.kredia.enums.DocumentType;
import com.kredia.enums.KycStatus;
import com.kredia.service.user.KycDocumentService;
import com.kredia.service.user.UserService;
import com.kredia.entity.user.UserRole;
import com.kredia.entity.user.UserStatus;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;
    private final KycDocumentService kycDocumentService;

    public UserController(UserService userService, KycDocumentService kycDocumentService) {
        this.userService = userService;
        this.kycDocumentService = kycDocumentService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<UserResponseDTO>> create(
            @RequestHeader("X-Actor-Id") Long actorId,
            @Valid @RequestBody UserRequestDTO user
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(userService.create(actorId, user)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserResponseDTO>>> search(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam(name = "status", required = false) UserStatus status,
            @RequestParam(name = "role", required = false) UserRole role,
            @RequestParam(name = "createdFrom", required = false) Instant createdFrom,
            @RequestParam(name = "createdTo", required = false) Instant createdTo,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                userService.search(
                        actorId,
                        Optional.ofNullable(email),
                        Optional.ofNullable(status),
                        Optional.ofNullable(role),
                        Optional.ofNullable(createdFrom),
                        Optional.ofNullable(createdTo),
                        pageable
                )
        ));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponseDTO>> getById(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getById(actorId, id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponseDTO>> update(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id,
            @Valid @RequestBody UserRequestDTO payload
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.update(actorId, id, payload)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/profile")
    public ResponseEntity<ApiResponse<UserResponseDTO>> updateProfile(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id,
            @Valid @RequestBody ClientProfileUpdateDTO payload
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(actorId, id, payload)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/admin")
    public ResponseEntity<ApiResponse<UserResponseDTO>> adminUpdateUser(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id,
            @Valid @RequestBody AdminUserUpdateDTO payload
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.adminUpdateUser(actorId, id, payload)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        userService.delete(actorId, id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<UserResponseDTO>> restore(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.restore(actorId, id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/block")
    public ResponseEntity<ApiResponse<UserResponseDTO>> block(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.block(actorId, id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<UserResponseDTO>> suspend(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.suspend(actorId, id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<UserResponseDTO>> activate(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.activate(actorId, id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<UserResponseDTO>> deactivate(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.deactivate(actorId, id)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserResponseDTO>> changeRole(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("id") Long id,
            @Valid @RequestBody UserRoleChangeRequestDTO request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.changeRole(actorId, id, request.getRole())));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/assign")
    public ResponseEntity<ApiResponse<UserResponseDTO>> assignClient(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam Long agentId,
            @RequestParam Long clientId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.assignClientToAgent(actorId, agentId, clientId)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/assign")
    public ResponseEntity<ApiResponse<UserResponseDTO>> unassignClient(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam Long clientId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.unassignClient(actorId, clientId)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/bulk-delete")
    public ResponseEntity<ApiResponse<Void>> bulkDelete(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestBody List<Long> ids
    ) {
        userService.bulkDelete(actorId, ids);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/admin/bulk-status")
    public ResponseEntity<ApiResponse<Void>> bulkUpdateStatus(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam UserStatus status,
            @RequestBody List<Long> ids
    ) {
        userService.bulkUpdateStatus(actorId, ids, status);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/stats")
    public ResponseEntity<ApiResponse<AdminStatsDTO>> adminStats(
            @RequestHeader("X-Actor-Id") Long actorId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.adminStats(actorId)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/agents")
    public ResponseEntity<ApiResponse<Page<UserResponseDTO>>> adminAgent(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.adminAgent(actorId, pageable)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/clients")
    public ResponseEntity<ApiResponse<Page<UserResponseDTO>>> adminClient(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.adminClient(actorId, pageable)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/agent/clients")
    public ResponseEntity<ApiResponse<Page<UserResponseDTO>>> agentClients(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam(name = "status", required = false) UserStatus status,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.agentClients(actorId, Optional.ofNullable(email), Optional.ofNullable(status), pageable)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/activities")
    public ResponseEntity<ApiResponse<Page<UserActivityResponseDTO>>> adminActivityByRole(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam(name = "role", required = false) UserRole role,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.adminActivityByRole(actorId, Optional.ofNullable(role), pageable)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/audit/{userId}")
    public ResponseEntity<ApiResponse<Page<UserActivityResponseDTO>>> adminAudit(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("userId") Long userId,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.adminAudit(actorId, userId, pageable)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/agent/{agentId}/dashboard")
    public ResponseEntity<ApiResponse<AgentPerformanceDTO>> agentDashboard(@PathVariable("agentId") Long agentId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.agentDashboard(agentId)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/agent/{agentId}/performance")
    public ResponseEntity<ApiResponse<AgentPerformanceDTO>> agentPerformance(@PathVariable("agentId") Long agentId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.agentPerformance(agentId)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/agent/{agentId}/activity")
    public ResponseEntity<ApiResponse<Page<UserActivityResponseDTO>>> agentActivity(
            @PathVariable("agentId") Long agentId,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.agentActivity(agentId, pageable)));
    }

    @GetMapping("/client/{clientId}/profile")
    public ResponseEntity<ApiResponse<UserResponseDTO>> clientProfile(@PathVariable("clientId") Long clientId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.clientProfile(clientId)));
    }

    @GetMapping("/client/{clientId}/activity")
    public ResponseEntity<ApiResponse<Page<UserActivityResponseDTO>>> clientActivity(
            @PathVariable("clientId") Long clientId,
            @PageableDefault Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(userService.clientActivity(clientId, pageable)));
    }

    @GetMapping("/client/{clientId}/risk-score")
    public ResponseEntity<ApiResponse<ClientRiskScoreDTO>> clientRiskScore(@PathVariable("clientId") Long clientId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.clientRiskScore(clientId)));
    }

    @GetMapping("/client/{clientId}/eligibility")
    public ResponseEntity<ApiResponse<ClientEligibilityDTO>> clientEligibility(@PathVariable("clientId") Long clientId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.clientEligibility(clientId)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/kyc/upload")
    public ResponseEntity<ApiResponse<KycDocument>> uploadKycDocument(
            @RequestHeader("X-Actor-Id") Long actorId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") DocumentType type
    ) {
        return ResponseEntity.ok(ApiResponse.ok(kycDocumentService.uploadDocument(actorId, file, type)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/kyc/{docId}/verify")
    public ResponseEntity<ApiResponse<KycDocument>> verifyKycDocument(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("docId") Long docId,
            @RequestParam("status") KycStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(kycDocumentService.verifyDocument(actorId, docId, status)));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/kyc")
    public ResponseEntity<ApiResponse<List<KycDocument>>> getMyKycDocuments(
            @RequestHeader("X-Actor-Id") Long actorId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(kycDocumentService.getDocumentsByUser(actorId, actorId)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/kyc/user/{userId}")
    public ResponseEntity<ApiResponse<List<KycDocument>>> getKycDocumentsByUser(
            @RequestHeader("X-Actor-Id") Long actorId,
            @PathVariable("userId") Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(kycDocumentService.getDocumentsByUser(actorId, userId)));
    }
}
