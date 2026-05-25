import * as THREE from 'three';

export class Ghost {
    constructor(scene, startX, startZ, cellSize, offsetX, offsetZ, levelMap, audioListener) {
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
        this.levelMap = levelMap;
        
        this.mesh = new THREE.Group();
        this.mesh.position.set(startX, 1.0, startZ);
        
        // --- COSTRUZIONE MODELLO 3D ---
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
        face.position.set(0, 0.2, -0.51); 
        face.rotation.y = Math.PI; 
        this.mesh.add(face);

        scene.add(this.mesh);

        // --- VARIABILI DI STATO E NAVIGAZIONE ---
        this.state = 'PATROL'; 
        this.baseSpeed = 1.5;
        this.huntSpeed = 2.5; 
        this.speed = this.baseSpeed;
        this.lightColor = new THREE.Color(0x00ffff);
        this.direction = new THREE.Vector3(0, 0, 1);
        this.lastDecisionGrid = { x: -1, z: -1 };
        
        // Memoria
        this.lastSeenPlayerGrid = null;
        this.investigateTargetGrid = null; 
        
        this.targetQuaternion = new THREE.Quaternion();

        // --- INIZIALIZZAZIONE MODULARE ---
        this.initAudio(audioListener);
        this.pickRandomDirection();
    }

    // --- Setup Audio separato ---
    initAudio(audioListener) {
        this.audioNormal = new THREE.PositionalAudio(audioListener);
        this.audioFast = new THREE.PositionalAudio(audioListener);
        this.audioAlert = new THREE.PositionalAudio(audioListener);
        
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('../assets/normal.mp3', (buffer) => {
            this.audioNormal.setBuffer(buffer);
            this.audioNormal.setRefDistance(3);
            this.audioNormal.setLoop(true);
            if (this.state !== 'HUNT') this.audioNormal.play(); // Parte subito a meno che non stia già cacciando
        });

        audioLoader.load('../assets/fast.mp3', (buffer) => {
            this.audioFast.setBuffer(buffer);
            this.audioFast.setRefDistance(5);
            this.audioFast.setLoop(true);
        });

        audioLoader.load('../assets/alert.mp3', (buffer) => {
            this.audioAlert.setBuffer(buffer);
            this.audioAlert.setRefDistance(5);
            this.audioAlert.setLoop(false);
        });

        this.mesh.add(this.audioNormal);
        this.mesh.add(this.audioFast);
        this.mesh.add(this.audioAlert);
    }

    // --- Gestore Centrale degli Stati ---
    changeState(newState) {
        if (this.state === newState) return; // Evita di ri-applicare lo stesso stato
        this.state = newState;

        // 1. Aggiorna Grafica e Velocità
        if (this.state === 'HUNT') {
            this.faceMat.map = this.textures.angry;
            this.lightColor.setHex(0xff0000); // Rosso
            this.speed = this.huntSpeed;
        } else if (this.state === 'INVESTIGATE') {
            this.faceMat.map = this.textures.curious;
            this.lightColor.setHex(0xffaa00); // Giallo
            this.speed = this.baseSpeed;
        } else { // PATROL
            this.faceMat.map = this.textures.normal;
            this.lightColor.setHex(0xaaffff); // Bianco-azzurro
            this.speed = this.baseSpeed;
        }

        // 2. Aggiorna Audio Transizioni
        if (this.state === 'HUNT') {
            if (this.audioNormal.isPlaying) this.audioNormal.pause();
            if (this.audioFast.buffer && !this.audioFast.isPlaying) this.audioFast.play();
            if (this.audioAlert.buffer && !this.audioAlert.isPlaying) this.audioAlert.play();
        } else {
            if (this.audioFast.isPlaying) this.audioFast.pause();
            if (this.audioNormal.buffer && !this.audioNormal.isPlaying) this.audioNormal.play();
        }
    }

    // --- Sistema Uditivo ---
    hearNoise(worldX, worldZ, noiseRadius) {
        if (this.state === 'HUNT') return; // Se vede la preda, ignora i rumori

        const dist = Math.hypot(this.mesh.position.x - worldX, this.mesh.position.z - worldZ);
        if (dist <= noiseRadius) {
            this.investigateTargetGrid = this.getGridPos(worldX, worldZ);
            this.changeState('INVESTIGATE');
        }
    }

