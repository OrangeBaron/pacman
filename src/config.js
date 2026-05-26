export const CONFIG = {
    MAP_SIZE: 21,
    CELL_SIZE: 2.0,
    PLAYER_SPEED: 2.0,
    PLAYER_RADIUS: 0.4,
    COLORS: {
        BG: 0x020202,
        WALL: 0x555555,
        FLOOR_NORMAL: 0x333333,
        FLOOR_GHOST_BASE: 0x222266,
        FLOOR_WEAPON: 0x666622,
    }
};

export const OFFSET = {
    X: -Math.floor(CONFIG.MAP_SIZE / 2),
    Z: -Math.floor(CONFIG.MAP_SIZE / 2)
};

export const STATS = {
    totalCoins: 0,
    coinsCollected: 0,
    timesDiscovered: 0,
    ghostsDefeated: 0,
    shotsFired: 0,
    shotsHit: 0
};