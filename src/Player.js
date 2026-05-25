import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG, OFFSET } from './config.js';

export class Player {
    constructor(camera, renderer, levelMap) {
        this.camera = camera;
        this.renderer = renderer;
        this.levelMap = levelMap;
        
        this.controls = new PointerLockControls(camera, document.body);
        this.moveState = { forward: false, backward: false, left: false, right: false };
        this.direction = new THREE.Vector3();
        
        this.initControls();
    }

    initControls() {
        const instructions = document.getElementById('instructions');
        
        document.body.addEventListener('click', () => { 
            if (!this.renderer.xr.isPresenting) {
                if (!this.controls.isLocked) {
                    this.controls.lock();
                } else if (this.weapon) {
                    this.isShooting = true; 
                }
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
        if (this.isShooting && this.weapon) {
            this.weapon.shoot(ghosts);
            this.isShooting = false;
        }

        if (!this.renderer.xr.isPresenting && this.controls.isLocked) {
            this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
            this.direction.x = Number(this.moveState.right) - Number(this.moveState.left);
            this.direction.normalize();

            if (this.direction.length() > 0) {
                const forward = new THREE.Vector3();
                this.camera.getWorldDirection(forward);
                forward.y = 0; forward.normalize();

                const right = new THREE.Vector3();
                right.crossVectors(forward, this.camera.up).normalize();

                const moveX = (forward.x * this.direction.z + right.x * this.direction.x) * CONFIG.PLAYER_SPEED * delta;
                const moveZ = (forward.z * this.direction.z + right.z * this.direction.x) * CONFIG.PLAYER_SPEED * delta;

                if (!this.isColliding(this.camera.position.x + moveX, this.camera.position.z)) {
                    this.camera.position.x += moveX;
                }
                if (!this.isColliding(this.camera.position.x, this.camera.position.z + moveZ)) {
                    this.camera.position.z += moveZ;
                }
            }
        }
    }
}