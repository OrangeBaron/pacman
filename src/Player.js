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
        
        // Stati per gestire la pressione del grilletto/mouse
        this.isTriggerDown = false;
        this.triggerPressedThisFrame = false;
        
        // Riferimenti specifici per i controller VR
        this.rightController = null;
        this.leftController = null;
        
        this.initControls();
        this.initVRControls(); 
    }

    initVRControls() {
        this.controllers = [];
        
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            // Identifichiamo i controller in base alla mano (handedness)
            controller.addEventListener('connected', (event) => {
                const xrInputSource = event.data;
                controller.handedness = xrInputSource.handedness;
                
                if (xrInputSource.handedness === 'right') {
                    this.rightController = controller;
                    // Se siamo già in modalità VR, agganciamo immediatamente la pistola
                    if (this.renderer.xr.isPresenting) {
                        this.attachWeaponToController();
                    }
                } else if (xrInputSource.handedness === 'left') {
                    this.leftController = controller;
                }
            });

            // Gestione fuoco basata sul controller destro
            controller.addEventListener('selectstart', () => {
                if (controller.handedness === 'right') {
                    this.isTriggerDown = true;
                    this.triggerPressedThisFrame = true;
                }
            });

            controller.addEventListener('selectend', () => {
                if (controller.handedness === 'right') {
                    this.isTriggerDown = false;
                }
            });

            // CORREZIONE CRUCIALE: I controller devono essere figli del playerRig, non della scena!
            this.playerRig.add(controller);
            this.controllers.push(controller);
        }

        // Gestione degli eventi di avvio/fine sessione VR per lo switch dell'arma
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.attachWeaponToController();
        });

        this.renderer.xr.addEventListener('sessionend', () => {
            if (this.weapon) {
                if (this.weapon.mesh.parent) {
                    this.weapon.mesh.parent.remove(this.weapon.mesh);
                }
                // Riagganciamo l'arma alla telecamera per la modalità Flat PC
                this.camera.add(this.weapon.mesh);
                this.weapon.mesh.position.set(0.3, -0.3, -0.6);
                this.weapon.mesh.rotation.set(0, 0, 0);
            }
        });
    }

    // Funzione centralizzata e sicura per muovere la mesh della pistola sul controller VR
    attachWeaponToController() {
        if (this.weapon && this.rightController) {
            if (this.weapon.mesh.parent) {
                this.weapon.mesh.parent.remove(this.weapon.mesh);
            }
            this.rightController.add(this.weapon.mesh);
            // Azzeriamo la posizione e rotazione locale in modo che la mesh si allinei 
            // perfettamente al vettore di puntamento nativo del controller VR (asse -Z)
            this.weapon.mesh.position.set(0, 0, 0);
            this.weapon.mesh.rotation.set(0, 0, 0);
        }
    }

    initControls() {
        const instructions = document.getElementById('instructions');
        
        document.body.addEventListener('click', () => { 
            if (!this.renderer.xr.isPresenting && !this.controls.isLocked) {
                this.controls.lock();
            } 
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.renderer.xr.isPresenting && this.controls.isLocked && e.button === 0) {
                this.isTriggerDown = true;
                this.triggerPressedThisFrame = true;
            }
        });

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
                const activeController = this.renderer.xr.isPresenting ? this.rightController : null;
                this.weapon.shoot(ghosts, this.scene, activeController);
            }
        }
        this.triggerPressedThisFrame = false;

        // --- 2. MOVIMENTO E INPUT ---
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
                        
                        // STICK SINISTRO
                        if (source.handedness === 'left') {
                            const xAxis = source.gamepad.axes[2];
                            const zAxis = source.gamepad.axes[3];
                            
                            if (Math.abs(xAxis) > 0.1) inputX = xAxis;
                            if (Math.abs(zAxis) > 0.1) inputZ = -zAxis; 
                        } 
                        
                        // STICK DESTRO
                        else if (source.handedness === 'right') {
                            // Smooth Turn
                            const turnAxis = source.gamepad.axes[2]; 
                            if (Math.abs(turnAxis) > 0.1) {
                                const TURN_SPEED = 2.0; 
                                this.playerRig.rotation.y -= turnAxis * TURN_SPEED * delta;
                            }

                            // Tasto B per uscire dalla VR
                            if (source.gamepad.buttons.length >= 6) {
                                if (source.gamepad.buttons[5].pressed) {
                                    session.end();
                                    return;
                                }
                            }
                        }

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