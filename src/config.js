export const CONFIG = {
    MAP_SIZE: 21,
    CELL_SIZE: 2.0,
    PLAYER_SPEED: 2.0,
    PLAYER_RADIUS: 0.4,
    COLORS: {
        BG: 0x020202,
        WALL: 0x050508,
        FLOOR_NORMAL: 0x020202,
        FLOOR_GHOST_BASE: 0x000011,
        FLOOR_WEAPON: 0x111100,
    }
};

export const OFFSET = {
    X: -Math.floor(CONFIG.MAP_SIZE / 2),
    Z: -Math.floor(CONFIG.MAP_SIZE / 2)
};