package org.tavall.life;

import org.junit.jupiter.api.Test;
import org.tavall.life.mcp.LifeMcpUiSurface;

import static org.assertj.core.api.Assertions.assertThat;

class LifeMcpUiSurfaceTest {
    @Test
    void exposesAllSevenJavaOwnedMcpAppResources() {
        assertThat(LifeMcpUiSurface.resources()).hasSize(7);
        assertThat(LifeMcpUiSurface.resourceUris()).containsExactly(
                "ui://life-agent/choices-v2.html",
                "ui://life-agent/commitment-v2.html",
                "ui://life-agent/handoff-v2.html",
                "ui://life-agent/execution-v2.html",
                "ui://life-agent/outcome-v2.html",
                "ui://life-agent/settings-v2.html",
                "ui://life-agent/capability-route-v2.html"
        );
    }
}
