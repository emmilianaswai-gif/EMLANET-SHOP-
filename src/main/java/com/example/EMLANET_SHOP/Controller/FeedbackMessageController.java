package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.FeedbackMessage;
import com.example.EMLANET_SHOP.Service.FeedbackMessageService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class FeedbackMessageController {

    private final FeedbackMessageService service;

    public FeedbackMessageController(FeedbackMessageService service) {
        this.service = service;
    }

    @GetMapping("/conversations")
    public Map<String, Object> getConversations() {
        return service.getConversations();
    }

    @GetMapping("/conversations/{conversationId}")
    public List<FeedbackMessage> getConversation(@PathVariable String conversationId) {
        return service.getConversation(conversationId);
    }

    @PostMapping("/send")
    public FeedbackMessage send(@RequestBody Map<String, String> payload) {
        return service.sendAdminMessage(
                payload.get("conversationId"),
                payload.get("phone"),
                payload.get("customerName"),
                payload.get("message")
        );
    }

    @PostMapping("/webhook/incoming")
    public FeedbackMessage receiveSms(@RequestBody Map<String, String> payload) {
        String phone = payload.getOrDefault("phone", "");
        String message = payload.getOrDefault("message", "");
        return service.receiveCustomerMessage(phone, message);
    }
}
