package com.example.EMLANET_SHOP.Config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DbMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    private static final String[] TENANT_TABLES = {
            "users", "categories", "customers", "debts", "exchange_storing", "expenses",
            "feedback", "feedback_messages", "payments", "pocket_collections", "pocket_withdrawals",
            "products", "profile_settings", "purchases", "purchases_items", "reports", "sales",
            "sale_items", "settings", "stocks", "stock_history", "suppliers", "supplier_payments",
            "transactions"
    };

    public DbMigrationRunner(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE profile_settings ALTER COLUMN avatar TYPE TEXT");
        } catch (Exception ignored) {
        }
        try {
            jdbcTemplate.execute("ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS logo TEXT");
        } catch (Exception ignored) {
        }

        migrateTenants();
        seedLegacyAdmins();
    }

    // The frontend still knows two legacy owner accounts that previously only
    // existed as a local fallback. Seed them for the first shop so logging in
    // while online returns a real server token instead of a fake local one.
    private void seedLegacyAdmins() {
        seedAdmin("emmilianaswai@gmail.com", "123", "Administrator");
        seedAdmin("shop@gmail.com", "1234", "Shop Admin");
    }

    private void seedAdmin(String username, String rawPassword, String fullName) {
        try {
            Long shopId = jdbcTemplate.queryForObject("SELECT id FROM shops ORDER BY id ASC LIMIT 1", Long.class);
            if (shopId == null) {
                return;
            }
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
            if (count != null && count > 0) {
                return;
            }
            jdbcTemplate.update(
                    "INSERT INTO users (username, full_name, password, role, shop_id, is_enabled, status, created_at) "
                            + "VALUES (?, ?, ?, 'ADMIN', ?, TRUE, 'active', now())",
                    username, fullName, passwordEncoder.encode(rawPassword), shopId);
            System.out.println("=== DB MIGRATION: seeded legacy admin " + username + " ===");
        } catch (Exception ignored) {
        }
    }

    private void migrateTenants() {
        try {
            jdbcTemplate.update("INSERT INTO shops (name, created_at) SELECT 'Main Shop', now() WHERE NOT EXISTS (SELECT 1 FROM shops)");
        } catch (Exception ignored) {
        }

        Long defaultShopId = null;
        try {
            defaultShopId = jdbcTemplate.queryForObject("SELECT id FROM shops ORDER BY id ASC LIMIT 1", Long.class);
        } catch (Exception ignored) {
        }
        if (defaultShopId == null) {
            return;
        }

        for (String table : TENANT_TABLES) {
            try {
                jdbcTemplate.update("UPDATE " + table + " SET shop_id = ? WHERE shop_id IS NULL", defaultShopId);
            } catch (Exception ignored) {
            }
        }

        relaxUniqueConstraints();
    }

    private void relaxUniqueConstraints() {
        dropUniqueConstraintsOnColumn("categories", "name");
        addUniqueConstraint("categories", "uk_categories_shop_name", "shop_id, name");

        dropUniqueConstraintsOnColumn("payments", "reference_number");
        addUniqueConstraint("payments", "uk_payments_shop_reference", "shop_id, reference_number");
    }

    private void dropUniqueConstraintsOnColumn(String table, String column) {
        try {
            String sql = "DO $$ DECLARE conname TEXT; BEGIN "
                    + "FOR conname IN SELECT c.conname FROM pg_constraint c "
                    + "JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) "
                    + "WHERE c.conrelid = '" + table + "'::regclass AND c.contype = 'u' AND a.attname = '" + column + "' "
                    + "LOOP EXECUTE 'ALTER TABLE " + table + " DROP CONSTRAINT ' || quote_ident(conname); END LOOP; END $$";
            jdbcTemplate.execute(sql);
        } catch (Exception ignored) {
        }
    }

    private void addUniqueConstraint(String table, String constraintName, String columns) {
        try {
            String sql = "DO $$ BEGIN "
                    + "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '" + constraintName + "') THEN "
                    + "ALTER TABLE " + table + " ADD CONSTRAINT " + constraintName + " UNIQUE (" + columns + "); "
                    + "END IF; END $$";
            jdbcTemplate.execute(sql);
        } catch (Exception ignored) {
        }
    }
}
