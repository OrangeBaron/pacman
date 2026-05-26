import * as THREE from 'three';
import { CONFIG, OFFSET } from './config.js';
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
        if (this.weapon && this.input.rightController) {
            if (this.weapon.mesh.parent) {
                this.weapon.mesh.parent.remove(this.weapon.mesh);
            }
            this.input.rightController.add(this.weapon.mesh);
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
            this.weapon.mesh.position.set(0.3, -0.3, -0.6);
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
        // --- 1. GESTIONE FUOCO ---
        if (this.weapon) {
            const wStats = this.weapon.stats[this.weapon.currentType];
            
            const shouldShoot = (wStats.automatic && this.input.isTriggerDown) || this.input.triggerPressedThisFrame;
            
            if (shouldShoot) {
                const activeController = this.renderer.xr.isPresenting ? this.input.rightController : null;
                this.weapon.shoot(ghosts, this.scene, activeController);
            }
        }

        // --- 2. GESTIONE MOVIMENTO ---
        const { inputX, inputZ } = this.input.getMovementAxes(delta);
        const dirVector = new THREE.Vector2(inputX, inputZ).normalize();
        
        if (dirVector.lengthSq() > 0) {
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0; 
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, this.camera.up).normalize();

            const moveX = (forward.x * dirVector.y + right.x * dirVector.x) * CONFIG.PLAYER_SPEED * delta;
            const moveZ = (forward.z * dirVector.y + right.z * dirVector.x) * CONFIG.PLAYER_SPEED * delta;

            if (!this.isColliding(this.playerRig.position.x + moveX, this.playerRig.position.z)) {
                this.playerRig.position.x += moveX;
            }
            if (!this.isColliding(this.playerRig.position.x, this.playerRig.position.z + moveZ)) {
                this.playerRig.position.z += moveZ;
            }
        }

        // --- 3. RESET DATI FRAME CORRENTE ---
        this.input.resetFrameData();
    }
}