import * as THREE from 'three';
import { CONFIG, OFFSET, CURRENT_SETTINGS } from './config.js';
import { InputManager } from './InputManager.js';

export class Player {
    constructor(camera, playerRig, renderer, levelMap, scene) {
        this.camera = camera;
        this.playerRig = playerRig;
        this.renderer = renderer;
        this.levelMap = levelMap;
        this.scene = scene;
        
        this.input = new InputManager(
            camera, 
            renderer, 
            playerRig, 
            () => this.onVRSessionStart(), 
            () => this.onVRSessionEnd()
        );
    }

    onVRSessionStart() {
        // Determina il controller corretto
        const fireController = CURRENT_SETTINGS.leftHanded ? this.input.leftController : this.input.rightController;
        if (this.weapon && fireController) {
            if (this.weapon.mesh.parent) {
                this.weapon.mesh.parent.remove(this.weapon.mesh);
            }
            fireController.add(this.weapon.mesh);
            this.weapon.mesh.position.set(0, 0, 0);
            this.weapon.mesh.rotation.set(0, 0, 0);
        }
    }

    onVRSessionEnd() {
        if (this.weapon) {
            if (this.weapon.mesh.parent) {
                this.weapon.mesh.parent.remove(this.weapon.mesh);
            }
            this.camera.add(this.weapon.mesh);
            const offsetX = CURRENT_SETTINGS.leftHanded ? -0.3 : 0.3;
            this.weapon.mesh.position.set(offsetX, -0.3, -0.6);
            this.weapon.mesh.rotation.set(0, 0, 0);
        }
    }

    isColliding(x, z, radius = CONFIG.PLAYER_RADIUS) {
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
            if (this.levelMap[gridZ][gridX] === 1) return true;
        }
        return false;
    }

    update(delta, ghosts) {
        if (this.weapon) {
            const wStats = this.weapon.stats[this.weapon.currentType];
            const shouldShoot = (wStats.automatic && this.input.isTriggerDown) || this.input.triggerPressedThisFrame;
            
            if (shouldShoot) {
                // Prendi il controller attivo (destro o sinistro)
                const fireController = CURRENT_SETTINGS.leftHanded ? this.input.leftController : this.input.rightController;
                const activeController = this.renderer.xr.isPresenting ? fireController : null;
                
                const didShoot = this.weapon.shoot(ghosts, this.scene, activeController);
                
                if (didShoot && this.renderer.xr.isPresenting) {
                    const intensity = this.weapon.currentType === 'rifle' ? 0.4 : 0.8;
                    const duration = this.weapon.currentType === 'rifle' ? 50 : 100;
                    
                    // Invia l'aptica alla mano corretta
                    const fireHand = CURRENT_SETTINGS.leftHanded ? 'left' : 'right';
                    this.input.triggerHaptic(fireHand, intensity, duration);
                }
            }
        }

        // --- FEEDBACK ATTICO: BATTITO CARDIACO (PAURA) ---
        if (this.renderer.xr.isPresenting) {
            let minHuntDist = Infinity;
            // Cerchiamo il fantasma in caccia più vicino a noi
            for (let i = 0; i < ghosts.length; i++) {
                if (ghosts[i].state === 'HUNT') {
                    const dist = this.playerRig.position.distanceTo(ghosts[i].mesh.position);
                    if (dist < minHuntDist) minHuntDist = dist;
                }
            }
            
            // Se un fantasma ci ha visto ed è a meno di 15 unità di distanza
            if (minHuntDist < 15.0) {
                const time = Date.now();
                // Calcoliamo la frequenza del battito in base alla distanza (da lento a molto veloce)
                const beatInterval = Math.max(250, minHuntDist * 60); 
                
                if (time - (this.lastBeatTime || 0) > beatInterval) {
                    this.lastBeatTime = time;
                    // Pulsazione dolce e cupa su entrambi i controller
                    this.input.triggerHaptic('left', 0.3, 60);
                    this.input.triggerHaptic('right', 0.3, 60);
                }
            }
        }

        // --- MOVIMENTO ---
        const { inputX, inputZ } = this.input.getMovementAxes(delta);
        const dirVector = new THREE.Vector2(inputX, inputZ).normalize();
        
        if (dirVector.lengthSq() > 0) {
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0; 
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, this.camera.up).normalize();

            const moveX = (forward.x * dirVector.y + right.x * dirVector.x) * CURRENT_SETTINGS.playerSpeed * delta;
            const moveZ = (forward.z * dirVector.y + right.z * dirVector.x) * CURRENT_SETTINGS.playerSpeed * delta;

            if (!this.isColliding(this.playerRig.position.x + moveX, this.playerRig.position.z)) {
                this.playerRig.position.x += moveX;
            }
            if (!this.isColliding(this.playerRig.position.x, this.playerRig.position.z + moveZ)) {
                this.playerRig.position.z += moveZ;
            }
        }

        this.input.resetFrameData();
    }
}