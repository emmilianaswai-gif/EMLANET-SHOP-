package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Report;

import java.util.List;

public interface ReportService {
    Report save(Report report);
    Report getById(Long id);
    List<Report> getAll();
    List<Report> getByType(String type);
    List<Report> getByCreatedBy(Long userId);
    Report updateStatus(Long id, String status);
    void delete(Long id);
}
