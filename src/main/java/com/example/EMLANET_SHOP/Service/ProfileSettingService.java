package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.ProfileSetting;

import java.util.List;

public interface ProfileSettingService {
    ProfileSetting save(ProfileSetting profileSetting);
    ProfileSetting getById(Long id);
    ProfileSetting getByUserId(Long userId);
    List<ProfileSetting> getAll();
    ProfileSetting update(Long id, ProfileSetting profileSetting);
    void delete(Long id);
}