    // Metodi helper
    pickRandomDirection() { const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]; this.direction = dirs[Math.floor(Math.random() * dirs.length)]; }
    getGridPos(x, z) { return { x: Math.round((x / this.cellSize) - this.offsetX), z: Math.round((z / this.cellSize) - this.offsetZ) }; }
    getValidDirections(gridX, gridZ) { const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]; return dirs.filter(dir => { const nextZ = gridZ + dir.z; const nextX = gridX + dir.x; if (nextZ < 0 || nextZ >= this.levelMap.length || nextX < 0 || nextX >= this.levelMap[0].length) return false; return this.levelMap[nextZ][nextX] !== 1; }); }
    checkLineOfSight(gridStartX, gridStartZ, gridEndX, gridEndZ) { let x0 = gridStartX, y0 = gridStartZ; let x1 = gridEndX, y1 = gridEndZ; let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1; let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy, e2; while (true) { if (this.levelMap[y0] && this.levelMap[y0][x0] === 1) return false; if (x0 === x1 && y0 === y1) break; e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } return true; }
    findPath(startX, startZ, targetX, targetZ) { const queue = [{x: startX, z: startZ, path: []}]; const visited = new Set([`${startX},${startZ}`]); while(queue.length > 0) { const current = queue.shift(); if (current.x === targetX && current.z === targetZ) return current.path; const validDirs = this.getValidDirections(current.x, current.z); for (let dir of validDirs) { const nx = current.x + dir.x; const nz = current.z + dir.z; if (!visited.has(`${nx},${nz}`)) { visited.add(`${nx},${nz}`); queue.push({x: nx, z: nz, path: [...current.path, dir]}); } } } return null; }
    getFacingDirection() { return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize(); }

    update(delta, playerPos) {
        const currentX = this.mesh.position.x;
        const currentZ = this.mesh.position.z;
        const gridPos = this.getGridPos(currentX, currentZ);
        const playerGridPos = this.getGridPos(playerPos.x, playerPos.z);
        
        // --- 1. CONTROLLO VISIONE ---
        const distToPlayer = this.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 20.0) {
            const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            toPlayer.y = 0; 
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            
            if (forward.dot(toPlayer) > 0.6) { 
                if (this.checkLineOfSight(gridPos.x, gridPos.z, playerGridPos.x, playerGridPos.z)) {
                    this.lastSeenPlayerGrid = { x: playerGridPos.x, z: playerGridPos.z };
                    this.changeState('HUNT');
                }
            }
        }

        // --- 2. MOVIMENTO E DECISIONI ---
        const cellCenterX = (gridPos.x + this.offsetX) * this.cellSize;
        const cellCenterZ = (gridPos.z + this.offsetZ) * this.cellSize;
        const distToCenter = Math.hypot(currentX - cellCenterX, currentZ - cellCenterZ);

        if (distToCenter < 0.1 && (this.lastDecisionGrid.x !== gridPos.x || this.lastDecisionGrid.z !== gridPos.z)) {
            this.lastDecisionGrid = { x: gridPos.x, z: gridPos.z };
            let decided = false;

            // LOGICA HUNT
            if (this.state === 'HUNT' && this.lastSeenPlayerGrid) {
                const path = this.findPath(gridPos.x, gridPos.z, this.lastSeenPlayerGrid.x, this.lastSeenPlayerGrid.z);
                if (path && path.length > 0) {
                    this.direction = path[0]; 
                    decided = true;
                } else {
                    this.lastSeenPlayerGrid = null;
                    this.changeState('PATROL');
                }
            } 
            
            // LOGICA INVESTIGATE
            else if (this.state === 'INVESTIGATE' && this.investigateTargetGrid) {
                const path = this.findPath(gridPos.x, gridPos.z, this.investigateTargetGrid.x, this.investigateTargetGrid.z);
                if (path && path.length > 0) {
                    this.direction = path[0];
                    decided = true;
                } else {
                    this.investigateTargetGrid = null;
                    this.changeState('PATROL');
                }
            }

            // LOGICA PATROL 
            if (!decided) {
                const validDirs = this.getValidDirections(gridPos.x, gridPos.z);
                const backwardDir = this.direction.clone().multiplyScalar(-1);
                let possibleDirs = validDirs.filter(d => d.x !== backwardDir.x || d.z !== backwardDir.z);
                
                if (possibleDirs.length === 0) possibleDirs = validDirs; 
                const currentDirStillValid = possibleDirs.some(d => d.x === this.direction.x && d.z === this.direction.z);
                
                if (possibleDirs.length > 1 || !currentDirStillValid) {
                    this.mesh.position.set(cellCenterX, this.mesh.position.y, cellCenterZ);
                    this.direction = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                }
            }
        }

        // --- 3. APPLICAZIONE FISICA ---
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * delta));

        const targetLookPos = this.mesh.position.clone().add(this.direction);
        const dummyMatrix = new THREE.Matrix4().lookAt(this.mesh.position, targetLookPos, new THREE.Vector3(0, 1, 0));
        this.targetQuaternion.setFromRotationMatrix(dummyMatrix);
        this.mesh.quaternion.slerp(this.targetQuaternion, 10 * delta);
    }
}