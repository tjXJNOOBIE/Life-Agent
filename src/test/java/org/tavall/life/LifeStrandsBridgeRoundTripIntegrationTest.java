package org.tavall.life;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.tavall.ai.agent.strands.StrandsAgentProviderConfiguration;
import org.tavall.ai.agent.strands.StrandsBridgeMcpClient;
import org.tavall.ai.core.annotation.AIFunction;
import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.ai.core.catalog.AIFunctionCatalogView;
import org.tavall.ai.mcp.server.AIFunctionMcpHttpServer;

import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Physical Java -> standalone Strands stdio MCP -> Java Streamable HTTP MCP round trip. */
class LifeStrandsBridgeRoundTripIntegrationTest {
    @Test
    void standaloneBridgeConnectsBackToAuthorizedLifeFunctionCatalog() {
        String node = System.getenv("STRANDS_BRIDGE_INTEGRATION_NODE");
        String entrypoint = System.getenv("STRANDS_BRIDGE_INTEGRATION_ENTRYPOINT");
        boolean required = Boolean.getBoolean("strands.bridge.integration.required");
        if (!required) {
            Assumptions.assumeTrue(node != null && !node.isBlank() && entrypoint != null && !entrypoint.isBlank());
        }
        assertThat(node).isNotBlank();
        assertThat(entrypoint).isNotBlank();

        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        AIFunctionCatalog catalog = new AIFunctionCatalog(objectMapper);
        catalog.registerInstances(new IntegrationFunctions());
        AIFunctionCatalogView authorizedView = new AIFunctionCatalogView(
                catalog, function -> "life_visible".equals(function.getName())
        );
        assertThat(authorizedView.getFunctionDefinitions()).containsKey("life_visible");
        assertThat(authorizedView.getFunctionDefinitions()).doesNotContainKey("life_payment");

        Map<String, String> environment = new LinkedHashMap<>();
        copyEnvironment("HOME", environment);
        copyEnvironment("PATH", environment);
        copyEnvironment("TMPDIR", environment);
        StrandsAgentProviderConfiguration configuration = StrandsAgentProviderConfiguration.node(
                Path.of(node), Path.of(entrypoint), environment, Duration.ofSeconds(20), ""
        );

        try (AIFunctionMcpHttpServer functionServer = AIFunctionMcpHttpServer.start(authorizedView);
             StrandsBridgeMcpClient bridge = new StrandsBridgeMcpClient(configuration)) {
            Map<String, Object> javaFunctions = new LinkedHashMap<>();
            javaFunctions.put("url", functionServer.endpointUri().toString());
            javaFunctions.put("transport", "streamable-http");
            javaFunctions.put("prefix", "life");
            javaFunctions.put("toolFilters", Map.of("allowed", List.of("life_visible", "life_payment")));
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("agent", Map.of("id", "life-java-round-trip", "name", "Life Java Round Trip", "printer", false));
            config.put("mcpServers", Map.of("java-life-authority", javaFunctions));
            bridge.createAgent(config);
            bridge.closeAgent("life-java-round-trip");
        } finally {
            authorizedView.revoke();
        }
    }

    private static void copyEnvironment(String key, Map<String, String> target) {
        String value = System.getenv(key);
        if (value != null && !value.isBlank()) {
            target.put(key, value);
        }
    }

    static final class IntegrationFunctions {
        @AIFunction(name = "life_visible", description = "A safe Life observation capability.")
        public Map<String, Object> visible() {
            return Map.of("visible", true);
        }

        @AIFunction(name = "life_payment", description = "A payment mutation that must never reach the model.")
        public Map<String, Object> payment() {
            return Map.of("payment", true);
        }
    }
}
