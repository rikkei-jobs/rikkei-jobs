package com.rikkei.jobs.identity.dto;

/** Command record for sending an HR onboarding email outside any DB transaction. */
public record SendHrOnboardingEmailCommand(
        String email, String fullName, String companyName, String rawTemporaryPassword) {

    @Override
    public String toString() {
        return "SendHrOnboardingEmailCommand[email=***, fullName=***, companyName="
                + companyName
                + ", rawTemporaryPassword=***]";
    }
}
