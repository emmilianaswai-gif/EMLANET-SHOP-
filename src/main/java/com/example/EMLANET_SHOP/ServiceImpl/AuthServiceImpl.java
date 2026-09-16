package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.AuthToken;
import com.example.EMLANET_SHOP.Entity.Role;
import com.example.EMLANET_SHOP.Entity.Shop;
import com.example.EMLANET_SHOP.Entity.User;
import com.example.EMLANET_SHOP.Repository.AuthTokenRepository;
import com.example.EMLANET_SHOP.Repository.ShopRepository;
import com.example.EMLANET_SHOP.Repository.UserRepository;
import com.example.EMLANET_SHOP.Service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int TOKEN_DAYS = 7;

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final AuthTokenRepository authTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Map<String, Object> login(String username, String password) {
        Map<String, Object> errorResponse = new HashMap<>();

        System.out.println("=== LOGIN ATTEMPT: username=" + username + " ===");

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            System.out.println("=== LOGIN FAILED: User not found for username=" + username + " ===");
            errorResponse.put("message", "Invalid username or password");
            return errorResponse;
        }

        System.out.println("=== LOGIN: Found user=" + user.getUsername() + " role=" + user.getRole() + " ===");
        System.out.println("=== LOGIN: Stored password starts with=" + (user.getPassword() != null ? user.getPassword().substring(0, Math.min(7, user.getPassword().length())) : "null") + " ===");

        if (!passwordEncoder.matches(password, user.getPassword())) {
            System.out.println("=== LOGIN FAILED: Password mismatch for user=" + username + " ===");
            errorResponse.put("message", "Invalid username or password");
            return errorResponse;
        }

        System.out.println("=== LOGIN SUCCESS: user=" + username + " role=" + user.getRole() + " ===");

        if (user.getIsEnabled() != null && !user.getIsEnabled()) {
            errorResponse.put("message", "Account is disabled");
            return errorResponse;
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = UUID.randomUUID().toString();
        persistToken(token, user.getId(), user.getShopId(), user.getRole() != null ? user.getRole().name() : "user");

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole() != null ? user.getRole().toValue() : "user");
        response.put("avatar", user.getAvatar());
        response.put("shopId", user.getShopId());
        String shopName = null;
        if (user.getShopId() != null) {
            shopName = shopRepository.findById(user.getShopId()).map(com.example.EMLANET_SHOP.Entity.Shop::getName).orElse(null);
        }
        response.put("shopName", shopName);

        return response;
    }

    @Override
    public Map<String, Object> register(String shopName, String shopAddress, String shopPhone, String shopLocation,
                                        String username, String password, String fullName, String email, String phone) {
        Map<String, Object> errorResponse = new HashMap<>();

        if (shopName == null || shopName.isBlank()) {
            errorResponse.put("message", "Shop name is required");
            return errorResponse;
        }
        if (username == null || username.isBlank()) {
            errorResponse.put("message", "Username is required");
            return errorResponse;
        }
        if (password == null || password.length() < 4) {
            errorResponse.put("message", "Password must be at least 4 characters");
            return errorResponse;
        }
        if (userRepository.findByUsername(username.trim()).isPresent()) {
            errorResponse.put("message", "Username is already taken");
            return errorResponse;
        }

        Shop shop = Shop.builder()
                .name(shopName.trim())
                .address(blankToNull(shopAddress))
                .phone(blankToNull(shopPhone))
                .location(blankToNull(shopLocation))
                .build();
        shop = shopRepository.save(shop);

        User user = User.builder()
                .username(username.trim())
                .password(password)
                .plainPassword(password)
                .fullName(fullName != null && !fullName.isBlank() ? fullName.trim() : "Administrator")
                .email(blankToNull(email))
                .phone(blankToNull(phone))
                .role(Role.ADMIN)
                .isEnabled(true)
                .status("active")
                .shopId(shop.getId())
                .build();
        user.setPassword(passwordEncoder.encode(password));
        user = userRepository.save(user);

        String token = UUID.randomUUID().toString();
        persistToken(token, user.getId(), shop.getId(), Role.ADMIN.name());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", "admin");
        response.put("shopId", shop.getId());
        response.put("shopName", shop.getName());
        return response;
    }

    @Override
    @Transactional
    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            authTokenRepository.deleteByToken(token);
        }
    }

    private void persistToken(String token, Long userId, Long shopId, String role) {
        LocalDateTime now = LocalDateTime.now();
        authTokenRepository.save(AuthToken.builder()
                .token(token)
                .userId(userId)
                .shopId(shopId)
                .role(role)
                .createdAt(now)
                .expiresAt(now.plusDays(TOKEN_DAYS))
                .build());
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
