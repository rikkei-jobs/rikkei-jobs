package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.assessment.model.Skill;
import com.rikkei.jobs.assessment.repository.SkillRepository;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
public class FlywayMigrationIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private RoleRepository roleRepository;

    @Autowired private SkillRepository skillRepository;

    @Autowired private UserRepository userRepository;

    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Dev profile must seed exactly 5 roles")
    void testRolesSeeded() {
        List<Role> roles = roleRepository.findAll();
        assertEquals(5, roles.size(), "Should contain exactly 5 standard roles");

        List<String> expectedRoles = List.of("CANDIDATE", "HR", "MENTOR", "STAFF", "ADMIN");
        for (String roleName : expectedRoles) {
            assertTrue(
                    roleRepository.findByName(roleName).isPresent(),
                    "Role " + roleName + " must exist");
        }
    }

    @Test
    @DisplayName("Dev profile must seed exactly 20 skills catalogue")
    void testSkillsSeeded() {
        List<Skill> skills = skillRepository.findAll();
        assertEquals(20, skills.size(), "Should contain exactly 20 skills");

        List<String> expectedSkills =
                List.of(
                        "JAVA",
                        "SPRING_BOOT",
                        "SQL",
                        "GIT",
                        "REST_API",
                        "HTML_CSS",
                        "JAVASCRIPT",
                        "REACTJS",
                        "DOCKER",
                        "ENGLISH",
                        "TESTING",
                        "LINUX",
                        "OOP",
                        "DSA",
                        "CLEAN_CODE",
                        "TEAMWORK",
                        "COMMUNICATION",
                        "AGILE",
                        "SECURITY",
                        "CLOUD");

        for (String code : expectedSkills) {
            Optional<Skill> skillOpt = skillRepository.findByCode(code);
            assertTrue(skillOpt.isPresent(), "Skill code " + code + " must exist in database");
            Skill skill = skillOpt.get();
            assertNotNull(skill.getNameVi(), "Vietnamese name must not be null");
            assertNotNull(skill.getNameEn(), "English name must not be null");
            assertNotNull(skill.getLevelBands(), "Level bands JSON must not be null");
            assertEquals("0-100", skill.getScale(), "Scale must be 0-100");
        }
    }

    @Test
    @DisplayName(
            "Dev profile must seed exactly 8 sample users with Bcrypt(Test@123) and LMS ID mapping")
    void testUsersSeeded() {
        List<User> users = userRepository.findAll();
        assertEquals(8, users.size(), "Dev profile must have exactly 8 sample accounts");

        // Verify candidate1
        User cand1 = userRepository.findByEmail("candidate1@rikkeijobs.test").orElseThrow();
        assertEquals("Nguyễn Văn An", cand1.getFullName());
        assertEquals("lms-sv-001", cand1.getLmsUserId());
        assertTrue(passwordEncoder.matches("Test@123", cand1.getPasswordHash()));

        // Verify candidate2
        User cand2 = userRepository.findByEmail("candidate2@rikkeijobs.test").orElseThrow();
        assertEquals("Trần Thị Bình", cand2.getFullName());
        assertEquals("lms-sv-002", cand2.getLmsUserId());
        assertTrue(passwordEncoder.matches("Test@123", cand2.getPasswordHash()));

        // Verify candidate3
        User cand3 = userRepository.findByEmail("candidate3@rikkeijobs.test").orElseThrow();
        assertEquals("Lê Minh Châu", cand3.getFullName());
        assertEquals("lms-sv-003", cand3.getLmsUserId());
        assertTrue(passwordEncoder.matches("Test@123", cand3.getPasswordHash()));

        // Verify hr1 & hr2 (lms_user_id must be null)
        User hr1 = userRepository.findByEmail("hr1@rikkeijobs.test").orElseThrow();
        assertNull(hr1.getLmsUserId(), "HR accounts must have null lms_user_id");
        assertTrue(passwordEncoder.matches("Test@123", hr1.getPasswordHash()));

        User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        assertNull(hr2.getLmsUserId(), "HR accounts must have null lms_user_id");
        assertTrue(passwordEncoder.matches("Test@123", hr2.getPasswordHash()));

        // Verify mentor1
        User mentor1 = userRepository.findByEmail("mentor1@rikkeijobs.test").orElseThrow();
        assertEquals("lms-mt-001", mentor1.getLmsUserId());
        assertTrue(passwordEncoder.matches("Test@123", mentor1.getPasswordHash()));

        // Verify staff1
        User staff1 = userRepository.findByEmail("staff1@rikkeijobs.test").orElseThrow();
        assertEquals("lms-st-001", staff1.getLmsUserId());
        assertTrue(passwordEncoder.matches("Test@123", staff1.getPasswordHash()));

        // Verify admin1
        User admin1 = userRepository.findByEmail("admin1@rikkeijobs.test").orElseThrow();
        assertEquals("lms-ad-001", admin1.getLmsUserId());
        assertTrue(passwordEncoder.matches("Test@123", admin1.getPasswordHash()));
    }
}
