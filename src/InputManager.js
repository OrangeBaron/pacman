import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CURRENT_SETTINGS } from './config.js';

export class InputManager {
    constructor(camera, renderer, playerRig, onSessionStart, onSessionEnd) {
        this.camera = camera;
        this.renderer = renderer;
        this.playerRig = playerRig;
        
        this.controls = new PointerLockControls(camera, document.body);
        this.moveState = { forward: false, backward: false, left: false, right: false };
        
        this.isTriggerDown = false;
        this.triggerPressedThisFrame = false;
        
        this.rightController = null;
        this.leftController = null;
        this.controllers = [];

        this.initFlatControls();
        this.initVRControls(onSessionStart, onSessionEnd);
    }

    initFlatControls() {
        document.body.addEventListener('click', () => { 
            if (!this.renderer.xr.isPresenting && !this.controls.isLocked) {
                const isMenuVisible = document.getElementById('ui-layer').style.display !== 'none';
                if (!isMenuVisible) {
                    this.controls.lock();
                }
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
        
        const handleKey = (code, isDown) => {
            if (code === 'KeyW') this.moveState.forward = isDown;
            if (code === 'KeyA') this.moveState.left = isDown;
            if (code === 'KeyS') this.moveState.backward = isDown;
            if (code === 'KeyD') this.moveState.right = isDown;
        };
        
        document.addEventListener('keydown', (e) => handleKey(e.code, true));
        document.addEventListener('keyup', (e) => handleKey(e.code, false));
    }

    initVRControls(onSessionStart, onSessionEnd) {
        // Determiniamo quale mano spara
        const fireHand = CURRENT_SETTINGS.leftHanded ? 'left' : 'right';

        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            controller.addEventListener('connected', (event) => {
                const xrInputSource = event.data;
                controller.handedness = xrInputSource.handedness;
                
                if (xrInputSource.handedness === 'right') {
                    this.rightController = controller;
                } else if (xrInputSource.handedness === 'left') {
                    this.leftController = controller;
                }

                // Avvia la sessione quando viene connesso il controller che impugna l'arma
                if (xrInputSource.handedness === fireHand && this.renderer.xr.isPresenting && onSessionStart) {
                    onSessionStart();
                }
            });

            // Ascoltiamo il grilletto sulla mano che spara
            controller.addEventListener('selectstart', () => {
                if (controller.handedness === fireHand) {
                    this.isTriggerDown = true;
                    this.triggerPressedThisFrame = true;
                }
            });

            controller.addEventListener('selectend', () => {
                if (controller.handedness === fireHand) {
                    this.isTriggerDown = false;
                }
            });

            this.playerRig.add(controller);
            this.controllers.push(controller);
        }

        this.renderer.xr.addEventListener('sessionstart', () => { if (onSessionStart) onSessionStart(); });
        this.renderer.xr.addEventListener('sessionend', () => { if (onSessionEnd) onSessionEnd(); });
    }

    getMovementAxes(delta) {
        let inputX = 0;
        let inputZ = 0;

        if (!this.renderer.xr.isPresenting && this.controls.isLocked) {
            inputZ = Number(this.moveState.forward) - Number(this.moveState.backward);
            inputX = Number(this.moveState.right) - Number(this.moveState.left);
        } else if (this.renderer.xr.isPresenting) {
            const session = this.renderer.xr.getSession();
            const moveHand = CURRENT_SETTINGS.leftHanded ? 'right' : 'left';
            const turnHand = CURRENT_SETTINGS.leftHanded ? 'left' : 'right';

            if (session && session.inputSources) {
                for (const source of session.inputSources) {
                    if (source.gamepad && source.gamepad.axes.length >= 4) {
                        if (source.handedness === moveHand) {
                            const xAxis = source.gamepad.axes[2];
                            const zAxis = source.gamepad.axes[3];
                            if (Math.abs(xAxis) > 0.1) inputX = xAxis;
                            if (Math.abs(zAxis) > 0.1) inputZ = -zAxis; 
                        } 
                        else if (source.handedness === turnHand) {
                            const turnAxis = source.gamepad.axes[2]; 
                            if (Math.abs(turnAxis) > 0.1) {
                                this.playerRig.rotation.y -= turnAxis * CURRENT_SETTINGS.turnSpeed * delta;
                            }
                            if (source.gamepad.buttons.length >= 6 && source.gamepad.buttons[5].pressed) {
                                session.end();
                            }
                        }
                    }
                }
            }
        }
        return { inputX, inputZ };
    }

    resetFrameData() {
        this.triggerPressedThisFrame = false;
    }

    triggerHaptic(handedness, intensity, duration) {
        if (!this.renderer.xr.isPresenting) return;
        
        const session = this.renderer.xr.getSession();
        if (session && session.inputSources) {
            for (const source of session.inputSources) {
                // Cerchiamo il controller giusto (destro o sinistro) e verifichiamo che abbia un attuatore aptico
                if (source.handedness === handedness && source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
                    source.gamepad.hapticActuators[0].pulse(intensity, duration);
                }
            }
        }
    }
}