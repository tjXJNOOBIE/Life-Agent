package org.tavall.life.task;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

/** Owns local development task checkpoints without persisting credentials or browser sessions. */
public final class LifeTaskStateStore {
    private final ObjectMapper objectMapper;
    private final Path root;

    public LifeTaskStateStore(ObjectMapper objectMapper, Path root) {
        this.objectMapper = objectMapper;
        this.root = root.toAbsolutePath().normalize();
    }

    public LifeTaskRecord create(String outcome) {
        String taskId = UUID.randomUUID().toString();
        LifeTaskRecord record = LifeTaskRecord.planning(taskId, outcome);
        write(record);
        return record;
    }

    public LifeTaskRecord read(String taskId) {
        Path path = pathFor(taskId);
        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Unknown Life Agent task: " + taskId);
        }
        try {
            return objectMapper.readValue(path.toFile(), LifeTaskRecord.class);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read Life Agent task state", exception);
        }
    }

    public LifeTaskRecord requestAction(String taskId, String provider, String action, boolean paymentRequired) {
        LifeTaskRecord current = read(taskId);
        LifeActionRecord nextAction = new LifeActionRecord(
                UUID.randomUUID().toString(), provider, action, paymentRequired, false, "", ""
        );
        LifeTaskRecord updated = current.withActions(
                LifeTaskStatus.WAITING_FOR_HUMAN,
                java.util.stream.Stream.concat(current.actions().stream(), java.util.stream.Stream.of(nextAction)).toList()
        );
        write(updated);
        return updated;
    }

    public LifeTaskRecord approve(String actionId, String approvedBy) {
        Path taskPath = findTaskContaining(actionId);
        LifeTaskRecord current = read(taskPath.getFileName().toString().replace(".json", ""));
        java.util.List<LifeActionRecord> actions = current.actions().stream()
                .map(action -> action.actionId().equals(actionId) ? action.approve(approvedBy) : action)
                .toList();
        if (actions.stream().noneMatch(action -> action.actionId().equals(actionId))) {
            throw new IllegalArgumentException("Unknown Life Agent action: " + actionId);
        }
        LifeTaskRecord updated = current.withActions(LifeTaskStatus.EXECUTING, actions);
        write(updated);
        return updated;
    }

    private void write(LifeTaskRecord record) {
        try {
            Files.createDirectories(root);
            Path target = pathFor(record.taskId());
            Path temporary = root.resolve(record.taskId() + ".json.tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(temporary.toFile(), record);
            Files.move(temporary, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to persist Life Agent task state", exception);
        }
    }

    private Path findTaskContaining(String actionId) {
        try {
            if (!Files.isDirectory(root)) {
                throw new IllegalArgumentException("Unknown Life Agent action: " + actionId);
            }
            try (java.util.stream.Stream<Path> paths = Files.list(root)) {
                return paths.filter(path -> path.getFileName().toString().endsWith(".json"))
                        .sorted(Comparator.comparing(Path::toString))
                        .filter(path -> containsAction(path, actionId))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Unknown Life Agent action: " + actionId));
            }
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to inspect Life Agent task state", exception);
        }
    }

    private boolean containsAction(Path path, String actionId) {
        try {
            LifeTaskRecord record = objectMapper.readValue(path.toFile(), LifeTaskRecord.class);
            return record.actions().stream().anyMatch(action -> action.actionId().equals(actionId));
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to inspect Life Agent task", exception);
        }
    }

    private Path pathFor(String taskId) {
        if (taskId == null || !taskId.matches("[a-zA-Z0-9-]{1,80}")) {
            throw new IllegalArgumentException("taskId must be a bounded identifier");
        }
        return root.resolve(taskId + ".json");
    }
}
