import * as THREE from 'three';
import { Pathfinding } from './Pathfinding.js';
import { createGhostMesh } from './GhostModel.js';
import { STATS } from './config.js';

export class Ghost {
    constructor(scene, startX, startZ, cellSize, offsetX, offsetZ, levelMap, audioManager) {
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
        this.levelMap = levelMap;
        
        // Moduli delegati
        this.pathfinder = new Pathfinding(levelMap, cellSize, offsetX, offsetZ);
        const model = createGhostMesh();
        
        this.mesh = model.mesh;
        this.faceMat = model.faceMat;
        this.textures = model.textures;
        this.ghostMat = model.ghostMat;
        
        this.mesh.position.set(startX, 1.0, startZ);
        scene.add(this.mesh);

        // --- VARIABILI DI STATO E NAVIGAZIONE ---
        this.state = 'PATROL'; 
        this.baseSpeed = 1.5;
        this.huntSpeed = 2.5; 
        this.speed = this.baseSpeed;
        this.lightColor = new THREE.Color(0x00ffff);
        this.direction = new THREE.Vector3(0, 0, 1);
        this.lastDecisionGrid = { x: -1, z: -1 };
        
        this.lastSeenPlayerGrid = null;
        this.investigateTargetGrid = null; 
        this.targetQuaternion = new THREE.Quaternion();
        this.gameStarted = false;

        this.initAudio(audioManager);
        this.pickRandomDirection();
    }

    initAudio(audioManager) {
        // Usiamo l'AudioManager centrale per istanziare e pre-caricare i suoni posizionali 3D
        this.audioNormal = audioManager.createPositionalSound('./assets/normal.mp3', 3, true, () => {
            if (this.gameStarted && this.state !== 'HUNT' && this.state !== 'STUNNED') {
                this.audioNormal.play();
            }
        });

        this.audioFast = audioManager.createPositionalSound('./assets/fast.mp3', 5, true);
        this.audioAlert = audioManager.createPositionalSound('./assets/alert.mp3', 5, false);

        this.mesh.add(this.audioNormal);
        this.mesh.add(this.audioFast);
        this.mesh.add(this.audioAlert);
    }

    stopAllAudio() {
        if (this.audioNormal && this.audioNormal.isPlaying) this.audioNormal.pause();
        if (this.audioFast && this.audioFast.isPlaying) this.audioFast.pause();
        if (this.audioAlert && this.audioAlert.isPlaying) this.audioAlert.pause();
    }

    onGameStart() {
        this.gameStarted = true;
        if (this.audioNormal.buffer && !this.audioNormal.isPlaying && this.state !== 'HUNT' && this.state !== 'STUNNED') {
            this.audioNormal.play();
        }
    }

    takeDamage() {
        // Se non è già stordito, cambia lo stato
        if (this.state !== 'STUNNED') {
            STATS.ghostsDefeated++;
            this.changeState('STUNNED');
        }
    }

    changeState(newState) {
        if (this.state === newState) return; 
        
        // Se passiamo a HUNT da un altro stato, significa che ci ha scoperti
        if (newState === 'HUNT' && this.state !== 'HUNT') {
            STATS.timesDiscovered++;
        }

        this.state = newState;

        // Reset visivo base per tutti gli stati normali
        this.ghostMat.color.setHex(0xffffff);
        this.ghostMat.opacity = 1.0;

        if (this.state === 'STUNNED') {
            this.faceMat.map = this.textures.stunned;
            this.lightColor.setHex(0x000000);
            this.ghostMat.color.setHex(0x3366ff);
            this.ghostMat.opacity = 0.5;
            this.speed = this.huntSpeed;
            
            // Disattiva tutti i suoni che provengono dal fantasma quando è stordito
            if (this.audioNormal.isPlaying) this.audioNormal.pause();
            if (this.audioFast.isPlaying) this.audioFast.pause();
            if (this.audioAlert.isPlaying) this.audioAlert.pause();

        } else if (this.state === 'HUNT') {
            this.faceMat.map = this.textures.angry;
            this.lightColor.setHex(0xff0000); 
            this.speed = this.huntSpeed;
            if (this.audioNormal.isPlaying) this.audioNormal.pause();
            if (this.audioFast.buffer && !this.audioFast.isPlaying) this.audioFast.play();
            if (this.audioAlert.buffer && !this.audioAlert.isPlaying) this.audioAlert.play();
        } else if (this.state === 'INVESTIGATE') {
            this.faceMat.map = this.textures.curious;
            this.lightColor.setHex(0xffaa00); 
            this.speed = this.baseSpeed;
            if (this.audioFast.isPlaying) this.audioFast.pause();
            if (this.audioNormal.buffer && !this.audioNormal.isPlaying) this.audioNormal.play();
        } else { // PATROL
            this.faceMat.map = this.textures.normal;
            this.lightColor.setHex(0xaaffff); 
            this.speed = this.baseSpeed;
            if (this.audioFast.isPlaying) this.audioFast.pause();
            if (this.audioNormal.buffer && !this.audioNormal.isPlaying) this.audioNormal.play();
        }
    }

