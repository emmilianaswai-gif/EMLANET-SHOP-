package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Feedback;
import com.example.EMLANET_SHOP.Service.FeedbackService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessagesController {

    private final FeedbackService service;

    public MessagesController(FeedbackService service) {
        this.service = service;
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

    @PostMapping
    public Feedback create(@RequestBody Feedback feedback) {
        return service.save(feedback);
    }

    @PutMapping("/{id}")
    public Feedback update(@PathVariable Long id, @RequestBody Feedback feedback) {
        feedback.setId(id);
        return service.save(feedback);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
