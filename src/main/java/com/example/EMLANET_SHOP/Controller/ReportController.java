package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Report;
import com.example.EMLANET_SHOP.Service.ReportService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @PostMapping
    public Report create(@RequestBody Report report) {
        return service.save(report);
    }

    @GetMapping
    public List<Report> getAll(@RequestParam(required = false) String type) {
        if (type != null && !type.isEmpty()) {
            return service.getByType(type);
        }
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Report getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/user/{userId}")
    public List<Report> getByUser(@PathVariable Long userId) {
        return service.getByCreatedBy(userId);
    }

    @PutMapping("/{id}")
    public Report update(@PathVariable Long id, @RequestBody Report report) {
        return service.save(report);
    }

    @PutMapping("/{id}/status")
    public Report updateStatus(@PathVariable Long id, @RequestBody String status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
