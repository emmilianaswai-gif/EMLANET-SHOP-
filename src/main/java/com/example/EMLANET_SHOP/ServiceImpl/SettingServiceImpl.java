package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Setting;
import com.example.EMLANET_SHOP.Repository.SettingRepository;
import com.example.EMLANET_SHOP.Service.SettingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SettingServiceImpl implements SettingService {

    private final SettingRepository settingRepository;

    public SettingServiceImpl(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Setting get() {
        List<Setting> all = settingRepository.findAll();
        return all.isEmpty() ? new Setting() : all.get(0);
    }

    @Override
    @Transactional
    public Setting save(Setting setting) {
        List<Setting> all = settingRepository.findAll();
        if (!all.isEmpty()) {
            Setting existing = all.get(0);
            if (setting.getStoreName() != null) existing.setStoreName(setting.getStoreName());
            if (setting.getCurrency() != null) existing.setCurrency(setting.getCurrency());
            if (setting.getOpeningTime() != null) existing.setOpeningTime(setting.getOpeningTime());
            if (setting.getClosingTime() != null) existing.setClosingTime(setting.getClosingTime());
            if (setting.getTaxRate() != null) existing.setTaxRate(setting.getTaxRate());
            if (setting.getLowStockThreshold() != null) existing.setLowStockThreshold(setting.getLowStockThreshold());
            if (setting.getAutoInvoicing() != null) existing.setAutoInvoicing(setting.getAutoInvoicing());
            if (setting.getDefaultUnit() != null) existing.setDefaultUnit(setting.getDefaultUnit());
            if (setting.getShowExpiryAlerts() != null) existing.setShowExpiryAlerts(setting.getShowExpiryAlerts());
            return settingRepository.save(existing);
        }
        return settingRepository.save(setting);
    }
}
