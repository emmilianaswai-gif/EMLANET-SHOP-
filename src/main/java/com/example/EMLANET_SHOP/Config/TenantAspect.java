package com.example.EMLANET_SHOP.Config;

import com.example.EMLANET_SHOP.Entity.TenantAware;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.hibernate.Filter;
import org.hibernate.Session;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class TenantAspect {

    private static final String FILTER_NAME = "shopFilter";

    @PersistenceContext
    private EntityManager entityManager;

    @Around("execution(* com.example.EMLANET_SHOP.Repository.*Repository+.*(..))")
    public Object applyTenant(ProceedingJoinPoint pjp) throws Throwable {
        Long shopId = TenantContext.getShopId();
        if (shopId != null) {
            for (Object arg : pjp.getArgs()) {
                tagShopId(arg, shopId);
            }
            Session session = entityManager.unwrap(Session.class);
            Filter filter = session.enableFilter(FILTER_NAME);
            filter.setParameter("shopId", shopId);
        }
        return pjp.proceed();
    }

    private void tagShopId(Object arg, Long shopId) {
        if (arg instanceof TenantAware tenantAware) {
            // Force the tenant's shopId so a client can never create or update
            // a record under another shop by sending a shopId in the body.
            tenantAware.setShopId(shopId);
        } else if (arg instanceof Iterable<?> iterable) {
            iterable.forEach(item -> tagShopId(item, shopId));
        }
    }
}
