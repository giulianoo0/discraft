package com.discraft;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

public class WebSocketManager {
    private static final Gson GSON = new Gson();
    private static final int RECONNECT_DELAY_SECONDS = 5;

    private final String serverUrl;
    private final Logger logger;
    private final MessageHandler messageHandler;
    private final ScheduledExecutorService scheduler;

    private WebSocketClient client;
    private volatile boolean shouldReconnect = true;
    private volatile boolean connected = false;

    public interface MessageHandler {
        void onChatReceived(String sender, String message);
    }

    public WebSocketManager(String serverUrl, Logger logger, MessageHandler handler) {
        this.serverUrl = serverUrl;
        this.logger = logger;
        this.messageHandler = handler;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "Discraft-WebSocket");
            t.setDaemon(true);
            return t;
        });
    }

    public void connectAsync() {
        scheduler.submit(this::connect);
    }

    private void connect() {
        if (!shouldReconnect)
            return;

        try {
            client = new WebSocketClient(new URI(serverUrl)) {
                @Override
                public void onOpen(ServerHandshake handshake) {
                    logger.info("Connected to Discord bot");
                    connected = true;
                }

                @Override
                public void onMessage(String message) {
                    handleMessage(message);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    connected = false;
                    if (shouldReconnect)
                        scheduleReconnect();
                }

                @Override
                public void onError(Exception ex) {
                    connected = false;
                }
            };
            client.connect();
        } catch (Exception e) {
            scheduleReconnect();
        }
    }

    private void handleMessage(String rawMessage) {
        try {
            JsonObject json = JsonParser.parseString(rawMessage).getAsJsonObject();
            String type = json.get("type").getAsString();

            if ("chat".equals(type) && messageHandler != null) {
                String sender = json.get("sender").getAsString();
                String message = json.get("message").getAsString();
                messageHandler.onChatReceived(sender, message);
            }
        } catch (Exception ignored) {
        }
    }

    private void scheduleReconnect() {
        if (shouldReconnect) {
            scheduler.schedule(this::connect, RECONNECT_DELAY_SECONDS, TimeUnit.SECONDS);
        }
    }

    public void sendStatusUpdate(boolean online, int playerCount) {
        if (!connected || client == null)
            return;

        JsonObject message = new JsonObject();
        message.addProperty("type", "status");
        message.addProperty("online", online);
        message.addProperty("playerCount", playerCount);
        send(message);
    }

    public void sendPlayerUpdate(int playerCount) {
        if (!connected || client == null)
            return;

        JsonObject message = new JsonObject();
        message.addProperty("type", "player");
        message.addProperty("count", playerCount);
        send(message);
    }

    public void sendChatMessage(String playerName, String chatMessage) {
        if (!connected || client == null)
            return;

        JsonObject message = new JsonObject();
        message.addProperty("type", "chat");
        message.addProperty("player", playerName);
        message.addProperty("message", chatMessage);
        send(message);
    }

    private void send(JsonObject message) {
        try {
            client.send(GSON.toJson(message));
        } catch (Exception ignored) {
        }
    }

    public void close() {
        shouldReconnect = false;
        connected = false;

        if (client != null) {
            try {
                client.closeBlocking();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        scheduler.shutdownNow();
    }

    public boolean isConnected() {
        return connected;
    }
}
