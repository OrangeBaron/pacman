import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class InputManager {
    constructor(camera, renderer, playerRig, onSessionStart, onSessionEnd) {
        this.camera = camera;
        this.renderer = renderer;
        this.playerRig = playerRig;
        
        // Controlli e stati Flat PC
        this.controls = new PointerLockControls(camera, document.body);
        this.moveState = { forward: false, backward: false, left: false, right: false };
        
        // Stati universali dei pulsanti/grilletti
        this.isTriggerDown = false;
        this.triggerPressedThisFrame = false;
        
        // Riferimenti VR
        this.rightController = null;
        this.leftController = null;
        this.controllers = [];

        this.initFlatControls();
        this.initVRControls(onSessionStart, onSessionEnd);
    }

    initFlatControls() {
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

    initVRControls(onSessionStart, onSessionEnd) {
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            controller.addEventListener('connected', (event) => {
                const xrInputSource = event.data;
                controller.handedness = xrInputSource.handedness;
                
                if (xrInputSource.handedness === 'right') {
                    this.rightController = controller;
                    if (this.renderer.xr.isPresenting && onSessionStart) {
                        onSessionStart();
                    }
                } else if (xrInputSource.handedness === 'left') {
                    this.leftController = controller;
                }
            });

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

            this.playerRig.add(controller);
            this.controllers.push(controller);
        }

        this.renderer.xr.addEventListener('sessionstart', () => { if (onSessionStart) onSessionStart(); });
        this.renderer.xr.addEventListener('sessionend', () => { if (onSessionEnd) onSessionEnd(); });
    }

    // Metodo universale per ottenere l'asse di movimento, indipendente dalla periferica
    getMovementAxes(delta) {
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
                        // STICK SINISTRO (Movimento)
                        if (source.handedness === 'left') {
                            const xAxis = source.gamepad.axes[2];
                            const zAxis = source.gamepad.axes[3];
                            if (Math.abs(xAxis) > 0.1) inputX = xAxis;
                            if (Math.abs(zAxis) > 0.1) inputZ = -zAxis; 
                        } 
                        // STICK DESTRO (Rotazione visuale e uscita)
                        else if (source.handedness === 'right') {
                            const turnAxis = source.gamepad.axes[2]; 
                            if (Math.abs(turnAxis) > 0.1) {
                                const TURN_SPEED = 2.0; 
                                this.playerRig.rotation.y -= turnAxis * TURN_SPEED * delta;
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
}