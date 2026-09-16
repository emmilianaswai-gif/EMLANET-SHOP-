package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.CustomRole;
import com.example.EMLANET_SHOP.Entity.RolePermission;
import com.example.EMLANET_SHOP.Repository.CustomRoleRepository;
import com.example.EMLANET_SHOP.Repository.RolePermissionRepository;
import com.example.EMLANET_SHOP.Service.CustomRoleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomRoleServiceImpl implements CustomRoleService {

    private final CustomRoleRepository repo;
    private final RolePermissionRepository rolePermissionRepository;

    private static final String[] DEFAULT_MODULES = {
        "dashboard", "products", "categories", "stock", "stock_history",
        "purchases", "purchase_items", "sales", "sale_manager", "sale_items",
        "customers", "suppliers", "users", "exchange", "reports",
        "payments", "my_pocket", "settings", "support"
    };

    public CustomRoleServiceImpl(CustomRoleRepository repo, RolePermissionRepository rolePermissionRepository) {
        this.repo = repo;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomRole> getAll() {
        return repo.findAll();
    }

    @Override
    @Transactional
    public CustomRole save(CustomRole role) {
        boolean isNew = role.getId() == null;
        CustomRole saved = repo.save(role);
        if (isNew) {
            createDefaultPermissions(saved.getName().toLowerCase());
        }
        return saved;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (repo.existsById(id)) {
            CustomRole role = repo.findById(id).orElse(null);
            if (role != null) {
                rolePermissionRepository.deleteByRoleName(role.getName().toLowerCase());
            }
            repo.deleteById(id);
        }
    }

    private void createDefaultPermissions(String roleName) {
        List<RolePermission> perms = new ArrayList<>();
        for (String moduleId : DEFAULT_MODULES) {
            perms.add(RolePermission.builder()
                    .roleName(roleName)
                    .moduleId(moduleId)
                    .canRead(true)
                    .canWrite(true)
                    .canEdit(true)
                    .canDelete(true)
                    .canExport(true)
                    .build());
        }
        rolePermissionRepository.saveAll(perms);
    }
}
