package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.RolePermission;

import java.util.List;

public interface RolePermissionService {
    List<RolePermission> getAll();
    List<RolePermission> getByRole(String roleName);
    RolePermission save(RolePermission permission);
    void deleteByRole(String roleName);
    void deleteByRoleAndModule(String roleName, String moduleId);
    void saveAll(List<RolePermission> permissions);
}
