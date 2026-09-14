package org.tavall.life.task;

import java.time.Instant;

public record LifeActionRecord(
        String actionId,
        String provider,
        String action,
        boolean paymentRequired,
        boolean approved,
        String approvedBy,
        String approvedAt
) {
    public LifeActionRecord {
        actionId = requireText(actionId, "actionId");
        provider = requireText(provider, "provider");
        action = requireText(action, "action");
        approvedBy = approvedBy == null ? "" : approvedBy.trim();
        approvedAt = approvedAt == null ? "" : approvedAt.trim();
        if (approved && (approvedBy.isBlank() || approvedAt.isBlank())) {
            throw new IllegalArgumentException("Approved actions require an accountable approver and timestamp");
        }
    }

    public LifeActionRecord approve(String approver) {
        String safeApprover = requireText(approver, "approvedBy");
        return new LifeActionRecord(actionId, provider, action, paymentRequired, true, safeApprover, Instant.now().toString());
    }

    private static String requireText(String value, String fieldName) {
        if (value != null && !value.isBlank()) {
            return value.trim();
        }
        throw new IllegalArgumentException(fieldName + " must not be blank");
    }
}
