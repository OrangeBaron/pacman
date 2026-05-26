export function generateMaze(width, height) {
    width = width % 2 === 0 ? width + 1 : width;
    height = height % 2 === 0 ? height + 1 : height;

    const map = Array.from({ length: height }, () => Array(width).fill(1));

    // 1. Algoritmo Recursive Backtracking per scavare il percorso
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

    // 2. Rimuoviamo i vicoli ciechi per creare i "Loop" in stile Pac-Man
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

    // 3. Creiamo la Base dei Fantasmi al centro
    const cy = Math.floor(height / 2);
    const cx = Math.floor(width / 2);
    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            map[cy + i][cx + j] = 2;
        }
    }
    map[cy - 2][cx] = 0;

    // 4. Punti di Spawn per le Armi agli angoli della mappa
    map[1][1] = 3;
    map[1][width-2] = 3;
    map[height-2][1] = 3;
    map[height-2][width-2] = 3;

    return map;
}