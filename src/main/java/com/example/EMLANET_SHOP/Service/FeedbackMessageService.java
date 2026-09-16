package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.FeedbackMessage;

import java.util.List;
import java.util.Map;

public interface FeedbackMessageService {
    FeedbackMessage sendAdminMessage(String conversationId, String customerPhone, String customerName, String message);
    FeedbackMessage receiveCustomerMessage(String phone, String message);
    List<FeedbackMessage> getConversation(String conversationId);
    Map<String, Object> getConversations();
}
