package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByType(String type);
    List<Report> findByTypeOrderByGeneratedDateDesc(String type);
    List<Report> findByCreatedById(Long userId);
}
