package com.rikkei.jobs.recruitment.model;

/** Lifecycle states of a job application. Shared across the entire recruitment module. */
public enum ApplicationStatus {
    SUBMITTED, // Đã gửi hồ sơ
    SCREENING, // Nhà tuyển dụng sàng lọc
    INTERVIEW, // Phỏng vấn (Rikkei Meet)
    OFFER, // Đề nghị nhận việc
    HIRED, // Đã nhận việc (trạng thái đích thành công)
    REJECTED, // Không đạt (có thể chuyển từ bất kỳ bước nào trước HIRED)
    WITHDRAWN; // Ứng viên tự rút đơn (khi chưa tới OFFER)

    /**
     * An application is open/active if it has not reached a terminal decision (HIRED, REJECTED,
     * WITHDRAWN).
     */
    public boolean isOpen() {
        return this == SUBMITTED || this == SCREENING || this == INTERVIEW || this == OFFER;
    }

    /** Candidate can withdraw application only before reaching OFFER stage. */
    public boolean canWithdraw() {
        return this == SUBMITTED || this == SCREENING || this == INTERVIEW;
    }

    /** Checks if the status is a terminal/final state. */
    public boolean isTerminal() {
        return this == HIRED || this == REJECTED || this == WITHDRAWN;
    }

    public boolean canTransitionTo(ApplicationStatus next) {
        return switch (this) {
            case SUBMITTED -> next == SCREENING || next == REJECTED;
            case SCREENING -> next == INTERVIEW || next == REJECTED;
            case INTERVIEW -> next == OFFER || next == REJECTED;
            case OFFER -> next == HIRED || next == REJECTED;
            case HIRED, REJECTED, WITHDRAWN -> false;
        };
    }
}
