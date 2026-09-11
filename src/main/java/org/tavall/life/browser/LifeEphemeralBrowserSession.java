package org.tavall.life.browser;

import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/** A task-scoped browser boundary; no cookie, token, or profile is retained after close. */
public final class LifeEphemeralBrowserSession implements AutoCloseable {
    private final String taskId;
    private final String origin;
    private final String identityProvider;
    private final AtomicBoolean closed = new AtomicBoolean();

    public LifeEphemeralBrowserSession(String taskId, String origin, String identityProvider) {
        this.taskId = requireText(taskId, "taskId");
        this.origin = requireText(origin, "origin");
        this.identityProvider = requireText(identityProvider, "identityProvider");
        if (!origin.startsWith("https://")) {
            throw new IllegalArgumentException("Browser sessions require HTTPS origins");
        }
    }

    public String taskId() {
        return taskId;
    }

    public String origin() {
        return origin;
    }

    public String identityProvider() {
        return identityProvider;
    }

    public boolean active() {
        return !closed.get();
    }

    @Override
    public void close() {
        closed.set(true);
    }

    private static String requireText(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value.trim();
    }
}
