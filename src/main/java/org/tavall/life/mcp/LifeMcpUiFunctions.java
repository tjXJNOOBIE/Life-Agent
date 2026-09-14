package org.tavall.life.mcp;

import org.tavall.ai.core.annotation.AIFunction;
import org.tavall.ai.core.annotation.AIParam;

import java.util.Map;

/** Read-only Java MCP App render functions. They never perform provider or browser mutations. */
public final class LifeMcpUiFunctions {
    @AIFunction(name = "life_show_choices", description = "Render a sanitized Life Agent choice surface.")
    public LifeUiResult choices(@AIParam(name = "title", description = "Choice title") String title) {
        return result("choices", title);
    }

    @AIFunction(name = "life_show_commitment", description = "Render a sanitized Life Agent commitment surface.")
    public LifeUiResult commitment(@AIParam(name = "title", description = "Commitment title") String title) {
        return result("commitment", title);
    }

    @AIFunction(name = "life_show_handoff", description = "Render a sanitized user handoff surface.")
    public LifeUiResult handoff(@AIParam(name = "title", description = "Handoff title") String title) {
        return result("handoff", title);
    }

    @AIFunction(name = "life_show_execution", description = "Render a sanitized live execution surface.")
    public LifeUiResult execution(@AIParam(name = "title", description = "Execution title") String title) {
        return result("execution", title);
    }

    @AIFunction(name = "life_show_outcome", description = "Render a sanitized verified outcome surface.")
    public LifeUiResult outcome(@AIParam(name = "title", description = "Outcome title") String title) {
        return result("outcome", title);
    }

    @AIFunction(name = "life_show_settings", description = "Render a sanitized settings surface.")
    public LifeUiResult settings(@AIParam(name = "title", description = "Settings title") String title) {
        return result("settings", title);
    }

    @AIFunction(name = "life_show_capability_route", description = "Render a sanitized capability route surface.")
    public LifeUiResult capabilityRoute(@AIParam(name = "title", description = "Capability route title") String title) {
        return result("capability-route", title);
    }

    private LifeUiResult result(String surface, String title) {
        String safeTitle = title == null || title.isBlank() ? "Life Agent" : title.trim().substring(0, Math.min(title.trim().length(), 240));
        return new LifeUiResult(surface, safeTitle, Map.of("mutationAuthority", "none", "resourceUri", "ui://life-agent/" + surface + "-v2.html"));
    }

    public record LifeUiResult(String surface, String title, Map<String, String> policy) {
    }
}
