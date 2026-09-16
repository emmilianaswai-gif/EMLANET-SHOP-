package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Role;
import com.example.EMLANET_SHOP.Entity.RolePermission;
import com.example.EMLANET_SHOP.Entity.User;
import com.example.EMLANET_SHOP.Repository.UserRepository;
import com.example.EMLANET_SHOP.Service.RolePermissionService;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/role-permissions")
public class RolePermissionController {

    private final RolePermissionService service;
    private final UserRepository userRepository;

    public RolePermissionController(RolePermissionService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<RolePermission> getAll() {
        return service.getAll();
    }

    @GetMapping("/{roleName}")
    public List<RolePermission> getByRole(@PathVariable String roleName) {
        return service.getByRole(roleName);
    }

    @PostMapping
    public RolePermission save(@RequestBody RolePermission permission) {
        return service.save(permission);
    }

    @PostMapping("/bulk")
    public Map<String, Object> saveBulk(@RequestBody List<RolePermission> permissions) {
        service.saveAll(permissions);
        return Map.of("message", "Permissions saved", "count", permissions.size());
    }

    @DeleteMapping("/{roleName}")
    public void deleteByRole(@PathVariable String roleName) {
        service.deleteByRole(roleName);
    }

    @GetMapping("/summary")
    public List<Map<String, Object>> getSummary() {
        List<RolePermission> allPerms = service.getAll();
        Map<String, List<RolePermission>> grouped = allPerms.stream()
                .collect(Collectors.groupingBy(RolePermission::getRoleName));

        List<Map<String, Object>> summaries = new ArrayList<>();

        for (String roleName : grouped.keySet()) {
            List<RolePermission> rolePerms = grouped.get(roleName);
            Map<String, Object> summary = new HashMap<>();
            summary.put("roleName", roleName);
            summary.put("moduleCount", rolePerms.size());
            summary.put("permissions", rolePerms.stream().map(rp -> {
                Map<String, Object> pm = new HashMap<>();
                pm.put("moduleId", rp.getModuleId());
                pm.put("canRead", rp.getCanRead());
                pm.put("canWrite", rp.getCanWrite());
                pm.put("canEdit", rp.getCanEdit());
                pm.put("canDelete", rp.getCanDelete());
                pm.put("canExport", rp.getCanExport());
                return pm;
            }).collect(Collectors.toList()));

            long userCount = 0;
            for (Role role : Role.values()) {
                if (role.toValue().equalsIgnoreCase(roleName)) {
                    userCount = userRepository.countByRole(role);
                    break;
                }
            }
            summary.put("userCount", userCount);

            int totalPerms = rolePerms.stream()
                    .mapToInt(rp -> {
                        int count = 0;
                        if (Boolean.TRUE.equals(rp.getCanRead())) count++;
                        if (Boolean.TRUE.equals(rp.getCanWrite())) count++;
                        if (Boolean.TRUE.equals(rp.getCanEdit())) count++;
                        if (Boolean.TRUE.equals(rp.getCanDelete())) count++;
                        if (Boolean.TRUE.equals(rp.getCanExport())) count++;
                        return count;
                    }).sum();
            int maxPerms = rolePerms.size() * 5;
            summary.put("permissionScore", maxPerms > 0 ? Math.round((double) totalPerms / maxPerms * 100) : 0);

            summaries.add(summary);
        }

        return summaries;
    }
}
