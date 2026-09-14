package org.tavall.life.mcp;

import org.tavall.ai.core.annotation.AIFunction;
import org.tavall.ai.core.annotation.AIParam;
import org.tavall.life.task.LifeTaskRecord;
import org.tavall.life.task.LifeTaskStateStore;

import java.util.List;

/** Model-safe Life Agent capability projection. Consequential effects stop at a human approval boundary. */
public final class LifeAgentFunctions {
    private final LifeTaskStateStore stateStore;

    public LifeAgentFunctions(LifeTaskStateStore stateStore) {
        this.stateStore = stateStore;
    }

    @AIFunction(
            name = "life_plan",
            description = "Create a bounded Life Agent task plan for an outcome. Planning does not authenticate, pay, or mutate a provider."
    )
    public LifeTaskRecord plan(
            @AIParam(name = "outcome", description = "The real-life outcome the user wants") String outcome
    ) {
        return stateStore.create(requireText(outcome, "outcome"));
    }

    @AIFunction(
            name = "life_task_status",
            description = "Read the deterministic task and approval state for a Life Agent task."
    )
    public LifeTaskRecord status(
            @AIParam(name = "taskId", description = "Life Agent task identifier") String taskId
    ) {
        return stateStore.read(requireText(taskId, "taskId"));
    }

    @AIFunction(
            name = "life_request_action",
            description = "Request a provider action. Java records it as waiting for explicit human approval; the model cannot approve or execute it."
    )
    public LifeTaskRecord requestAction(
            @AIParam(name = "taskId", description = "Life Agent task identifier") String taskId,
            @AIParam(name = "provider", description = "Connected provider selected by the host") String provider,
            @AIParam(name = "action", description = "Bounded provider action description") String action,
            @AIParam(name = "paymentRequired", description = "Whether explicit payment approval is required") boolean paymentRequired
    ) {
        return stateStore.requestAction(
                requireText(taskId, "taskId"),
                requireText(provider, "provider"),
                requireText(action, "action"),
                paymentRequired
        );
    }

    @AIFunction(
            name = "life_provider_capabilities",
            description = "Report the provider boundary and preferred SSO family without exposing credentials."
    )
    public LifeCapabilityReport capabilities() {
        return new LifeCapabilityReport(
                List.of("Google", "Microsoft", "GitHub", "Discord", "Apple"),
                List.of("calendar", "email verification", "travel search", "reservation", "notification"),
                true,
                true,
                "Provider credentials, browser sessions, and payment confirmation remain outside the model function view."
        );
    }

    public record LifeCapabilityReport(
            List<String> preferredIdentityProviders,
            List<String> supportedCapabilityFamilies,
            boolean paymentRequiresHumanApproval,
            boolean browserSessionsAreEphemeral,
            String boundary
    ) {
        public LifeCapabilityReport {
            preferredIdentityProviders = List.copyOf(preferredIdentityProviders);
            supportedCapabilityFamilies = List.copyOf(supportedCapabilityFamilies);
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value != null && !value.isBlank()) {
            return value.trim();
        }
        throw new IllegalArgumentException(fieldName + " must not be blank");
    }
}
