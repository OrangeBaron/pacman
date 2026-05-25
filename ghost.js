import * as THREE from 'three';

export class Ghost {
    constructor(scene, startX, startZ, cellSize, offsetX, offsetZ) {
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
        
        // Setup base: raggio 0.5, alto ~1.5
        this.mesh = new THREE.Group();
        this.mesh.position.set(startX, 1.0, startZ); // Altezza da terra
        
        // 1. IL CORPO (Semisfera + Cilindro con Zigzag)
        const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Bianchi e uguali
        
        // Testa (Semisfera)
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const head = new THREE.Mesh(headGeo, ghostMat);
        head.position.y = 0.5;
        this.mesh.add(head);

        // Corpo (Cilindro)
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, false);
        const posAttribute = bodyGeo.attributes.position;
        // Effetto ZigZag/Ondulato sulla base
        for (let i = 0; i < posAttribute.count; i++) {
            let y = posAttribute.getY(i);
            if (y < 0) { // Se è un vertice della base inferiore
                let x = posAttribute.getX(i);
                let z = posAttribute.getZ(i);
                let angle = Math.atan2(z, x);
                // Usiamo il seno per creare punte e rientranze (8 punte)
                posAttribute.setY(i, y + Math.sin(angle * 8) * 0.15);
            }
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, ghostMat);
        this.mesh.add(body);

        // 2. LA FACCIA (Piano per la texture)
        const faceGeo = new THREE.PlaneGeometry(0.6, 0.6);
        const textureLoader = new THREE.TextureLoader();
        const faceTex = textureLoader.load('normal.png');
        const faceMat = new THREE.MeshBasicMaterial({ 
            map: faceTex,
            color: 0xffffff,
            transparent: true,
            alphaTest: 0.1
        });
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.set(0, 0.2, 0.51);
        this.mesh.add(face);

        scene.add(this.mesh);

        // Parametri di movimento
        this.speed = 1.5; 
        this.direction = new THREE.Vector3(0, 0, 1); // Direzione iniziale
        this.pickRandomDirection();
    }

    pickRandomDirection() {
        const dirs = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];
        this.direction = dirs[Math.floor(Math.random() * dirs.length)];
        
        // Fai guardare il fantasma verso la direzione in cui si muove
        const target = this.mesh.position.clone().add(this.direction);
        this.mesh.lookAt(target);
    }

    update(delta, isCollidingFunc) {
        // Calcola la prossima posizione
        const moveStep = this.direction.clone().multiplyScalar(this.speed * delta);
        const nextX = this.mesh.position.x + moveStep.x;
        const nextZ = this.mesh.position.z + moveStep.z;

        // Se urta contro un muro, cambia direzione a caso
        // Usiamo un raggio di 0.4 per evitare che si compenetri troppo col muro
        if (isCollidingFunc(nextX + this.direction.x * 0.4, nextZ + this.direction.z * 0.4)) {
            this.pickRandomDirection();
        } else {
            // Se la strada è libera, prosegui
            this.mesh.position.x = nextX;
            this.mesh.position.z = nextZ;
        }

        // TODO: In futuro qui aggiungeremo un controllo per intercettare gli incroci
        // in modo che possano svoltare anche se non sbattono contro un muro.
    }
}