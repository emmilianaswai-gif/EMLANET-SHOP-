package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.SystemSetting;
import com.example.EMLANET_SHOP.Repository.SystemSettingRepository;
import com.example.EMLANET_SHOP.Service.SystemSettingService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SystemSettingServiceImpl implements SystemSettingService {

    private final SystemSettingRepository repo;

    public SystemSettingServiceImpl(SystemSettingRepository repo) {
        this.repo = repo;
    }

    @Override
    public SystemSetting save(SystemSetting setting) {
        return repo.save(setting);
    }

    @Override
    public SystemSetting getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("SystemSetting not found with id: " + id));
    }

    @Override
    public SystemSetting getByKey(String key) {
        return repo.findByKey(key)
                .orElseThrow(() -> new RuntimeException("SystemSetting not found for key: " + key));
    }

    @Override
    public List<SystemSetting> getAll() {
        return repo.findAll();
    }

    @Override
    public SystemSetting update(Long id, SystemSetting updated) {
        SystemSetting existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("SystemSetting not found with id: " + id));
        if (updated.getValue() != null) existing.setValue(updated.getValue());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getKey() != null) existing.setKey(updated.getKey());
        return repo.save(existing);
    }

    @Override
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("SystemSetting not found with id: " + id);
        }
        repo.deleteById(id);
    }
}
