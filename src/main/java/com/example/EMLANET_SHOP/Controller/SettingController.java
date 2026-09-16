package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Setting;
import com.example.EMLANET_SHOP.Service.SettingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public Setting get() {
        return settingService.get();
    }

    @PostMapping
    public Setting save(@RequestBody Setting setting) {
        return settingService.save(setting);
    }
}
