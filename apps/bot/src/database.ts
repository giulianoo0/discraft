import { Database } from "bun:sqlite";
import path from "path";

const DB_PATH = path.join(import.meta.dir, "..", "data", "bot.db");
console.log("[Database] Using database at:", DB_PATH);

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
await Bun.write(path.join(dataDir, ".gitkeep"), "");

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS status_message (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS server_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_online INTEGER DEFAULT 0,
    player_count INTEGER DEFAULT 0,
    public_ip TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize server_state if not exists
db.run("INSERT OR IGNORE INTO server_state (id, is_online, player_count) VALUES (1, 0, 0)");

export interface StatusMessage {
    message_id: string;
    channel_id: string;
}

export interface ServerState {
    is_online: boolean;
    player_count: number;
    public_ip: string | null;
}

// Status message operations
export function getStatusMessage(): StatusMessage | null {
    const row = db
        .query("SELECT message_id, channel_id FROM status_message WHERE id = 1")
        .get() as { message_id: string; channel_id: string } | null;
    return row;
}

export function saveStatusMessage(messageId: string, channelId: string): void {
    db.run(
        `INSERT INTO status_message (id, message_id, channel_id, updated_at) 
     VALUES (1, ?1, ?2, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET 
       message_id = excluded.message_id,
       channel_id = excluded.channel_id,
       updated_at = CURRENT_TIMESTAMP`,
        [messageId, channelId]
    );
}

// Server state operations
export function getServerState(): ServerState {
    const row = db
        .query("SELECT is_online, player_count, public_ip FROM server_state WHERE id = 1")
        .get() as { is_online: number; player_count: number; public_ip: string | null };

    return {
        is_online: row.is_online === 1,
        player_count: row.player_count,
        public_ip: row.public_ip,
    };
}

export function updateServerState(
    isOnline: boolean,
    playerCount?: number,
    publicIp?: string
): void {
    const current = getServerState();

    db.run(
        `UPDATE server_state SET 
       is_online = ?1,
       player_count = ?2,
       public_ip = ?3,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
        [
            isOnline ? 1 : 0,
            playerCount ?? current.player_count,
            publicIp ?? current.public_ip,
        ]
    );
}

export function updatePlayerCount(count: number): void {
    db.run(
        `UPDATE server_state SET player_count = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [count]
    );
}

export function updatePublicIp(ip: string): void {
    db.run(
        `UPDATE server_state SET public_ip = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [ip]
    );
}

export default db;
