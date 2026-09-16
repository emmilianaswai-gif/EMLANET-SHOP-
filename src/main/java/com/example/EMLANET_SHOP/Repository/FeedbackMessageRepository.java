package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.FeedbackMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackMessageRepository extends JpaRepository<FeedbackMessage, Long> {
    List<FeedbackMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    List<FeedbackMessage> findAllByOrderByCreatedAtDesc();
}
