package org.tavall.life.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncResourceSpecification;
import io.modelcontextprotocol.spec.McpSchema;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Java-owned MCP App resource projection for the seven Life Agent UI surfaces. */
public final class LifeMcpUiSurface {
    public static final String MIME_TYPE = "text/html;profile=mcp-app";
    private static final List<String> SURFACES = List.of(
            "choices", "commitment", "handoff", "execution", "outcome", "settings", "capability-route"
    );

    private LifeMcpUiSurface() {
    }

    public static List<SyncResourceSpecification> resources() {
        return SURFACES.stream().map(LifeMcpUiSurface::resource).toList();
    }

    public static List<String> resourceUris() {
        return SURFACES.stream().map(LifeMcpUiSurface::uri).toList();
    }

    private static SyncResourceSpecification resource(String surface) {
        String uri = uri(surface);
        McpSchema.Resource resource = McpSchema.Resource.builder()
                .uri(uri)
                .name("life-agent-" + surface + "-ui")
                .description("Java-owned Life Agent " + surface + " MCP App surface")
                .mimeType(MIME_TYPE)
                .build();
        String document = document(surface);
        return new SyncResourceSpecification(
                resource,
                (exchange, request) -> new McpSchema.ReadResourceResult(
                        List.of(new McpSchema.TextResourceContents(uri, MIME_TYPE, document, Map.of())), null
                )
        );
    }

    private static String uri(String surface) {
        return "ui://life-agent/" + surface + "-v2.html";
    }

    private static String document(String surface) {
        try (InputStream input = LifeMcpUiSurface.class.getResourceAsStream(
                "/life-agent/life-agent-glass-ui-system.html"
        )) {
            if (input == null) {
                throw new IllegalStateException("Java Life Agent Glass UI resource is missing");
            }
            String source = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            return sanitize(source, surface);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read Java Life Agent Glass UI resource", exception);
        }
    }

    private static String sanitize(String source, String surface) {
        String sanitized = source.replaceAll(
                "url\\((['\"])https?://[^)]*?\\1\\)",
                "var(--life-agent-image, none)"
        );
        sanitized = sanitized.replaceAll(
                "(?i)<img\\s+class=\"icon\"\\s+src=\"https?://[^\"]+\">",
                "<span class=\"fallback\">•</span>"
        );
        sanitized = sanitized.replace(
                "<title>Life Agent Glass UI System</title>",
                "<title>Life Agent " + surface + "</title>"
        );
        return sanitized.replace(
                "<body>",
                "<body data-mcp-app-surface=\"" + surface + "\">"
        );
    }
}
