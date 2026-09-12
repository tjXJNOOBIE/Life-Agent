package org.tavall.life;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.ai.core.catalog.AIFunctionCatalogView;
import org.tavall.life.mcp.LifeAgentFunctions;
import org.tavall.life.mcp.LifeOperatorFunctions;
import org.tavall.life.task.LifeTaskStateStore;

import java.nio.file.Files;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class LifeAgentSecurityTest {
    @Test
    void executableModelViewExcludesApprovalAndExecutionFunctions() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        LifeTaskStateStore store = new LifeTaskStateStore(objectMapper, Files.createTempDirectory("life-security-"));
        AIFunctionCatalog catalog = new AIFunctionCatalog(objectMapper);
        catalog.registerInstances(new LifeAgentFunctions(store), new LifeOperatorFunctions(store));

        AIFunctionCatalogView modelView = new AIFunctionCatalogView(
                catalog,
                definition -> Set.of(
                        "life_plan",
                        "life_task_status",
                        "life_request_action",
                        "life_provider_capabilities"
                ).contains(definition.getName())
        );

        assertThat(modelView.getFunctionDefinitions()).containsKeys(
                "life_plan", "life_task_status", "life_request_action", "life_provider_capabilities"
        );
        assertThat(modelView.getFunctionDefinitions()).doesNotContainKeys(
                "life_approve_action", "life_execute_approved"
        );
        assertThat(modelView.allows("life_approve_action")).isFalse();
        assertThat(modelView.invokeResult("life_approve_action", objectMapper.createObjectNode()).isSuccess()).isFalse();
    }
}
