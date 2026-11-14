package com.rikkei.jobs.identity.repository;

import com.rikkei.jobs.identity.model.PasswordResetToken;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    @Modifying
    @Query(
            "UPDATE PasswordResetToken t SET t.usedAt = :usedAt WHERE t.tokenHash = :tokenHash AND t.usedAt IS NULL AND t.expiresAt > :now")
    int markTokenAsUsedAtomic(
            @Param("tokenHash") String tokenHash,
            @Param("usedAt") OffsetDateTime usedAt,
            @Param("now") OffsetDateTime now);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now OR t.usedAt IS NOT NULL")
    int deleteExpiredOrUsedTokens(@Param("now") OffsetDateTime now);
}
