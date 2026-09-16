package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.FeedbackMessage;
import com.example.EMLANET_SHOP.Repository.FeedbackMessageRepository;
import com.example.EMLANET_SHOP.Service.FeedbackMessageService;
import com.example.EMLANET_SHOP.Service.SmsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FeedbackMessageServiceImpl implements FeedbackMessageService {

    private final FeedbackMessageRepository repo;
    private final SmsService smsService;

    public FeedbackMessageServiceImpl(FeedbackMessageRepository repo, SmsService smsService) {
        this.repo = repo;
        this.smsService = smsService;
    }

    @Override
    @Transactional
    public FeedbackMessage sendAdminMessage(String conversationId, String customerPhone, String customerName, String message) {
        if (conversationId == null || conversationId.isBlank()) {
            conversationId = "conv_" + System.currentTimeMillis();
        }
        FeedbackMessage msg = FeedbackMessage.builder()
                .conversationId(conversationId)
                .senderName("Admin")
                .senderPhone("")
                .message(message)
                .direction("OUTBOUND")
                .build();
        FeedbackMessage saved = repo.save(msg);
        smsService.sendSms(customerPhone, message);
        return saved;
    }

    @Override
    @Transactional
    public FeedbackMessage receiveCustomerMessage(String phone, String message) {
        String convId = "conv_" + phone.replaceAll("[^0-9]", "");
        FeedbackMessage msg = FeedbackMessage.builder()
                .conversationId(convId)
                .senderName(phone)
                .senderPhone(phone)
                .message(message)
                .direction("INBOUND")
                .build();
        return repo.save(msg);
    }

    @Override
    public List<FeedbackMessage> getConversation(String conversationId) {
        return repo.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    @Override
    public Map<String, Object> getConversations() {
        List<FeedbackMessage> all = repo.findAllByOrderByCreatedAtDesc();
        Map<String, List<FeedbackMessage>> grouped = all.stream()
                .collect(Collectors.groupingBy(FeedbackMessage::getConversationId,
                        LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<FeedbackMessage>> entry : grouped.entrySet()) {
            List<FeedbackMessage> msgs = entry.getValue();
            FeedbackMessage last = msgs.get(0);
            Map<String, Object> conv = new HashMap<>();
            conv.put("conversationId", entry.getKey());
            conv.put("customerName", last.getSenderName());
            conv.put("customerPhone", last.getSenderPhone());
            conv.put("lastMessage", last.getMessage());
            conv.put("lastTime", last.getCreatedAt() != null ? last.getCreatedAt().toString() : "");
            conv.put("unread", msgs.stream().anyMatch(m -> "INBOUND".equals(m.getDirection())));
            conv.put("messageCount", msgs.size());
            result.add(conv);
        }
        Map<String, Object> response = new HashMap<>();
        response.put("conversations", result);
        response.put("total", result.size());
        return response;
    }
}
