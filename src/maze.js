import { CURRENT_SETTINGS } from './config.js';

export function generateMaze(width, height) {
    width = width % 2 === 0 ? width + 1 : width;
    height = height % 2 === 0 ? height + 1 : height;

    const map = Array.from({ length: height }, () => Array(width).fill(1));

    function carve(y, x) {
        map[y][x] = 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].sort(() => Math.random() - 0.5);

        for (let [dy, dx] of dirs) {
            const ny = y + dy * 2;
            const nx = x + dx * 2;
            if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1 && map[ny][nx] === 1) {
                map[y + dy][x + dx] = 0;
                carve(ny, nx);
            }
        }
    }
    
    carve(1, 1);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (map[y][x] === 0) {
                let walls = 0;
                if (map[y-1][x] === 1) walls++;
                if (map[y+1][x] === 1) walls++;
                if (map[y][x-1] === 1) walls++;
                if (map[y][x+1] === 1) walls++;

                if (walls >= 3) {
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].sort(() => Math.random() - 0.5);
                    for (let [dy, dx] of dirs) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1 && map[ny][nx] === 1) {
                            map[ny][nx] = 0;
                            break;
                        }
                    }
                }
            }
        }
    }

    const cy = Math.floor(height / 2);
    const cx = Math.floor(width / 2);
    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            map[cy + i][cx + j] = 2;
        }
    }
    map[cy - 2][cx] = 0;

    const emptyCells = [];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (map[y][x] === 0 && (y !== cy || x !== cx)) {
                emptyCells.push({x, y});
            }
        }
    }
    
    emptyCells.sort(() => Math.random() - 0.5);
    
    for(let i = 0; i < CURRENT_SETTINGS.weaponCount && i < emptyCells.length; i++) {
        map[emptyCells[i].y][emptyCells[i].x] = 3;
    }

    return map;
}