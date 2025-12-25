package com.discraft;

import org.bukkit.Bukkit;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.AsyncPlayerChatEvent;

public class Discraft extends JavaPlugin implements Listener, WebSocketManager.MessageHandler {
    private static Discraft instance;
    private WebSocketManager wsManager;

    @Override
    public void onEnable() {
        instance = this;
        saveDefaultConfig();

        String websocketUrl = getConfig().getString("websocket-url", "ws://localhost:8080");

        getServer().getPluginManager().registerEvents(this, this);

        wsManager = new WebSocketManager(websocketUrl, getLogger(), this);
        wsManager.connectAsync();

        getLogger().info("[Discraft] Loaded!");
    }

    @Override
    public void onDisable() {
        if (wsManager != null) {
            wsManager.sendStatusUpdate(false, 0);
            wsManager.close();
            wsManager = null;
        }
        instance = null;
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        if (wsManager != null) {
            wsManager.sendPlayerUpdate(getServer().getOnlinePlayers().size());
        }
    }

    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent event) {
        if (wsManager != null) {
            int count = Math.max(0, getServer().getOnlinePlayers().size() - 1);
            wsManager.sendPlayerUpdate(count);
        }
    }

    @EventHandler
    public void onPlayerChat(AsyncPlayerChatEvent event) {
        String message = event.getMessage();
        if (message.startsWith("/"))
            return;

        if (wsManager != null) {
            wsManager.sendChatMessage(event.getPlayer().getName(), message);
        }
    }

    @Override
    public void onChatReceived(String sender, String message) {
        Bukkit.getScheduler().runTask(this, () -> {
            String formatted = "§9[Discord] §f" + sender + "§7: §f" + message;
            Bukkit.broadcastMessage(formatted);
        });
    }

    public static Discraft getInstance() {
        return instance;
    }

    public int getPlayerCount() {
        return getServer().getOnlinePlayers().size();
    }
}
