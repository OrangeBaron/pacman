import * as THREE from 'three';
import { STATS, CURRENT_SETTINGS } from './config.js';
import { createPistolMesh, createRifleMesh } from './WeaponModels.js';

export class Weapon {
    constructor(camera, audioManager) {
        this.camera = camera;
        this.audioManager = audioManager;
        
        // Contenitore vuoto che ospiterà la mesh dell'arma attiva
        this.mesh = new THREE.Group();
        this.mesh.userData = { type: 'weapon' };

        this.camera.add(this.mesh);

        const offsetX = CURRENT_SETTINGS.leftHanded ? -0.3 : 0.3;
        this.mesh.position.set(offsetX, -0.3, -0.6);

        // -- Setup Raycaster per mirare --
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0); 

        // -- Modelli e Statistiche delle armi --
        this.models = {
            pistol: createPistolMesh(),
            rifle: createRifleMesh()
        };

        this.stats = {
            pistol: { fireRate: 1000, ammo: Infinity, automatic: false },
            rifle: { fireRate: 150, ammo: 30, automatic: true }
        };

        this.canShoot = true;
        this.currentType = null;
        this.currentAmmo = 0;

        // Equipaggia l'arma di base all'avvio
        this.equip('pistol');
    }

    equip(weaponType) {
        if (!this.models[weaponType]) return;

        this.currentType = weaponType;
        this.currentAmmo = this.stats[weaponType].ammo;

        // Rimuove il modello dell'arma precedente
        while(this.mesh.children.length > 0){ 
            this.mesh.remove(this.mesh.children[0]); 
        }

        // Aggiunge il nuovo modello
        this.mesh.add(this.models[weaponType]);
    }

    shoot(ghosts, scene, vrController = null) {
        if (!this.canShoot) return false;

        if (this.currentAmmo <= 0 && this.currentType !== 'pistol') {
            this.equip('pistol');
            return false;
        }

        // 1. Riproduci audio e applica cooldown tramite il nuovo AudioManager
        this.audioManager.playForce('shoot');
        
        this.canShoot = false;
        STATS.shotsFired++; 

        setTimeout(() => { this.canShoot = true; }, this.stats[this.currentType].fireRate);

        if (this.currentType !== 'pistol') {
            this.currentAmmo--;
        }

        // 2. Anima leggermente l'arma per il rinculo
        const recoilZ = this.currentType === 'rifle' ? 0.05 : 0.1;
        const recoilX = this.currentType === 'rifle' ? 0.05 : 0.1;
        
        this.mesh.position.z += recoilZ;
        this.mesh.rotation.x += recoilX;
        setTimeout(() => { 
            this.mesh.position.z -= recoilZ; 
            this.mesh.rotation.x -= recoilX; 
        }, 100);

        // 3. Raycasting
        if (vrController) {
            const position = new THREE.Vector3();
            const direction = new THREE.Vector3(0, 0, -1);
            position.setFromMatrixPosition(vrController.matrixWorld);
            direction.transformDirection(vrController.matrixWorld).normalize();
            this.raycaster.set(position, direction);
        } else {
            this.raycaster.setFromCamera(this.centerScreen, this.camera);
        }
        
        const intersects = this.raycaster.intersectObject(scene, true);
        const hitGhosts = new Set();
        
        for (let i = 0; i < intersects.length; i++) {
            const hitObject = intersects[i].object;
            const hitData = hitObject.userData;
            
            // 1. Ignora il pulviscolo (Points) o l'arma stessa (se un figlio non avesse ereditato il tag, controlliamo l'albero)
            if (hitObject.isPoints || hitData.type === 'weapon') continue;

            // 2. Abbiamo colpito un fantasma?
            if (hitData.type === 'ghost') {
                const hitGhost = hitData.entity; // Recuperiamo l'istanza direttamente!
                if (!hitGhosts.has(hitGhost)) {
                    hitGhost.takeDamage();
                    hitGhosts.add(hitGhost);
                    STATS.shotsHit++;
                    // Non facciamo break: il proiettile può trapassare e colpire altri fantasmi dietro!
                }
            } 
            // 3. Abbiamo colpito un muro solido?
            else if (hitData.type === 'wall') {
                break; // Il proiettile si ferma contro il muro
            }
            
            // 4. Qualsiasi altra cosa (pavimenti, monete, armi a terra non taggate) viene ignorata.
        }

        // 4. PROPAGAZIONE DEL RUMORE
        const worldPos = new THREE.Vector3();
        this.camera.getWorldPosition(worldPos);

        ghosts.forEach(ghost => {
            ghost.hearNoise(worldPos.x, worldPos.z, 100.0);
        });

        return true;
    }
}