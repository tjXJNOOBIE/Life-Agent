package org.tavall.life.browser;

/** Creates disposable provider sessions and makes their lifecycle explicit to the task owner. */
public final class LifeBrowserSessionService {
    public LifeEphemeralBrowserSession open(String taskId, String origin, String identityProvider) {
        return new LifeEphemeralBrowserSession(taskId, origin, identityProvider);
    }
}
