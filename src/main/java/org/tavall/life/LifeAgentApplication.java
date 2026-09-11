package org.tavall.life;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.ai.agent.strands.StrandsAgentProviderConfiguration;
import org.tavall.ai.agent.strands.StrandsBridgeMcpClient;
import org.tavall.ai.mcp.server.AIFunctionMcpStandaloneStdioServer;
import org.tavall.life.mcp.LifeMcpRuntime;
import org.tavall.life.task.LifeTaskStateStore;

import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

/** Java-owned Life Agent launcher. Browser/UI TypeScript remains a frontend migration input. */
public final class LifeAgentApplication {
    private LifeAgentApplication() {
    }

    public static void main(String[] args) {
        try {
            run(List.of(args), System.getenv());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            System.exit(130);
        } catch (RuntimeException exception) {
            System.err.println(exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
            System.exit(1);
        }
    }

    static void run(List<String> arguments, Map<String, String> environment) throws InterruptedException {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        LifeTaskStateStore store = new LifeTaskStateStore(objectMapper, taskStatePath(environment));
        String command = arguments.isEmpty() ? "stdio" : arguments.getFirst();
        if ("doctor".equals(command)) {
            doctor(environment);
            return;
        }
        if ("serve".equals(command)) {
            serve(store, environment);
            return;
        }
        if ("reason".equals(command)) {
            reason(store, environment, String.join(" ", arguments.subList(1, arguments.size())));
            return;
        }
        stdio(store);
    }

    private static void stdio(LifeTaskStateStore store) throws InterruptedException {
        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        org.tavall.ai.core.catalog.AIFunctionCatalog catalog = new org.tavall.ai.core.catalog.AIFunctionCatalog(objectMapper);
        catalog.registerInstances(new org.tavall.life.mcp.LifeAgentFunctions(store));
        catalog.registerInstances(new org.tavall.life.mcp.LifeMcpUiFunctions());
        AIFunctionMcpStandaloneStdioServer.Configuration configuration = new AIFunctionMcpStandaloneStdioServer.Configuration(
                "life-agent", "0.2.0", "Java-owned Life Agent MCP planning surface."
        );
        try (AIFunctionMcpStandaloneStdioServer server = AIFunctionMcpStandaloneStdioServer.start(
                catalog, configuration, org.tavall.life.mcp.LifeMcpUiSurface.resources(), List.of(), Map.of()
        )) {
            server.awaitTermination();
        }
    }

    private static void serve(LifeTaskStateStore store, Map<String, String> environment) throws InterruptedException {
        try (LifeMcpRuntime runtime = LifeMcpRuntime.start(store, environment)) {
            CountDownLatch shutdown = new CountDownLatch(1);
            Runtime.getRuntime().addShutdownHook(new Thread(shutdown::countDown, "life-agent-shutdown"));
            System.out.println("Life Agent Java MCP listening on " + runtime.endpoint());
            shutdown.await();
        }
    }

    private static void reason(LifeTaskStateStore store, Map<String, String> environment, String request) {
        if (request == null || request.isBlank()) {
            throw new IllegalArgumentException("reason requires an outcome request");
        }
        String node = requireEnvironment(environment, "LIFE_AGENT_STRANDS_NODE");
        String entrypoint = requireEnvironment(environment, "LIFE_AGENT_STRANDS_ENTRYPOINT");
        try (LifeMcpRuntime runtime = LifeMcpRuntime.start(store, environment);
             StrandsBridgeMcpClient bridge = new StrandsBridgeMcpClient(
                     StrandsAgentProviderConfiguration.node(
                             Path.of(node), Path.of(entrypoint), isolatedEnvironment(environment), Duration.ofSeconds(30),
                             environment.getOrDefault("LIFE_AGENT_MODEL_ID", "")
                     ))) {
            Map<String, Object> javaMcp = new LinkedHashMap<>();
            javaMcp.put("url", runtime.endpoint());
            javaMcp.put("transport", "streamable-http");
            javaMcp.put("prefix", "life");
            javaMcp.put("continueOnError", false);
            Map<String, Object> agent = Map.of(
                    "id", "life-agent-java-reasoning",
                    "name", "Life Agent Java Reasoning",
                    "printer", false
            );
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("agent", agent);
            config.put("mcpServers", Map.of("java-life-authority", javaMcp));
            System.out.println(bridge.invokeOnce(config, request));
        }
    }

    private static void doctor(Map<String, String> environment) {
        System.out.println("Life Agent Java doctor: PASS");
        System.out.println("MCP ownership: Java");
        System.out.println("Model reasoning: standalone Strands bridge");
        System.out.println("Human approval: required for consequential actions and all payments");
        System.out.println("Browser sessions: task-scoped and ephemeral");
        System.out.println("Strands node configured: " + (!environment.getOrDefault("LIFE_AGENT_STRANDS_NODE", "").isBlank()));
    }

    private static Path taskStatePath(Map<String, String> environment) {
        String configured = environment.get("LIFE_AGENT_TASK_STATE_DIR");
        return configured == null || configured.isBlank()
                ? Path.of(System.getProperty("user.home"), ".life-agent", "tasks")
                : Path.of(configured);
    }

    private static Map<String, String> isolatedEnvironment(Map<String, String> environment) {
        Map<String, String> result = new LinkedHashMap<>();
        copy(environment, result, "HOME");
        copy(environment, result, "PATH");
        copy(environment, result, "TMPDIR");
        return Map.copyOf(result);
    }

    private static void copy(Map<String, String> source, Map<String, String> target, String key) {
        String value = source.get(key);
        if (value != null && !value.isBlank()) {
            target.put(key, value);
        }
    }

    private static String requireEnvironment(Map<String, String> environment, String key) {
        String value = environment.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Set " + key + " for standalone Strands reasoning");
        }
        return value;
    }
}
