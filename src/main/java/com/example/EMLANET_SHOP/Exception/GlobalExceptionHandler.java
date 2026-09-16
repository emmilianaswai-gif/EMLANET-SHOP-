package com.example.EMLANET_SHOP.Exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "status", 404,
                "message", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409,
                "message", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "status", 400,
                "message", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("DataIntegrityViolation", ex);
        String message = "A database constraint was violated";
        String rootMsg = ex.getRootCause() != null ? ex.getRootCause().getMessage() : "";
        if (rootMsg.contains("email")) {
            message = "Email already exists";
        } else if (rootMsg.contains("username")) {
            message = "Username already exists";
        } else if (rootMsg.contains("unique") || rootMsg.contains("duplicate")) {
            message = "Duplicate entry — a record with this value already exists";
        } else if (rootMsg.length() > 0) {
            message = rootMsg.length() > 200 ? rootMsg.substring(0, 200) : rootMsg;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409,
                "message", message,
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "status", 404,
                "message", "Resource not found",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "status", 400,
                "message", "Malformed JSON request body",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        String message = ex.getMessage();
        if (message != null && message.length() > 500) {
            message = message.substring(0, 500);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", 500,
                "message", message != null ? message : "An unexpected error occurred",
                "type", ex.getClass().getSimpleName(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
