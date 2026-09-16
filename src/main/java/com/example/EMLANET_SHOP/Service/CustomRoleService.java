package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.CustomRole;
import java.util.List;

public interface CustomRoleService {
    List<CustomRole> getAll();
    CustomRole save(CustomRole role);
    void delete(Long id);
}
