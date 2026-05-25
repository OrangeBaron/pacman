import * as THREE from 'three';

export class Pathfinding {
    constructor(levelMap, cellSize, offsetX, offsetZ) {
        this.levelMap = levelMap;
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
    }

    getGridPos(x, z) {
        return {
            x: Math.round((x / this.cellSize) - this.offsetX),
            z: Math.round((z / this.cellSize) - this.offsetZ)
        };
    }

    getValidDirections(gridX, gridZ) {
        const dirs = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];
        return dirs.filter(dir => {
            const nextZ = gridZ + dir.z;
            const nextX = gridX + dir.x;
            if (nextZ < 0 || nextZ >= this.levelMap.length || nextX < 0 || nextX >= this.levelMap[0].length) return false;
            return this.levelMap[nextZ][nextX] !== 1;
        });
    }

    checkLineOfSight(gridStartX, gridStartZ, gridEndX, gridEndZ) {
        let x0 = gridStartX, y0 = gridStartZ;
        let x1 = gridEndX, y1 = gridEndZ;
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, e2;

        while (true) {
            if (this.levelMap[y0] && this.levelMap[y0][x0] === 1) return false;
            if (x0 === x1 && y0 === y1) break;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return true;
    }

    findPath(startX, startZ, targetX, targetZ) {
        const queue = [{ x: startX, z: startZ, path: [] }];
        const visited = new Set([`${startX},${startZ}`]);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.x === targetX && current.z === targetZ) return current.path;

            const validDirs = this.getValidDirections(current.x, current.z);
            for (let dir of validDirs) {
                const nx = current.x + dir.x;
                const nz = current.z + dir.z;
                if (!visited.has(`${nx},${nz}`)) {
                    visited.add(`${nx},${nz}`);
                    queue.push({ x: nx, z: nz, path: [...current.path, dir] });
                }
            }
        }
        return null;
    }
}