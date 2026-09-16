package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByStatus(String status);
    List<Feedback> findByRating(Integer rating);
    List<Feedback> findByRatingGreaterThanEqual(Integer minRating);
}
