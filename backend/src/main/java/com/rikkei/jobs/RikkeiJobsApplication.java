package com.rikkei.jobs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Rikkei Jobs Application Entry Point. Modular Monolith architecture for connecting students with
 * businesses based on verified skills.
 */
@SpringBootApplication
public class RikkeiJobsApplication {

    public static void main(String[] args) {
        SpringApplication.run(RikkeiJobsApplication.class, args);
    }
}
