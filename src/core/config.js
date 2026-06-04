// Costanti estetiche e di base (non modificabili dal menu)
export const CONFIG = {
    CELL_SIZE: 2.0,
    PLAYER_RADIUS: 0.4,
    COLORS: {
        BG: 0x020202,
        WALL: 0x555555,
        FLOOR_NORMAL: 0x333333,
        FLOOR_GHOST_BASE: 0x222266,
        FLOOR_WEAPON: 0x666622,
    }
};

// Impostazioni di default del gioco
export const DEFAULT_SETTINGS = {
    mapSize: 21,
    ghostCount: 4,
    weaponCount: 4,
    ghostBaseSpeed: 1.5,
    ghostHuntSpeed: 2.5,
    playerSpeed: 2.0,
    turnSpeed: 2.0,
    leftHanded: false
};

// Impostazioni correnti (queste verranno sovrascritte dalla UI del Menu)
export const CURRENT_SETTINGS = { ...DEFAULT_SETTINGS };

// L'offset della griglia per centrare il labirinto (calcolato in base alla mappa)
export const OFFSET = {
    X: 0,
    Z: 0
};

// Funzione da chiamare ogni volta che si genera una nuova mappa
export function updateOffset() {
    OFFSET.X = -Math.floor(CURRENT_SETTINGS.mapSize / 2);
    OFFSET.Z = -Math.floor(CURRENT_SETTINGS.mapSize / 2);
}

// Statistiche della partita
export const STATS = {
    totalCoins: 0,
    coinsCollected: 0,
    timesDiscovered: 0,
    ghostsDefeated: 0,
    shotsFired: 0,
    shotsHit: 0
};

// Funzione per azzerare le statistiche al riavvio
export function resetStats() {
    STATS.totalCoins = 0;
    STATS.coinsCollected = 0;
    STATS.timesDiscovered = 0;
    STATS.ghostsDefeated = 0;
    STATS.shotsFired = 0;
    STATS.shotsHit = 0;
}