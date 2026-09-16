package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.CustomRole;
import com.example.EMLANET_SHOP.Service.CustomRoleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/custom-roles")
public class CustomRoleController {

    private final CustomRoleService service;

    public CustomRoleController(CustomRoleService service) {
        this.service = service;
    }

    @GetMapping
    public List<CustomRole> getAll() {
        return service.getAll();
    }

    @PostMapping
    public CustomRole create(@RequestBody CustomRole role) {
        return service.save(role);
    }

    @PutMapping("/{id}")
    public CustomRole update(@PathVariable Long id, @RequestBody CustomRole role) {
        role.setId(id);
        return service.save(role);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
