package org.tavall.life.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncResourceSpecification;
import io.modelcontextprotocol.spec.McpSchema;

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
        return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"description\" content=\"Life Agent "
                + surface
                + "\"><style>body{margin:0;background:#111;color:#f5f5f7;font:15px system-ui,sans-serif}main{margin:22px;padding:22px;border:1px solid #ffffff22;border-radius:22px;background:#ffffff0d;backdrop-filter:blur(18px)}small{color:#aaa}</style></head><body><main id=\"life-agent-surface\" data-surface=\""
                + surface
                + "\"><h1>Life Agent</h1><p>"
                + surface
                + "</p><small>Java-owned, sanitized MCP App surface · 2026-01-26</small></main><script>window.addEventListener('message',event=>{if(event.data?.type==='ui/initialize'){window.parent.postMessage({type:'ui/size',height:document.body.scrollHeight},'*')}});</script></body></html>";
    }
}
