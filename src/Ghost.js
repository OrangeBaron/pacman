import * as THREE from 'three';

export class Ghost {
    constructor(scene, startX, startZ, cellSize, offsetX, offsetZ, levelMap) {
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
        this.levelMap = levelMap;
        
        this.mesh = new THREE.Group();
        this.mesh.position.set(startX, 1.0, startZ);
        
        // --- MATERIALI E TEXTURE ---
        const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const head = new THREE.Mesh(headGeo, ghostMat);
        head.position.y = 0.5;
        this.mesh.add(head);

        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, false);
        const posAttribute = bodyGeo.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            let y = posAttribute.getY(i);
            if (y < 0) {
                let x = posAttribute.getX(i);
                let z = posAttribute.getZ(i);
                let angle = Math.atan2(z, x);
                posAttribute.setY(i, y + Math.sin(angle * 8) * 0.15);
            }
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, ghostMat);
        this.mesh.add(body);

        // --- GESTIONE FACCIA ---
        const textureLoader = new THREE.TextureLoader();
        this.textures = {
            normal: textureLoader.load('../assets/normal.png'),
            curious: textureLoader.load('../assets/curious.png'),
            angry: textureLoader.load('../assets/angry.png')
        };
        
        const faceGeo = new THREE.PlaneGeometry(0.6, 0.6);
        this.faceMat = new THREE.MeshBasicMaterial({ 
            map: this.textures.normal,
            color: 0xffffff,
            transparent: true,
            alphaTest: 0.1
        });
        const face = new THREE.Mesh(faceGeo, this.faceMat);
        // Spostiamo la faccia a -0.51 (il vero "davanti")
        face.position.set(0, 0.2, -0.51); 
        // Ruotiamo il piano di 180 gradi in radianti
        face.rotation.y = Math.PI; 
        this.mesh.add(face);

        scene.add(this.mesh);

        // --- STATI E NAVIGAZIONE ---
        this.state = 'PATROL'; 
        this.baseSpeed = 1.5;
        this.huntSpeed = 2.5; 
        this.speed = this.baseSpeed;

        this.lightColor = new THREE.Color(0x00ffff);
        
        this.direction = new THREE.Vector3(0, 0, 1);
        this.lastDecisionGrid = { x: -1, z: -1 };
        
        // Memoria per l'inseguimento
        this.lastSeenPlayerGrid = null;
        
        // Per la rotazione fluida
        this.targetQuaternion = new THREE.Quaternion();

        this.pickRandomDirection();
    }

    setFace(state) {
        if (state === 'HUNT') {
            this.faceMat.map = this.textures.angry;
            this.lightColor.setHex(0xff0000); // Rosso sangue
        } else if (state === 'INVESTIGATE') {
            this.faceMat.map = this.textures.curious;
            this.lightColor.setHex(0xffaa00); // Giallo-Arancio pericolo
        } else {
            this.faceMat.map = this.textures.normal;
            this.lightColor.setHex(0x00ffff); // Azzurro spettrale
        }
    }

    pickRandomDirection() {
        const dirs = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];
        this.direction = dirs[Math.floor(Math.random() * dirs.length)];
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
        const queue = [{x: startX, z: startZ, path: []}];
        const visited = new Set([`${startX},${startZ}`]);

        while(queue.length > 0) {
            const current = queue.shift();
            if (current.x === targetX && current.z === targetZ) return current.path;

            const validDirs = this.getValidDirections(current.x, current.z);
            for (let dir of validDirs) {
                const nx = current.x + dir.x;
                const nz = current.z + dir.z;
                if (!visited.has(`${nx},${nz}`)) {
                    visited.add(`${nx},${nz}`);
                    queue.push({x: nx, z: nz, path: [...current.path, dir]});
                }
            }
        }
        return null;
    }

    getFacingDirection() {
        // Restituisce l'effettiva direzione verso cui il modello 3D sta guardando in modo fluido
        return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize();
    }

    update(delta, playerPos) {
        const currentX = this.mesh.position.x;
        const currentZ = this.mesh.position.z;
        const gridPos = this.getGridPos(currentX, currentZ);
        const playerGridPos = this.getGridPos(playerPos.x, playerPos.z);
        
        // --- CONTROLLO VISIONE (Aggiorna solo l'ultima posizione nota) ---
        const distToPlayer = this.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 20.0) {
            const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            toPlayer.y = 0; 
            // Usa la vera direzione in cui "guarda" il modello per calcolare il FOV
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            
            if (forward.dot(toPlayer) > 0.6) { // Leggermente più indulgente (circa 100°)
                if (this.checkLineOfSight(gridPos.x, gridPos.z, playerGridPos.x, playerGridPos.z)) {
                    // Memorizza dove ti ha visto!
                    this.lastSeenPlayerGrid = { x: playerGridPos.x, z: playerGridPos.z };
                    
                    if (this.state !== 'HUNT') {
                        this.state = 'HUNT';
                        this.setFace('HUNT');
                        this.speed = this.huntSpeed;
                    }
                }
            }
        }

        // --- MOVIMENTO E DECISIONI (Solo al centro della cella) ---
        const cellCenterX = (gridPos.x + this.offsetX) * this.cellSize;
        const cellCenterZ = (gridPos.z + this.offsetZ) * this.cellSize;
        const distToCenter = Math.hypot(currentX - cellCenterX, currentZ - cellCenterZ);

        // Prende una decisione solo quando passa per il centro esatto di un blocco
        if (distToCenter < 0.1 && (this.lastDecisionGrid.x !== gridPos.x || this.lastDecisionGrid.z !== gridPos.z)) {
            this.lastDecisionGrid = { x: gridPos.x, z: gridPos.z };
            
            let decided = false;

            // LOGICA HUNT
            if (this.state === 'HUNT' && this.lastSeenPlayerGrid) {
                // Calcola il pathing dal centro corrente fino all'ultimo punto in cui ha visto il player
                const path = this.findPath(gridPos.x, gridPos.z, this.lastSeenPlayerGrid.x, this.lastSeenPlayerGrid.z);
                
                if (path && path.length > 0) {
                    this.direction = path[0]; // Prende solo la prossima mossa necessaria
                    decided = true;
                } else {
                    // Ha raggiunto l'ultima posizione nota e il player non c'è più
                    this.state = 'PATROL';
                    this.setFace('NORMAL');
                    this.speed = this.baseSpeed;
                    this.lastSeenPlayerGrid = null;
                }
            } 
            
            // LOGICA PATROL (o fallback se HUNT fallisce)
            if (!decided) {
                const validDirs = this.getValidDirections(gridPos.x, gridPos.z);
                const backwardDir = this.direction.clone().multiplyScalar(-1);
                let possibleDirs = validDirs.filter(d => d.x !== backwardDir.x || d.z !== backwardDir.z);
                
                if (possibleDirs.length === 0) possibleDirs = validDirs; 

                const currentDirStillValid = possibleDirs.some(d => d.x === this.direction.x && d.z === this.direction.z);
                
                if (possibleDirs.length > 1 || !currentDirStillValid) {
                    // Snap morbido al centro per evitare derive
                    this.mesh.position.set(cellCenterX, this.mesh.position.y, cellCenterZ);
                    this.direction = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                }
            }
        }

        // --- APPLICA MOVIMENTO ---
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * delta));

        // --- APPLICA ROTAZIONE FLUIDA (Slerp) ---
        // Calcola dove dovrebbe guardare
        const targetLookPos = this.mesh.position.clone().add(this.direction);
        const dummyMatrix = new THREE.Matrix4().lookAt(this.mesh.position, targetLookPos, new THREE.Vector3(0, 1, 0));
        this.targetQuaternion.setFromRotationMatrix(dummyMatrix);
        
        // Interpola la rotazione attuale verso quella bersaglio
        // Il numero 10 controlla la velocità di rotazione (più è alto, più girano in fretta)
        this.mesh.quaternion.slerp(this.targetQuaternion, 10 * delta);
    }
}