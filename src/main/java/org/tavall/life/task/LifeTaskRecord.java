package org.tavall.life.task;

import java.time.Instant;
import java.util.List;

public record LifeTaskRecord(
        String taskId,
        String outcome,
        LifeTaskStatus status,
        List<LifeActionRecord> actions,
        String createdAt,
        String updatedAt
) {
    public LifeTaskRecord {
        taskId = requireText(taskId, "taskId");
        outcome = requireText(outcome, "outcome");
        status = status == null ? LifeTaskStatus.PLANNING : status;
        actions = List.copyOf(actions == null ? List.of() : actions);
        createdAt = requireText(createdAt, "createdAt");
        updatedAt = requireText(updatedAt, "updatedAt");
    }

    public static LifeTaskRecord planning(String taskId, String outcome) {
        String now = Instant.now().toString();
        return new LifeTaskRecord(taskId, outcome, LifeTaskStatus.PLANNING, List.of(), now, now);
    }

    public LifeTaskRecord withActions(LifeTaskStatus nextStatus, List<LifeActionRecord> nextActions) {
        return new LifeTaskRecord(taskId, outcome, nextStatus, nextActions, createdAt, Instant.now().toString());
    }

    private static String requireText(String value, String fieldName) {
        if (value != null && !value.isBlank()) {
            return value.trim();
        }
        throw new IllegalArgumentException(fieldName + " must not be blank");
    }
}
