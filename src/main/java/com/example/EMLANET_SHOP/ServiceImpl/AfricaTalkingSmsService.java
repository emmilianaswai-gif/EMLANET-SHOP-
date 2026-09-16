package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Service.SmsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
public class AfricaTalkingSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(AfricaTalkingSmsService.class);
    private static final String AT_URL = "https://api.africastalking.com/version1/messaging";

    private final RestTemplate restTemplate;
    private final String username;
    private final String apiKey;

    public AfricaTalkingSmsService(@Value("${sms.africastalking.username:}") String username,
                                   @Value("${sms.africastalking.api-key:}") String apiKey) {
        this.restTemplate = new RestTemplate();
        this.username = username;
        this.apiKey = apiKey;
    }

    @Override
    public boolean sendSms(String phone, String message) {
        if (username == null || username.isBlank() || apiKey == null || apiKey.isBlank()) {
            log.warn("SMS not sent - Africa's Talking credentials not configured. Phone={}, Message={}", phone, message);
            return false;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("apiKey", apiKey);
            headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("username", username);
            body.add("to", phone);
            body.add("message", message);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(AT_URL, request, String.class);

            log.info("SMS sent to {}: status={}, response={}", phone, response.getStatusCode(), response.getBody());
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", phone, e.getMessage());
            return false;
        }
    }
}
