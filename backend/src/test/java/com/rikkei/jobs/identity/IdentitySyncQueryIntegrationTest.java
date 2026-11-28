package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.CandidateSyncSummaryDto;
import com.rikkei.jobs.identity.dto.CandidateSyncTargetDto;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("IdentityPublicService Sync Target & PostgreSQL 18.6 LIKE Escaping Integration Tests")
class IdentitySyncQueryIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private IdentityPublicService identityPublicService;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;

    @Test
    @DisplayName(
            "findCandidateSyncTargetByUserId returns candidate targets and empty for non-candidates/unknown")
    void findCandidateSyncTargetHandlesRolesAndNullLmsUserId() {
        Optional<CandidateSyncTargetDto> c1 =
                identityPublicService.findCandidateSyncTargetByUserId(1L);
        assertTrue(c1.isPresent());
        assertEquals("lms-sv-001", c1.get().lmsUserId());
        assertTrue(c1.get().active());

        // Non-candidate (user 7 = staff1, user 4 = hr1) -> empty
        assertTrue(identityPublicService.findCandidateSyncTargetByUserId(7L).isEmpty());
        assertTrue(identityPublicService.findCandidateSyncTargetByUserId(4L).isEmpty());
        assertTrue(identityPublicService.findCandidateSyncTargetByUserId(999999L).isEmpty());
        assertTrue(identityPublicService.findCandidateSyncTargetByUserId(null).isEmpty());
    }

    @Test
    @DisplayName("findActiveSyncCandidates returns only ACTIVE candidates with non-blank lmsUserId")
    void findActiveSyncCandidatesExcludesLockedAndBlankLmsUsers() {
        Role candidateRole = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User lockedCand =
                new User(
                        "locked.sync@rikkeijobs.test",
                        "hash",
                        "Locked Sync Candidate",
                        "lms-locked-1",
                        candidateRole,
                        null);
        lockedCand.setStatus(UserStatus.LOCKED);
        lockedCand = userRepository.save(lockedCand);

        User blankLmsCand =
                new User(
                        "blank.lms@rikkeijobs.test",
                        "hash",
                        "Blank LMS Candidate",
                        "   ",
                        candidateRole,
                        null);
        blankLmsCand = userRepository.save(blankLmsCand);

        final Long lockedId = lockedCand.getId();
        final Long blankId = blankLmsCand.getId();
        try {
            PageResponse<CandidateSyncTargetDto> page1 =
                    identityPublicService.findActiveSyncCandidates(1, 2);
            assertEquals(2, page1.items().size());
            assertEquals(3L, page1.totalItems());
            assertEquals(2, page1.totalPages());

            PageResponse<CandidateSyncTargetDto> page2 =
                    identityPublicService.findActiveSyncCandidates(2, 2);
            assertEquals(1, page2.items().size());
            assertFalse(
                    page2.items().stream()
                            .anyMatch(
                                    c ->
                                            c.userId().equals(lockedId)
                                                    || c.userId().equals(blankId)));
        } finally {
            userRepository.deleteById(lockedId);
            userRepository.deleteById(blankId);
        }
    }

    @Test
    @DisplayName(
            "searchCandidatesForSync escapes %, _, and \\ against PostgreSQL 18.6, validates length, and masks toString")
    void searchCandidatesEscapesWildcardsAndMasksPii() {
        Role candidateRole = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User percentUser =
                userRepository.save(
                        new User(
                                "wild100%@rikkeijobs.test",
                                "hash",
                                "Nguyen 100% Special",
                                "lms-wild-pct",
                                candidateRole,
                                null));
        User underscoreUser =
                userRepository.save(
                        new User(
                                "under_score@rikkeijobs.test",
                                "hash",
                                "Tran_Under",
                                "lms-wild-und",
                                candidateRole,
                                null));
        User backslashUser =
                userRepository.save(
                        new User(
                                "slash.user@rikkeijobs.test",
                                "hash",
                                "Le\\Backslash",
                                "lms-wild-bs",
                                candidateRole,
                                null));

        try {
            // '%' must NOT act as wildcard matching all candidates
            PageResponse<CandidateSyncSummaryDto> pctHits =
                    identityPublicService.searchCandidatesForSync("  100%  ", 1, 20);
            assertEquals(1, pctHits.totalItems());
            assertEquals(percentUser.getId(), pctHits.items().getFirst().userId());

            // '_' must NOT match arbitrary single char (e.g. "Tran_Under" vs "Trần Thị Bình")
            PageResponse<CandidateSyncSummaryDto> undHits =
                    identityPublicService.searchCandidatesForSync("Tran_Under", 1, 20);
            assertEquals(1, undHits.totalItems());
            assertEquals(underscoreUser.getId(), undHits.items().getFirst().userId());

            // '\' must match literal backslash only
            PageResponse<CandidateSyncSummaryDto> bsHits =
                    identityPublicService.searchCandidatesForSync("Le\\Backslash", 1, 20);
            assertEquals(1, bsHits.totalItems());
            assertEquals(backslashUser.getId(), bsHits.items().getFirst().userId());

            // Masked toString() must not expose email or fullName
            String summaryStr = pctHits.items().getFirst().toString();
            assertFalse(summaryStr.contains("wild100%@rikkeijobs.test"));
            assertFalse(summaryStr.contains("Nguyen 100% Special"));

            // Trimmed query > 100 chars rejected
            String tooLong = "  " + "a".repeat(101) + "  ";
            assertThrows(
                    ValidationException.class,
                    () -> identityPublicService.searchCandidatesForSync(tooLong, 1, 20));
        } finally {
            userRepository.deleteById(percentUser.getId());
            userRepository.deleteById(underscoreUser.getId());
            userRepository.deleteById(backslashUser.getId());
        }
    }
}
