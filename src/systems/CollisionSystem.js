import { CONFIG, OFFSET } from '../core/config.js';

export class CollisionSystem {
    constructor(levelMap, scene) {
        this.levelMap = levelMap;
        this.scene = scene;
    }

    // 1. GESTIONE COLLISIONI MOVIMENTO GIOCATORE
    isPlayerColliding(x, z, radius = CONFIG.PLAYER_RADIUS) {
        const points = [
            { cx: x - radius, cz: z - radius },
            { cx: x + radius, cz: z - radius },
            { cx: x - radius, cz: z + radius },
            { cx: x + radius, cz: z + radius }
        ];

        for (let p of points) {
            const gridX = Math.round((p.cx / CONFIG.CELL_SIZE) - OFFSET.X);
            const gridZ = Math.round((p.cz / CONFIG.CELL_SIZE) - OFFSET.Z);

            if (gridZ < 0 || gridZ >= this.levelMap.length || gridX < 0 || gridX >= this.levelMap[0].length) return true;
            if (this.levelMap[gridZ][gridX] === 1) return true; // 1 = Muro
        }
        return false;
    }

    // 2. GESTIONE RAYCASTING DEI PROIETTILI
    raycastShoot(raycaster) {
        const intersects = raycaster.intersectObject(this.scene, true);
        const hitData = { ghosts: [], hitWall: false };
        const hitGhostSet = new Set(); // Per evitare di contare due volte lo stesso fantasma (mesh sovrapposte)

        for (let i = 0; i < intersects.length; i++) {
            const hitObject = intersects[i].object;
            const targetData = hitObject.userData;
            
            // Ignoriamo il pulviscolo o l'arma stessa
            if (hitObject.isPoints || targetData.type === 'weapon') continue;

            if (targetData.type === 'ghost') {
                const hitGhost = targetData.entity;
                if (!hitGhostSet.has(hitGhost)) {
                    hitData.ghosts.push(hitGhost);
                    hitGhostSet.add(hitGhost);
                }
                // Continuiamo il loop per permettere la perforazione dei fantasmi
            } else if (targetData.type === 'wall') {
                hitData.hitWall = true;
                break; // Il muro ferma definitivamente il proiettile
            }
        }

        return hitData;
    }
}