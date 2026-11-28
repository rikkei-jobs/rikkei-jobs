package com.rikkei.jobs.candidate.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Configuration properties for NT-05 external data synchronization jobs. */
@Component
@ConfigurationProperties(prefix = "app.sync")
public class SyncProperties {

    private String nightlyCron = "0 0 1 * * *";
    private String nightlyZone = "Asia/Ho_Chi_Minh";
    private boolean onOpenEnabled = true;
    private long onOpenStalenessMinutes = 60L;
    private int nightlyPageSize = 50;

    public String getNightlyCron() {
        return nightlyCron;
    }

    public void setNightlyCron(String nightlyCron) {
        this.nightlyCron = nightlyCron;
    }

    public String getNightlyZone() {
        return nightlyZone;
    }

    public void setNightlyZone(String nightlyZone) {
        this.nightlyZone = nightlyZone;
    }

    public boolean isOnOpenEnabled() {
        return onOpenEnabled;
    }

    public void setOnOpenEnabled(boolean onOpenEnabled) {
        this.onOpenEnabled = onOpenEnabled;
    }

    public long getOnOpenStalenessMinutes() {
        return onOpenStalenessMinutes;
    }

    public void setOnOpenStalenessMinutes(long onOpenStalenessMinutes) {
        this.onOpenStalenessMinutes = onOpenStalenessMinutes;
    }

    public int getNightlyPageSize() {
        return nightlyPageSize;
    }

    public void setNightlyPageSize(int nightlyPageSize) {
        this.nightlyPageSize = nightlyPageSize;
    }
}
