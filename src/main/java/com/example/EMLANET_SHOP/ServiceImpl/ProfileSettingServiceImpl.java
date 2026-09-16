package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.ProfileSetting;
import com.example.EMLANET_SHOP.Repository.ProfileSettingRepository;
import com.example.EMLANET_SHOP.Service.ProfileSettingService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProfileSettingServiceImpl implements ProfileSettingService {

    private final ProfileSettingRepository repo;

    public ProfileSettingServiceImpl(ProfileSettingRepository repo) {
        this.repo = repo;
    }

    @Override
    public ProfileSetting save(ProfileSetting profileSetting) {
        return repo.save(profileSetting);
    }

    @Override
    public ProfileSetting getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("ProfileSetting not found with id: " + id));
    }

    @Override
    public ProfileSetting getByUserId(Long userId) {
        return repo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("ProfileSetting not found for user id: " + userId));
    }

    @Override
    public List<ProfileSetting> getAll() {
        return repo.findAll();
    }

    @Override
    public ProfileSetting update(Long id, ProfileSetting updated) {
        ProfileSetting existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("ProfileSetting not found with id: " + id));
        if (updated.getAvatar() != null) existing.setAvatar(updated.getAvatar());
        if (updated.getPhone() != null) existing.setPhone(updated.getPhone());
        if (updated.getAddress() != null) existing.setAddress(updated.getAddress());
        if (updated.getBio() != null) existing.setBio(updated.getBio());
        if (updated.getLanguage() != null) existing.setLanguage(updated.getLanguage());
        if (updated.getTheme() != null) existing.setTheme(updated.getTheme());
        return repo.save(existing);
    }

    @Override
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("ProfileSetting not found with id: " + id);
        }
        repo.deleteById(id);
    }
}
