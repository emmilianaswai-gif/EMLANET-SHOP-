package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.User;
import com.example.EMLANET_SHOP.Repository.UserRepository;
import com.example.EMLANET_SHOP.Service.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Map<String, OtpEntry> otpStore = new HashMap<>();

    private static class OtpEntry {
        String otp;
        LocalDateTime expiresAt;
        OtpEntry(String otp) { this.otp = otp; this.expiresAt = LocalDateTime.now().plusMinutes(10); }
    }

    public AuthController(AuthService authService, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        return authService.login(username, password);
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> body) {
        return authService.register(
                body.get("shopName"),
                body.get("shopAddress") != null ? body.get("shopAddress") : body.get("address"),
                body.get("shopPhone") != null ? body.get("shopPhone") : body.get("phone"),
                body.get("shopLocation") != null ? body.get("shopLocation") : body.get("location"),
                body.get("username"),
                body.get("password"),
                body.get("fullName"),
                body.get("email"),
                body.get("phone"));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        }
        authService.logout(token);
        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Logged out");
        return resp;
    }

    @PostMapping("/forgot-password")
    public Map<String, Object> forgotPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        Map<String, Object> resp = new HashMap<>();
        if (username == null || username.isBlank()) {
            resp.put("message", "Username/email is required");
            return resp;
        }
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            user = userRepository.findAll().stream()
                .filter(u -> username.equalsIgnoreCase(u.getEmail()))
                .findFirst().orElse(null);
        }
        if (user == null) {
            resp.put("message", "Account not found");
            return resp;
        }
        String otp = String.format("%06d", new Random().nextInt(999999));
        otpStore.put(user.getUsername(), new OtpEntry(otp));
        System.out.println("=== OTP for " + user.getUsername() + ": " + otp + " ===");
        resp.put("message", "OTP sent to your email/phone (dev: " + otp + ")");
        return resp;
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");
        Map<String, Object> resp = new HashMap<>();
        if (username == null || otp == null || newPassword == null) {
            resp.put("message", "Missing required fields");
            return resp;
        }
        OtpEntry entry = otpStore.get(username);
        if (entry == null) {
            resp.put("message", "No OTP requested. Please request forgot password first.");
            return resp;
        }
        if (entry.expiresAt.isBefore(LocalDateTime.now())) {
            otpStore.remove(username);
            resp.put("message", "OTP has expired. Please request a new one.");
            return resp;
        }
        if (!entry.otp.equals(otp)) {
            resp.put("message", "Invalid OTP");
            return resp;
        }
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            resp.put("message", "User not found");
            return resp;
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPlainPassword(newPassword);
        userRepository.save(user);
        otpStore.remove(username);
        resp.put("message", "Password reset successful");
        return resp;
    }

    @GetMapping("/debug-users")
    public java.util.List<Map<String, Object>> debugUsers() {
        var users = userRepository.findAll();
        return users.stream().map(u -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("role", u.getRole());
            m.put("plainPassword", u.getPlainPassword());
            m.put("encodedPassword", u.getPassword());
            return m;
        }).toList();
    }
}
