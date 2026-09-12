package org.tavall.life.mcp;

import org.tavall.ai.mcp.server.AIFunctionMcpStandaloneHttpServer;
import org.tavall.life.task.LifeTaskStateStore;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/** Owns the Java Life Agent public MCP lifecycle. */
public final class LifeMcpRuntime implements AutoCloseable {
    private final AIFunctionMcpStandaloneHttpServer server;
    private final AtomicBoolean closed = new AtomicBoolean();

    private LifeMcpRuntime(AIFunctionMcpStandaloneHttpServer server) {
        this.server = server;
    }

    public static LifeMcpRuntime start(LifeTaskStateStore stateStore, Map<String, String> environment) {
        LifeAgentFunctions functions = new LifeAgentFunctions(stateStore);
        org.tavall.ai.core.catalog.AIFunctionCatalog catalog = new org.tavall.ai.core.catalog.AIFunctionCatalog(
                new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules()
        );
        catalog.registerInstances(functions);
        catalog.registerInstances(new LifeMcpUiFunctions());
        int port = parsePort(environment.get("LIFE_AGENT_PORT"), 3300);
        AIFunctionMcpStandaloneHttpServer.Configuration configuration = new AIFunctionMcpStandaloneHttpServer.Configuration(
                environment.getOrDefault("LIFE_AGENT_HOST", "127.0.0.1"),
                port,
                "",
                "/mcp",
                "life-agent",
                "0.2.0",
                "Java-owned Life Agent planning and approval-boundary MCP. Provider credentials, browser sessions, and payment confirmation remain outside the model view."
        );
        return new LifeMcpRuntime(AIFunctionMcpStandaloneHttpServer.start(
                catalog,
                configuration,
                LifeMcpUiSurface.resources(),
                java.util.List.of(),
                java.util.Map.of(),
                java.util.List.of(new AIFunctionMcpStandaloneHttpServer.ServletRegistration(
                        "lifeStatus",
                        new LifeStatusServlet(),
                        java.util.List.of("/", "/healthz", "/readyz")
                )),
                java.util.List.of()
        ));
    }

    public int port() {
        return server.port();
    }

    public String endpoint() {
        return server.localEndpointUri().toString();
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            server.close();
        }
    }

    private static int parsePort(String value, int fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        int port = Integer.parseInt(value);
        if (port < 0 || port > 65_535) {
            throw new IllegalArgumentException("LIFE_AGENT_PORT must be between 0 and 65535");
        }
        return port;
    }
}
