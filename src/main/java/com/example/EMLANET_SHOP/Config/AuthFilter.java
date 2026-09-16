package com.example.EMLANET_SHOP.Config;

import com.example.EMLANET_SHOP.Entity.AuthToken;
import com.example.EMLANET_SHOP.Repository.AuthTokenRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class AuthFilter extends OncePerRequestFilter {

    private final AuthTokenRepository authTokenRepository;

    public AuthFilter(AuthTokenRepository authTokenRepository) {
        this.authTokenRepository = authTokenRepository;
    }

    private boolean isPublic(String method, String path) {
        if (path.startsWith("/actuator") || path.equals("/error")) {
            return true;
        }
        if (path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/register")
                || path.startsWith("/api/auth/forgot-password")
                || path.startsWith("/api/auth/reset-password")) {
            return "POST".equals(method);
        }
        if (path.startsWith("/api/auth/debug-users")) {
            return "GET".equals(method);
        }
        // Tenant registration and the tenant list are public so a brand-new
        // shop can sign itself up before anyone has a session.
        if (path.startsWith("/api/shops")) {
            return "GET".equals(method);
        }
        return false;
    }

    private boolean isShopManagement(String method, String path) {
        return ("PUT".equals(method) || "DELETE".equals(method) || "POST".equals(method)) && path.startsWith("/api/shops");
    }

    private Long shopIdFromPath(String path) {
        String prefix = "/api/shops/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String rest = path.substring(prefix.length());
        if (rest.contains("/")) {
            rest = rest.substring(0, rest.indexOf('/'));
        }
        try {
            return Long.parseLong(rest);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Let CORS preflight (OPTIONS) through untouched so the CorsFilter /
        // WebMvcConfigurer can answer it with the right headers.
        if ("OPTIONS".equals(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isPublic(method, path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            Optional<AuthToken> found = authTokenRepository.findByToken(token);
            if (found.isPresent() && found.get().getExpiresAt() != null
                    && found.get().getExpiresAt().isAfter(LocalDateTime.now())) {
                AuthToken auth = found.get();
                AuthContext.set(auth.getUserId(), auth.getShopId(), auth.getRole());
                // The token's shop is authoritative: a caller can never scope a
                // request to another shop via the X-Tenant-Id header alone.
                TenantContext.setShopId(auth.getShopId());
                try {
                    if (isShopManagement(method, path)) {
                        if (!"admin".equalsIgnoreCase(auth.getRole())
                                && !"super_admin".equalsIgnoreCase(auth.getRole())) {
                            writeError(response, 403, "Forbidden");
                            return;
                        }
                        Long targetShopId = shopIdFromPath(path);
                        if (targetShopId != null && !"super_admin".equalsIgnoreCase(auth.getRole())
                                && !targetShopId.equals(auth.getShopId())) {
                            writeError(response, 403, "You can only manage your own shop");
                            return;
                        }
                    }
                    filterChain.doFilter(request, response);
                } finally {
                    AuthContext.clear();
                }
                return;
            }
        }

        writeError(response, 401, "Unauthorized");
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
