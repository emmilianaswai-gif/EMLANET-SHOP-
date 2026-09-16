package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.ExchangeStoring;
import com.example.EMLANET_SHOP.Repository.ExchangeStoringRepository;
import com.example.EMLANET_SHOP.Service.ExchangeStoringService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExchangeStoringServiceImpl implements ExchangeStoringService {

    private final ExchangeStoringRepository repo;

    public ExchangeStoringServiceImpl(ExchangeStoringRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public ExchangeStoring save(ExchangeStoring exchange) {
        if (exchange.getProduct() != null && exchange.getType() != null) {
            var existingList = repo.findByProductIdAndType(exchange.getProduct().getId(), exchange.getType());
            if (!existingList.isEmpty()) {
                ExchangeStoring e = existingList.get(0);
                if (exchange.getQuantity() != null) e.setQuantity(exchange.getQuantity());
                if (exchange.getReason() != null) e.setReason(exchange.getReason());
                if (exchange.getDate() != null) e.setDate(exchange.getDate());
                if (exchange.getStatus() != null) e.setStatus(exchange.getStatus());
                if (exchange.getProductName() != null) e.setProductName(exchange.getProductName());
                if (exchange.getSale() != null) e.setSale(exchange.getSale());
                return repo.save(e);
            }
        }
        return repo.save(exchange);
    }

    @Override
    @Transactional(readOnly = true)
    public ExchangeStoring getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("ExchangeStoring not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExchangeStoring> getAll() {
        return repo.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExchangeStoring> getByStatus(String status) {
        return repo.findByStatus(status);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExchangeStoring> getByType(String type) {
        return repo.findByType(type);
    }

    @Override
    @Transactional
    public ExchangeStoring updateStatus(Long id, String status) {
        ExchangeStoring existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("ExchangeStoring not found with id: " + id));
        existing.setStatus(status);
        return repo.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("ExchangeStoring not found with id: " + id);
        }
        repo.deleteById(id);
    }
}
