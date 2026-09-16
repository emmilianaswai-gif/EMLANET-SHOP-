package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.ProfileSetting;
import com.example.EMLANET_SHOP.Entity.SystemSetting;
import com.example.EMLANET_SHOP.Entity.User;
import com.example.EMLANET_SHOP.Repository.ProfileSettingRepository;
import com.example.EMLANET_SHOP.Repository.SystemSettingRepository;
import com.example.EMLANET_SHOP.Repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileSettingRepository profileRepo;
    private final UserRepository userRepo;
    private final SystemSettingRepository settingRepo;

    public ProfileController(ProfileSettingRepository profileRepo, UserRepository userRepo, SystemSettingRepository settingRepo) {
        this.profileRepo = profileRepo;
        this.userRepo = userRepo;
        this.settingRepo = settingRepo;
    }

    @PutMapping("/settings")
    public Map<String, String> saveSettings(@RequestBody Map<String, Object> settings) {
        Object userIdObj = settings.get("userId");
        Long userId = userIdObj != null ? Long.valueOf(userIdObj.toString()) : null;

        if (userId != null) {
            ProfileSetting ps = profileRepo.findByUserId(userId).orElseGet(() -> ProfileSetting.builder()
                    .user(userRepo.findById(userId).orElse(null))
                    .build());
            if (settings.containsKey("phone")) ps.setPhone((String) settings.get("phone"));
            if (settings.containsKey("address")) ps.setAddress((String) settings.get("address"));
            if (settings.containsKey("avatar")) ps.setAvatar((String) settings.get("avatar"));
            if (settings.containsKey("logo")) ps.setLogo((String) settings.get("logo"));
            if (settings.containsKey("language")) ps.setLanguage((String) settings.get("language"));
            if (settings.containsKey("theme")) ps.setTheme((String) settings.get("theme"));
            profileRepo.save(ps);

            User user = userRepo.findById(userId).orElse(null);
            if (user != null) {
                if (settings.containsKey("email")) user.setEmail((String) settings.get("email"));
                if (settings.containsKey("phone")) user.setPhone((String) settings.get("phone"));
                userRepo.save(user);
            }
        }

        String[] storeKeys = {"storeName", "currency", "openingTime", "closingTime"};
        for (String key : storeKeys) {
            if (settings.containsKey(key) && settings.get(key) != null) {
                SystemSetting ss = settingRepo.findByKey(key).orElseGet(() -> SystemSetting.builder().key(key).build());
                ss.setValue(String.valueOf(settings.get(key)));
                settingRepo.save(ss);
            }
        }

        Map<String, String> response = new HashMap<>();
        response.put("status", "saved");
        return response;
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(@RequestBody Map<String, String> payload) {
        String username = payload.getOrDefault("username", "");
        String currentPassword = payload.getOrDefault("currentPassword", "");
        String newPassword = payload.getOrDefault("newPassword", "");

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getPassword().equals(currentPassword)) {
            throw new RuntimeException("Current password is incorrect");
        }

        if (newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("New password cannot be empty");
        }

        user.setPassword(newPassword);
        userRepo.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("status", "changed");
        return response;
    }

    @GetMapping("/settings")
    public Map<String, Object> getSettings(@RequestParam(required = false) Long userId) {
        Map<String, Object> result = new HashMap<>();

        if (userId != null) {
            ProfileSetting ps = profileRepo.findByUserId(userId).orElse(null);
            if (ps != null) {
                result.put("phone", ps.getPhone());
                result.put("address", ps.getAddress());
                result.put("avatar", ps.getAvatar());
                result.put("logo", ps.getLogo());
                result.put("language", ps.getLanguage());
                result.put("theme", ps.getTheme());
            }
            User user = userRepo.findById(userId).orElse(null);
            if (user != null) {
                result.put("email", user.getEmail());
            }
        }

        String[] keys = {"storeName", "currency", "openingTime", "closingTime", "lowStockThreshold", "taxRate", "receiptFooter"};
        for (String key : keys) {
            settingRepo.findByKey(key).ifPresent(ss -> result.put(key, ss.getValue()));
        }

        return result;
    }
}
