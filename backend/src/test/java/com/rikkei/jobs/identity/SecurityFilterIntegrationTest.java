package com.rikkei.jobs.identity;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Security Filters Integration Tests (JwtAuthFilter & MustChangePasswordFilter)")
public class SecurityFilterIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @DisplayName(
            "JwtAuthFilter: Rejects token if user status in database is LOCKED (HTTP 401 ACCOUNT_LOCKED)")
    void testLockedUserTokenRejectedByFilter() throws Exception {
        Role role = roleRepository.findByName(Role.HR).orElseThrow();
        User lockedUser =
                new User("locked_filter@rikkeijobs.test", "hash", "Locked User", null, role, 1L);
        lockedUser.setStatus(UserStatus.LOCKED);
        lockedUser.setLockedUntil(OffsetDateTime.now().plusMinutes(15));
        lockedUser = userRepository.save(lockedUser);

        String token = jwtService.generateToken(lockedUser);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName(
            "MustChangePasswordFilter: Blocks non-allow-listed endpoints with 403 MUST_CHANGE_PASSWORD")
    void testMustChangePasswordFilterBlocksBusinessEndpoints() throws Exception {
        Role role = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User("must_change@rikkeijobs.test", "hash", "Must Change User", null, role, 1L);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        // Accessing non-allowlisted endpoint
        mockMvc.perform(
                        get("/api/v1/protected/candidates")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"))
                .andExpect(
                        jsonPath("$.message")
                                .value("Tài khoản yêu cầu đổi mật khẩu trước khi tiếp tục"));
    }

    @Test
    @DisplayName(
            "MustChangePasswordFilter: Allows GET /api/v1/auth/me for user with mustChangePassword=true")
    void testMustChangePasswordFilterAllowsMeEndpoint() throws Exception {
        Role role = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "hr_must_change@rikkeijobs.test", "hash", "HR Must Change", null, role, 1L);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("hr_must_change@rikkeijobs.test"))
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    @DisplayName(
            "MustChangePasswordFilter: Allows POST /api/v1/auth/change-password for user with mustChangePassword=true")
    void testMustChangePasswordFilterAllowsChangePasswordEndpoint() throws Exception {
        Role role = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "change_allowed@rikkeijobs.test",
                        "$2a$10$wE0V7gL4a7j/8i11vWqQe.g4a/JzW/kE0v7gL4a7j/8i11vWqQe.g",
                        "Change Allowed",
                        null,
                        role,
                        1L);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        mockMvc.perform(
                        post("/api/v1/auth/change-password")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"oldPassword\":\"wrong\",\"newPassword\":\"ValidPass123\"}"))
                // Expect 400 Validation error from service, NOT 403 Forbidden from filter!
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
