package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Feedback;

import java.util.List;

public interface FeedbackService {
    Feedback save(Feedback feedback);
    Feedback getById(Long id);
    List<Feedback> getAll();
    List<Feedback> getByStatus(String status);
    Feedback updateStatus(Long id, String status);
    void delete(Long id);
}
