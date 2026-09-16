package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.SystemSetting;
import com.example.EMLANET_SHOP.Service.SystemSettingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system-settings")
public class SystemSettingController {

    private final SystemSettingService service;

    public SystemSettingController(SystemSettingService service) {
        this.service = service;
    }

    @PostMapping
    public SystemSetting create(@RequestBody SystemSetting setting) {
        return service.save(setting);
    }

    @GetMapping
    public List<SystemSetting> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public SystemSetting getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/key/{key}")
    public SystemSetting getByKey(@PathVariable String key) {
        return service.getByKey(key);
    }

    @PutMapping("/{id}")
    public SystemSetting update(@PathVariable Long id, @RequestBody SystemSetting setting) {
        return service.update(id, setting);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
