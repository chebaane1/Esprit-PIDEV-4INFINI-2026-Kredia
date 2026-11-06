package com.kredia.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<?> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage(), 404));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<?> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error(ex.getMessage(), 400));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> body = error("Validation failed", 400);
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fieldErrors.put(e.getField(), e.getDefaultMessage()));
        body.put("fields", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<?> handleConstraint(ConstraintViolationException ex) {
        return ResponseEntity.badRequest().body(error(ex.getMessage(), 400));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<?> handleMissingPart(MissingServletRequestPartException ex) {
        return ResponseEntity.badRequest().body(error("Missing multipart part: " + ex.getRequestPartName(), 400));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(ex.getMessage(), 403));
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<?> handleUnauthenticated(org.springframework.security.core.AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error(ex.getMessage(), 401));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleOther(Exception ex) {
        return ResponseEntity.status(500).body(error("Internal Server Error: " + ex.getMessage(), 500));
    }

    private Map<String, Object> error(String message, int status) {
        Map<String, Object> m = new HashMap<>();
        m.put("timestamp", Instant.now().toString());
        m.put("status", status);
        m.put("message", message);
        return m;
    }
}
