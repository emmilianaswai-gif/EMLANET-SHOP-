package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Feedback;
import com.example.EMLANET_SHOP.Repository.FeedbackRepository;
import com.example.EMLANET_SHOP.Service.FeedbackService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository repo;

    public FeedbackServiceImpl(FeedbackRepository repo) {
        this.repo = repo;
    }

    @Override
    public Feedback save(Feedback feedback) {
        return repo.save(feedback);
    }

    @Override
    public Feedback getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Feedback not found with id: " + id));
    }

    @Override
    public List<Feedback> getAll() {
        return repo.findAll();
    }

    @Override
    public List<Feedback> getByStatus(String status) {
        return repo.findByStatus(status);
    }

    @Override
    public Feedback updateStatus(Long id, String status) {
        Feedback feedback = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Feedback not found with id: " + id));
        feedback.setStatus(status);
        return repo.save(feedback);
    }

    @Override
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Feedback not found with id: " + id);
        }
        repo.deleteById(id);
    }
}
