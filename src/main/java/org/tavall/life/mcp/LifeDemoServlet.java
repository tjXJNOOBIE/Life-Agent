package org.tavall.life.mcp;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/** Serves the loopback-only Life Agent development demo site. It is a UI surface, not product authority. */
public final class LifeDemoServlet extends HttpServlet {
    private static final String DEMO_RESOURCE = "/life-agent/demo/index.html";
    private final String document = loadDocument();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String path = request.getPathInfo();
        if (path != null && !path.isBlank() && !"/".equals(path)
                && !path.matches("/(overview|plan|route|choices|commitment|handoff|execution|outcome|settings|mcp)")) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("text/html; charset=UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.getWriter().write(document);
    }

    private static String loadDocument() {
        try (InputStream input = LifeDemoServlet.class.getResourceAsStream(DEMO_RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Life Agent demo site resource is missing: " + DEMO_RESOURCE);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load Life Agent demo site", exception);
        }
    }
}
