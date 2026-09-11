package org.tavall.life;

import org.junit.jupiter.api.Test;
import org.tavall.life.browser.LifeEphemeralBrowserSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LifeEphemeralBrowserSessionTest {
    @Test
    void closesTaskScopedSessionWithoutRetainingCredentials() {
        LifeEphemeralBrowserSession session = new LifeEphemeralBrowserSession(
                "task-1", "https://accounts.example.test", "Google"
        );
        assertThat(session.active()).isTrue();
        session.close();
        assertThat(session.active()).isFalse();
    }

    @Test
    void rejectsPlaintextProviderOrigin() {
        assertThatThrownBy(() -> new LifeEphemeralBrowserSession("task-1", "http://accounts.example.test", "Google"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("HTTPS");
    }
}
