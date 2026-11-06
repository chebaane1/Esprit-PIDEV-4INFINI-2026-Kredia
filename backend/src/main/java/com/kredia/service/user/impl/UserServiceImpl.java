package com.kredia.service.user.impl;

import com.kredia.dto.user.*;
import com.kredia.entity.user.*;
import com.kredia.repository.user.UserActivityRepository;
import com.kredia.repository.user.UserRepository;
import com.kredia.service.user.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.criteria.Predicate;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserActivityRepository userActivityRepository;

    public UserServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           UserActivityRepository userActivityRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userActivityRepository = userActivityRepository;
    }

    @Override
    public UserResponseDTO create(Long actorId, UserRequestDTO request) {
        if (userRepository.existsByEmailAndDeletedFalse(request.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(request.getRole() != null ? request.getRole() : UserRole.CLIENT);
        user.setStatus(request.getStatus() != null ? request.getStatus() : UserStatus.ACTIVE);
        if (request.getPassword() != null) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO getById(Long actorId, Long id) {
        return toDto(findUser(id));
    }

    @Override
    public Page<UserResponseDTO> search(Long actorId, Optional<String> email, Optional<UserStatus> status,
                                         Optional<UserRole> role, Optional<Instant> createdFrom,
                                         Optional<Instant> createdTo, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("deleted"), false));
        email.ifPresent(value -> predicates.add(cb.like(cb.lower(root.get("email")), "%" + value.toLowerCase() + "%")));
        status.ifPresent(value -> predicates.add(cb.equal(root.get("status"), value)));
        role.ifPresent(value -> predicates.add(cb.equal(root.get("role"), value)));
        createdFrom.ifPresent(value -> predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), value)));
        createdTo.ifPresent(value -> predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), value)));
        return cb.and(predicates.toArray(new Predicate[0]));
    };
    return userRepository.findAll(spec, pageable).map(this::toDto);
    }

    @Override
    public UserResponseDTO update(Long actorId, Long id, UserRequestDTO payload) {
        User user = findUser(id);
        user.setEmail(payload.getEmail());
        user.setFirstName(payload.getFirstName());
        user.setLastName(payload.getLastName());
        user.setPhoneNumber(payload.getPhoneNumber());
        if (payload.getRole() != null) user.setRole(payload.getRole());
        if (payload.getStatus() != null) user.setStatus(payload.getStatus());
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO updateProfile(Long actorId, Long id, ClientProfileUpdateDTO payload) {
        User user = findUser(id);
        if (payload.getFirstName() != null) user.setFirstName(payload.getFirstName());
        if (payload.getLastName() != null) user.setLastName(payload.getLastName());
        if (payload.getPhoneNumber() != null) user.setPhoneNumber(payload.getPhoneNumber());
        if (payload.getDateOfBirth() != null) user.setDateOfBirth(payload.getDateOfBirth());
        if (payload.getAddress() != null) user.setAddress(payload.getAddress());
        if (payload.getGender() != null) user.setGender(payload.getGender());
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO adminUpdateUser(Long actorId, Long id, AdminUserUpdateDTO payload) {
        User user = findUser(id);
        if (payload.getRole() != null) user.setRole(payload.getRole());
        if (payload.getStatus() != null) user.setStatus(payload.getStatus());
        return toDto(userRepository.save(user));
    }

    @Override
    public void delete(Long actorId, Long id) {
        User user = findUser(id);
        user.setDeleted(true);
        userRepository.save(user);
    }

    @Override
    public UserResponseDTO restore(Long actorId, Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setDeleted(false);
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO block(Long actorId, Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.BLOCKED);
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO suspend(Long actorId, Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.SUSPENDED);
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO activate(Long actorId, Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.ACTIVE);
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO deactivate(Long actorId, Long id) {
        User user = findUser(id);
        user.setStatus(UserStatus.INACTIVE);
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO changeRole(Long actorId, Long id, UserRole role) {
        User user = findUser(id);
        user.setRole(role);
        return toDto(userRepository.save(user));
    }

    @Override
    public UserResponseDTO assignClientToAgent(Long actorId, Long agentId, Long clientId) {
        User agent = findUser(agentId);
        User client = findUser(clientId);
        client.setAssignedAgent(agent);
        return toDto(userRepository.save(client));
    }

    @Override
    public UserResponseDTO unassignClient(Long actorId, Long clientId) {
        User client = findUser(clientId);
        client.setAssignedAgent(null);
        return toDto(userRepository.save(client));
    }

    @Override
    public void bulkDelete(Long actorId, List<Long> ids) {
        ids.forEach(id -> {
            userRepository.findByIdAndDeletedFalse(id).ifPresent(u -> {
                u.setDeleted(true);
                userRepository.save(u);
            });
        });
    }

    @Override
    public void bulkUpdateStatus(Long actorId, List<Long> ids, UserStatus status) {
        ids.forEach(id -> userRepository.findByIdAndDeletedFalse(id).ifPresent(u -> {
            u.setStatus(status);
            userRepository.save(u);
        }));
    }

    @Override
    public AdminStatsDTO adminStats(Long actorId) {
        AdminStatsDTO dto = new AdminStatsDTO();
        dto.setTotalUser(userRepository.countByDeletedFalse());
        dto.setTotalClient(userRepository.countByRoleAndDeletedFalse(UserRole.CLIENT));
        dto.setTotalAgent(userRepository.countByRoleAndDeletedFalse(UserRole.AGENT));
        dto.setActiveUser(userRepository.countByStatusAndDeletedFalse(UserStatus.ACTIVE));
        dto.setBlockedUser(userRepository.countByStatusAndDeletedFalse(UserStatus.BLOCKED));
        dto.setSuspendedUser(userRepository.countByStatusAndDeletedFalse(UserStatus.SUSPENDED));
        return dto;
    }

    @Override
    public Page<UserResponseDTO> adminAgent(Long actorId, Pageable pageable) {
        return userRepository.findAllByRoleAndDeletedFalse(UserRole.AGENT, pageable).map(this::toDto);
    }

    @Override
    public Page<UserResponseDTO> adminClient(Long actorId, Pageable pageable) {
        return userRepository.findAllByRoleAndDeletedFalse(UserRole.CLIENT, pageable).map(this::toDto);
    }

    @Override
    public Page<UserResponseDTO> agentClients(Long actorId, Optional<String> email, Optional<UserStatus> status, Pageable pageable) {
        User agent = findUser(actorId);
        return userRepository.findAllByAssignedAgentAndDeletedFalse(agent, pageable).map(this::toDto);
    }

    @Override
    public Page<UserActivityResponseDTO> adminAudit(Long actorId, Long userId, Pageable pageable) {
        return userActivityRepository.findByUserIdOrderByTimestampAsc(userId, pageable).map(this::toActivityDto);
    }

    @Override
    public Page<UserActivityResponseDTO> adminActivityByRole(Long actorId, Optional<UserRole> role, Pageable pageable) {
        return userActivityRepository.findAllByOrderByTimestampDesc(pageable).map(this::toActivityDto);
    }

    @Override
    public AgentPerformanceDTO agentDashboard(Long agentId) {
        AgentPerformanceDTO dto = new AgentPerformanceDTO();
        return dto;
    }

    @Override
    public AgentPerformanceDTO agentPerformance(Long agentId) {
        return agentDashboard(agentId);
    }

    @Override
    public Page<UserActivityResponseDTO> agentActivity(Long agentId, Pageable pageable) {
        return userActivityRepository.findByUserIdOrderByTimestampAsc(agentId, pageable).map(this::toActivityDto);
    }

    @Override
    public UserResponseDTO clientProfile(Long clientId) {
        return toDto(findUser(clientId));
    }

    @Override
    public Page<UserActivityResponseDTO> clientActivity(Long clientId, Pageable pageable) {
        return userActivityRepository.findByUserIdOrderByTimestampAsc(clientId, pageable).map(this::toActivityDto);
    }

    @Override
    public ClientRiskScoreDTO clientRiskScore(Long clientId) {
        ClientRiskScoreDTO dto = new ClientRiskScoreDTO();
        dto.setRiskScore(0);
        return dto;
    }

    @Override
    public ClientEligibilityDTO clientEligibility(Long clientId) {
        ClientEligibilityDTO dto = new ClientEligibilityDTO();
        dto.setEligible(true);
        return dto;
    }

    // --- Helpers ---

    private User findUser(Long id) {
        return userRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    private UserResponseDTO toDto(User user) {
        UserResponseDTO dto = new UserResponseDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());
        dto.setEmailVerified(user.isEmailVerified());
        dto.setDeleted(user.isDeleted());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setAddress(user.getAddress());
        dto.setGender(user.getGender());
        if (user.getAssignedAgent() != null) {
            dto.setAssignedAgentId(user.getAssignedAgent().getId());
            dto.setAssignedAgentName(user.getAssignedAgent().getFirstName() + " " + user.getAssignedAgent().getLastName());
        }
        return dto;
    }

    private UserActivityResponseDTO toActivityDto(com.kredia.entity.user.UserActivity a) {
        UserActivityResponseDTO dto = new UserActivityResponseDTO();
        dto.setId(a.getId());
        dto.setUserId(a.getUserId());
        dto.setActionType(a.getActionType());
        dto.setTimestamp(a.getTimestamp());
        return dto;
    }
}
