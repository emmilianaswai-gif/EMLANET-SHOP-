package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Feedback;
import com.example.EMLANET_SHOP.Service.FeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService service;

    public FeedbackController(FeedbackService service) {
        this.service = service;
    }

    @PostMapping
    public Feedback create(@RequestBody Feedback feedback) {
        return service.save(feedback);
    }

    @GetMapping
    public List<Feedback> getAll(@RequestParam(required = false) String status) {
        if (status != null && !status.isEmpty()) {
            return service.getByStatus(status);
        }
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Feedback getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public Feedback update(@PathVariable Long id, @RequestBody Feedback feedback) {
        return service.save(feedback);
    }

    @PutMapping("/{id}/status")
    public Feedback updateStatus(@PathVariable Long id, @RequestBody String status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
