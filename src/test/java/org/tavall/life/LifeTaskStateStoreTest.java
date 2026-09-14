package org.tavall.life;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.tavall.life.task.LifeTaskRecord;
import org.tavall.life.task.LifeTaskStateStore;
import org.tavall.life.task.LifeTaskStatus;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LifeTaskStateStoreTest {
    @Test
    void recordsHumanApprovalBeforeAnyProviderExecution() throws Exception {
        LifeTaskStateStore store = new LifeTaskStateStore(
                new ObjectMapper().findAndRegisterModules(),
                Files.createTempDirectory("life-task-")
        );
        LifeTaskRecord planned = store.create("Book a refundable flight");
        LifeTaskRecord pending = store.requestAction(planned.taskId(), "travel", "hold the selected itinerary", true);

        assertThat(pending.status()).isEqualTo(LifeTaskStatus.WAITING_FOR_HUMAN);
        assertThat(pending.actions()).singleElement().satisfies(action -> {
            assertThat(action.paymentRequired()).isTrue();
            assertThat(action.approved()).isFalse();
        });

        LifeTaskRecord approved = store.approve(pending.actions().getFirst().actionId(), "operator@example.test");
        assertThat(approved.status()).isEqualTo(LifeTaskStatus.EXECUTING);
        assertThat(approved.actions().getFirst().approvedBy()).isEqualTo("operator@example.test");
    }

    @Test
    void rejectsUnknownTaskIdentifiers() throws Exception {
        LifeTaskStateStore store = new LifeTaskStateStore(
                new ObjectMapper().findAndRegisterModules(),
                Files.createTempDirectory("life-task-missing-")
        );
        assertThatThrownBy(() -> store.read("missing-task"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown Life Agent task");
    }
}
