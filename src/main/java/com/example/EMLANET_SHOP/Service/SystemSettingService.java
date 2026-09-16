package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.SystemSetting;

import java.util.List;

public interface SystemSettingService {
    SystemSetting save(SystemSetting setting);
    SystemSetting getById(Long id);
    SystemSetting getByKey(String key);
    List<SystemSetting> getAll();
    SystemSetting update(Long id, SystemSetting setting);
    void delete(Long id);
}
