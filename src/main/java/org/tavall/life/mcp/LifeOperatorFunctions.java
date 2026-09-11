package org.tavall.life.mcp;

import org.tavall.ai.core.annotation.AIFunction;
import org.tavall.ai.core.annotation.AIParam;
import org.tavall.life.task.LifeTaskRecord;
import org.tavall.life.task.LifeTaskStateStore;

/** Trusted Java operator boundary. These functions are deliberately not registered in the model view. */
public final class LifeOperatorFunctions {
    private final LifeTaskStateStore stateStore;

    public LifeOperatorFunctions(LifeTaskStateStore stateStore) {
        this.stateStore = stateStore;
    }

    @AIFunction(
            name = "life_approve_action",
            description = "Approve a pending Life Agent action as a trusted human operator."
    )
    public LifeTaskRecord approve(
            @AIParam(name = "actionId", description = "Pending action identifier") String actionId,
            @AIParam(name = "approvedBy", description = "Accountable human approver") String approvedBy
    ) {
        return stateStore.approve(requireText(actionId, "actionId"), requireText(approvedBy, "approvedBy"));
    }

    @AIFunction(
            name = "life_execute_approved",
            description = "Attempt an approved action through a configured provider adapter; payment is never confirmed autonomously."
    )
    public LifeExecutionResult execute(
            @AIParam(name = "taskId", description = "Life Agent task identifier") String taskId
    ) {
        LifeTaskRecord task = stateStore.read(requireText(taskId, "taskId"));
        boolean approved = task.actions().stream().anyMatch(action -> action.approved());
        if (!approved) {
            throw new IllegalStateException("No approved action exists for task " + task.taskId());
        }
        return new LifeExecutionResult(
                task.taskId(),
                "PROVIDER_ADAPTER_REQUIRED",
                false,
                "Java authority retained the task; no external provider or payment mutation is configured in this development runtime."
        );
    }

    public record LifeExecutionResult(String taskId, String status, boolean paymentConfirmed, String message) {
    }

    private static String requireText(String value, String fieldName) {
        if (value != null && !value.isBlank()) {
            return value.trim();
        }
        throw new IllegalArgumentException(fieldName + " must not be blank");
    }
}
