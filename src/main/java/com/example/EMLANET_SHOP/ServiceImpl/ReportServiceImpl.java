package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Report;
import com.example.EMLANET_SHOP.Repository.ReportRepository;
import com.example.EMLANET_SHOP.Service.ReportService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReportServiceImpl implements ReportService {

    private final ReportRepository repo;

    public ReportServiceImpl(ReportRepository repo) {
        this.repo = repo;
    }

    @Override
    public Report save(Report report) {
        return repo.save(report);
    }

    @Override
    public Report getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found with id: " + id));
    }

    @Override
    public List<Report> getAll() {
        return repo.findAll();
    }

    @Override
    public List<Report> getByType(String type) {
        return repo.findByTypeOrderByGeneratedDateDesc(type);
    }

    @Override
    public List<Report> getByCreatedBy(Long userId) {
        return repo.findByCreatedById(userId);
    }

    @Override
    public Report updateStatus(Long id, String status) {
        Report report = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found with id: " + id));
        report.setStatus(status);
        return repo.save(report);
    }

    @Override
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Report not found with id: " + id);
        }
        repo.deleteById(id);
    }
}
