import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG, OFFSET } from './config.js';

export class Player {
    constructor(camera, playerRig, renderer, levelMap, scene) {
        this.camera = camera;
        this.playerRig = playerRig;
        this.renderer = renderer;
        this.levelMap = levelMap;
        this.scene = scene;
        
        this.controls = new PointerLockControls(camera, document.body);
        this.moveState = { forward: false, backward: false, left: false, right: false };
        this.direction = new THREE.Vector3();
        
        // Nuovi stati per gestire la pressione del grilletto/mouse
        this.isTriggerDown = false;
        this.triggerPressedThisFrame = false;
        
        this.initControls();
        this.initVRControls(); 
    }

    initVRControls() {
        this.controllers = [];
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            controller.addEventListener('selectstart', () => {
                this.isTriggerDown = true;
                this.triggerPressedThisFrame = true;
            });

            controller.addEventListener('selectend', () => {
                this.isTriggerDown = false;
            });

            this.scene.add(controller);
            this.controllers.push(controller);
        }
    }

    initControls() {
        const instructions = document.getElementById('instructions');
        
        // Il click sul body ora serve solo per bloccare il cursore (PointerLock)
        document.body.addEventListener('click', () => { 
            if (!this.renderer.xr.isPresenting && !this.controls.isLocked) {
                this.controls.lock();
            } 
        });

        // Gestione pressione pulsante sinistro del mouse per sparare
        document.addEventListener('mousedown', (e) => {
            if (!this.renderer.xr.isPresenting && this.controls.isLocked && e.button === 0) {
                this.isTriggerDown = true;
                this.triggerPressedThisFrame = true;
            }
        });

        // Rilascio del mouse
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isTriggerDown = false;
            }
        });
        
        this.controls.addEventListener('lock', () => instructions.style.display = 'none');
        this.controls.addEventListener('unlock', () => instructions.style.display = '');

        const handleKey = (code, isDown) => {
            if (code === 'KeyW') this.moveState.forward = isDown;
            if (code === 'KeyA') this.moveState.left = isDown;
            if (code === 'KeyS') this.moveState.backward = isDown;
            if (code === 'KeyD') this.moveState.right = isDown;
        };
        document.addEventListener('keydown', (e) => handleKey(e.code, true));
        document.addEventListener('keyup', (e) => handleKey(e.code, false));
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
            
            const shouldShoot = (wStats.automatic && this.isTriggerDown) || this.triggerPressedThisFrame;
            
            if (shouldShoot) {
                const activeController = this.renderer.xr.isPresenting ? (this.controllers[1] || this.controllers[0]) : null;
                this.weapon.shoot(ghosts, activeController);
            }
        }
        this.triggerPressedThisFrame = false;


        // --- 2. MOVIMENTO ---
        let inputX = 0;
        let inputZ = 0;

        if (!this.renderer.xr.isPresenting && this.controls.isLocked) {
            inputZ = Number(this.moveState.forward) - Number(this.moveState.backward);
            inputX = Number(this.moveState.right) - Number(this.moveState.left);
        } else if (this.renderer.xr.isPresenting) {
            const session = this.renderer.xr.getSession();
            if (session && session.inputSources) {
                for (const source of session.inputSources) {
                    if (source.gamepad && source.gamepad.axes.length >= 4) {
                        const xAxis = source.gamepad.axes[2];
                        const zAxis = source.gamepad.axes[3];
                        
                        if (Math.abs(xAxis) > 0.1) inputX = -xAxis; 
                        if (Math.abs(zAxis) > 0.1) inputZ = -zAxis; 
                    }
                }
            }
        }

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
    }
}