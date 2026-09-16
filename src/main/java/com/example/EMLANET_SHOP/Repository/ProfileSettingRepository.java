package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.ProfileSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProfileSettingRepository extends JpaRepository<ProfileSetting, Long> {
    Optional<ProfileSetting> findByUserId(Long userId);
}
