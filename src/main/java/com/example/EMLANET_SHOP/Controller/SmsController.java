package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Service.SmsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sms")
public class SmsController {

    private final SmsService smsService;

    public SmsController(SmsService smsService) {
        this.smsService = smsService;
    }

    @PostMapping("/send")
    public Map<String, Object> sendSms(@RequestBody Map<String, String> payload) {
        String phone = payload.getOrDefault("phone", "");
        String message = payload.getOrDefault("message", "");
        boolean sent = smsService.sendSms(phone, message);
        return Map.of("status", sent ? "sent" : "failed", "phone", phone);
    }
}
