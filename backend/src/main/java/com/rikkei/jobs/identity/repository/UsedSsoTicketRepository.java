package com.rikkei.jobs.identity.repository;

import com.rikkei.jobs.identity.model.UsedSsoTicket;
import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UsedSsoTicketRepository extends JpaRepository<UsedSsoTicket, String> {

    boolean existsByTicket(String ticket);

    /**
     * Ghi nhận vé SSO vào CSDL một cách nguyên tử (atomic check-and-insert). Sử dụng câu lệnh
     * INSERT ... ON CONFLICT (ticket) DO NOTHING của PostgreSQL. Trả về 1 nếu vé mới được lưu thành
     * công; trả về 0 nếu vé đã tồn tại (tái sử dụng vé).
     */
    @Modifying
    @Query(
            value =
                    "INSERT INTO used_sso_tickets (ticket, used_at) VALUES (:ticket, :usedAt) ON CONFLICT (ticket) DO NOTHING",
            nativeQuery = true)
    int insertIfUnused(@Param("ticket") String ticket, @Param("usedAt") OffsetDateTime usedAt);
}
