package com.rikkei.jobs.identity.dto;

/** Command record for provisioning an HR user account across module boundaries (Rule 14). */
public record CreateHrUserCommand(Long companyId, String email, String fullName) {

    @Override
    public String toString() {
        return "CreateHrUserCommand[companyId=" + companyId + ", email=***, fullName=***]";
    }
}
