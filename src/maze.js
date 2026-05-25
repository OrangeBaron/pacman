export function generateMaze(width, height) {
    // Assicuriamoci che le dimensioni siano dispari per l'algoritmo di scavo
    width = width % 2 === 0 ? width + 1 : width;
    height = height % 2 === 0 ? height + 1 : height;

    // Inizializziamo la mappa tutta a muri (1)
    const map = Array.from({ length: height }, () => Array(width).fill(1));

    // 1. Algoritmo Recursive Backtracking per scavare il percorso (0)
    function carve(y, x) {
        map[y][x] = 0;
        // Direzioni casuali per scavare
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].sort(() => Math.random() - 0.5);

        for (let [dy, dx] of dirs) {
            const ny = y + dy * 2;
            const nx = x + dx * 2;
            // Se la cella di destinazione è nei limiti ed è un muro, rompiamo il muro in mezzo
            if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1 && map[ny][nx] === 1) {
                map[y + dy][x + dx] = 0;
                carve(ny, nx);
            }
        }
    }
    
    // Iniziamo a scavare dall'angolo in alto a sinistra
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

                // Se una cella vuota è circondata da 3 o più muri, è un vicolo cieco
                if (walls >= 3) {
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].sort(() => Math.random() - 0.5);
                    for (let [dy, dx] of dirs) {
                        const ny = y + dy;
                        const nx = x + dx;
                        // Rompiamo un muro a caso (che non sia il bordo esterno della mappa)
                        if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1 && map[ny][nx] === 1) {
                            map[ny][nx] = 0;
                            break; // Rompiamo solo un muro per vicolo cieco
                        }
                    }
                }
            }
        }
    }

    // 3. Creiamo la Base dei Fantasmi (2) al centro
    const cy = Math.floor(height / 2);
    const cx = Math.floor(width / 2);
    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            map[cy + i][cx + j] = 2; // Stanza 3x3
        }
    }
    map[cy - 2][cx] = 0; // Apertura per far uscire i fantasmi

    // 4. Punti di Spawn per le Armi (3) agli angoli della mappa
    map[1][1] = 3;
    map[1][width-2] = 3;
    map[height-2][1] = 3;
    map[height-2][width-2] = 3;

    return map;
}