package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.RolePermission;
import com.example.EMLANET_SHOP.Repository.RolePermissionRepository;
import com.example.EMLANET_SHOP.Service.RolePermissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RolePermissionServiceImpl implements RolePermissionService {

    private final RolePermissionRepository repo;

    public RolePermissionServiceImpl(RolePermissionRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RolePermission> getAll() {
        return repo.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RolePermission> getByRole(String roleName) {
        return repo.findByRoleName(roleName);
    }

    @Override
    @Transactional
    public RolePermission save(RolePermission permission) {
        return repo.save(permission);
    }

    @Override
    @Transactional
    public void deleteByRole(String roleName) {
        repo.deleteByRoleName(roleName);
    }

    @Override
    @Transactional
    public void deleteByRoleAndModule(String roleName, String moduleId) {
        repo.deleteByRoleNameAndModuleId(roleName, moduleId);
    }

    @Override
    @Transactional
    public void saveAll(List<RolePermission> permissions) {
        Set<String> rolesAffected = permissions.stream()
                .map(RolePermission::getRoleName)
                .collect(Collectors.toSet());
        for (String roleName : rolesAffected) {
            repo.deleteByRoleName(roleName);
        }
        repo.flush();
        repo.saveAll(permissions);
    }
}