    hearNoise(worldX, worldZ, noiseRadius) {
        // Ignora i rumori se sta cacciando o se è già stordito e sta scappando
        if (this.state === 'HUNT' || this.state === 'STUNNED') return; 
        
        const dist = Math.hypot(this.mesh.position.x - worldX, this.mesh.position.z - worldZ);
        if (dist <= noiseRadius) {
            this.investigateTargetGrid = this.pathfinder.getGridPos(worldX, worldZ);
            this.changeState('INVESTIGATE');
        }
    }

    pickRandomDirection() { 
        const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]; 
        this.direction = dirs[Math.floor(Math.random() * dirs.length)]; 
    }
    
    getFacingDirection() { return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize(); }

    update(delta, playerPos) {
        const currentX = this.mesh.position.x;
        const currentZ = this.mesh.position.z;
        const gridPos = this.pathfinder.getGridPos(currentX, currentZ);
        const playerGridPos = this.pathfinder.getGridPos(playerPos.x, playerPos.z);
        
        // --- 1. CONTROLLO VISIONE (Line of Sight) ---
        if (this.state !== 'STUNNED') {
            const distToPlayer = this.mesh.position.distanceTo(playerPos);
            if (distToPlayer < 20.0) {
                const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
                toPlayer.y = 0; 
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
                
                if (forward.dot(toPlayer) > 0.6) { 
                    if (this.pathfinder.checkLineOfSight(gridPos.x, gridPos.z, playerGridPos.x, playerGridPos.z)) {
                        this.lastSeenPlayerGrid = { x: playerGridPos.x, z: playerGridPos.z };
                        this.changeState('HUNT');
                    }
                }
            }
        }

        // --- 2. MOVIMENTO E DECISIONI (A*) ---
        const cellCenterX = (gridPos.x + this.offsetX) * this.cellSize;
        const cellCenterZ = (gridPos.z + this.offsetZ) * this.cellSize;
        const distToCenter = Math.hypot(currentX - cellCenterX, currentZ - cellCenterZ);

        if (distToCenter < 0.1 && (this.lastDecisionGrid.x !== gridPos.x || this.lastDecisionGrid.z !== gridPos.z)) {
            this.lastDecisionGrid = { x: gridPos.x, z: gridPos.z };
            let decided = false;

            if (this.state === 'STUNNED') {
                // Calcola dinamicamente il centro della mappa per la rigenerazione
                const centerX = Math.floor(this.levelMap[0].length / 2);
                const centerZ = Math.floor(this.levelMap.length / 2);

                if (gridPos.x === centerX && gridPos.z === centerZ) {
                    // Arrivato al centro! Torna in pattugliamento attivo
                    this.changeState('PATROL');
                } else {
                    const path = this.pathfinder.findPath(gridPos.x, gridPos.z, centerX, centerZ);
                    if (path && path.length > 0) {
                        this.direction = path[0]; 
                        decided = true;
                    }
                }
            } else if (this.state === 'HUNT' && this.lastSeenPlayerGrid) {
                const path = this.pathfinder.findPath(gridPos.x, gridPos.z, this.lastSeenPlayerGrid.x, this.lastSeenPlayerGrid.z);
                if (path && path.length > 0) {
                    this.direction = path[0]; 
                    decided = true;
                } else {
                    this.lastSeenPlayerGrid = null;
                    this.changeState('PATROL');
                }
            } else if (this.state === 'INVESTIGATE' && this.investigateTargetGrid) {
                const path = this.pathfinder.findPath(gridPos.x, gridPos.z, this.investigateTargetGrid.x, this.investigateTargetGrid.z);
                if (path && path.length > 0) {
                    this.direction = path[0];
                    decided = true;
                } else {
                    this.investigateTargetGrid = null;
                    this.changeState('PATROL');
                }
            }

            if (!decided) {
                const validDirs = this.pathfinder.getValidDirections(gridPos.x, gridPos.z);
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

        // --- 3. APPLICAZIONE FISICA E ROTAZIONE ---
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * delta));
        const targetLookPos = this.mesh.position.clone().add(this.direction);
        const dummyMatrix = new THREE.Matrix4().lookAt(this.mesh.position, targetLookPos, new THREE.Vector3(0, 1, 0));
        this.targetQuaternion.setFromRotationMatrix(dummyMatrix);
        this.mesh.quaternion.slerp(this.targetQuaternion, 10 * delta);
        
        // --- 4. ANIMAZIONE DI FLUTTUAZIONE (Bobbing effect) ---
        const time = Date.now() * 0.004; 
        this.mesh.position.y = 1.0 + Math.sin(time) * 0.1;
    }
}