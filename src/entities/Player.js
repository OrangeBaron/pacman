import * as THREE from 'three';
import { CURRENT_SETTINGS } from '../core/config.js';
import { InputManager } from '../components/InputManager.js';

export class Player {
    constructor(camera, playerRig, renderer, collisionSystem) {
        this.camera = camera;
        this.playerRig = playerRig;
        this.renderer = renderer;
        this.collisionSystem = collisionSystem;
        
        this.input = new InputManager(
            camera, 
            renderer, 
            playerRig, 
            () => this.onVRSessionStart(), 
            () => this.onVRSessionEnd()
        );
    }

    onVRSessionStart() {
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

    update(delta, ghosts) {
        if (this.weapon) {
            const wStats = this.weapon.stats[this.weapon.currentType];
            const shouldShoot = (wStats.automatic && this.input.isTriggerDown) || this.input.triggerPressedThisFrame;
            
            if (shouldShoot) {
                const fireController = CURRENT_SETTINGS.leftHanded ? this.input.leftController : this.input.rightController;
                const activeController = this.renderer.xr.isPresenting ? fireController : null;
                
                const didShoot = this.weapon.shoot(ghosts, activeController, this.collisionSystem);
                
                if (didShoot && this.renderer.xr.isPresenting) {
                    const intensity = this.weapon.currentType === 'rifle' ? 0.4 : 0.8;
                    const duration = this.weapon.currentType === 'rifle' ? 50 : 100;
                    const fireHand = CURRENT_SETTINGS.leftHanded ? 'left' : 'right';
                    this.input.triggerHaptic(fireHand, intensity, duration);
                }
            }
        }

        if (this.renderer.xr.isPresenting) {
            let minHuntDist = Infinity;
            for (let i = 0; i < ghosts.length; i++) {
                if (ghosts[i].state === 'HUNT') {
                    const dist = this.playerRig.position.distanceTo(ghosts[i].mesh.position);
                    if (dist < minHuntDist) minHuntDist = dist;
                }
            }
            if (minHuntDist < 15.0) {
                const time = Date.now();
                const beatInterval = Math.max(250, minHuntDist * 60); 
                
                if (time - (this.lastBeatTime || 0) > beatInterval) {
                    this.lastBeatTime = time;
                    this.input.triggerHaptic('left', 0.3, 60);
                    this.input.triggerHaptic('right', 0.3, 60);
                }
            }
        }

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

            if (!this.collisionSystem.isPlayerColliding(this.playerRig.position.x + moveX, this.playerRig.position.z)) {
                this.playerRig.position.x += moveX;
            }
            if (!this.collisionSystem.isPlayerColliding(this.playerRig.position.x, this.playerRig.position.z + moveZ)) {
                this.playerRig.position.z += moveZ;
            }
        }

        this.input.resetFrameData();
    }
}