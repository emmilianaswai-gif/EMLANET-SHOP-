package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.ProfileSetting;
import com.example.EMLANET_SHOP.Service.ProfileSettingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/profile-settings")
public class ProfileSettingController {

    private final ProfileSettingService service;

    public ProfileSettingController(ProfileSettingService service) {
        this.service = service;
    }

    @PostMapping
    public ProfileSetting create(@RequestBody ProfileSetting profileSetting) {
        return service.save(profileSetting);
    }

    @GetMapping
    public List<ProfileSetting> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public ProfileSetting getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/user/{userId}")
    public ProfileSetting getByUserId(@PathVariable Long userId) {
        return service.getByUserId(userId);
    }

    @PutMapping("/{id}")
    public ProfileSetting update(@PathVariable Long id, @RequestBody ProfileSetting profileSetting) {
        return service.update(id, profileSetting);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
