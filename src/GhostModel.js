import * as THREE from 'three';

export function createGhostMesh() {
    const mesh = new THREE.Group();
    
    const ghostMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 1.0
    });
    
    // Testa
    const headGeo = new THREE.SphereGeometry(0.5, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const head = new THREE.Mesh(headGeo, ghostMat);
    head.position.y = 0.5;
    mesh.add(head);

    // Corpo ondulato
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1, true);
    
    const posAttribute = bodyGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
        let y = posAttribute.getY(i);
        if (y < 0) {
            let x = posAttribute.getX(i);
            let z = posAttribute.getZ(i);
            let angle = Math.atan2(z, x);
            
            posAttribute.setY(i, y + Math.sin(angle * 6) * 0.15);
        }
    }
    
    posAttribute.needsUpdate = true;
    bodyGeo.computeVertexNormals();
    
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    mesh.add(body);

    // Faccia e texture
    const textureLoader = new THREE.TextureLoader();
    const textures = {
        normal: textureLoader.load('../assets/normal.png'),
        curious: textureLoader.load('../assets/curious.png'),
        angry: textureLoader.load('../assets/angry.png'),
        stunned: textureLoader.load('../assets/stunned.png')
    };
    
    const faceGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const faceMat = new THREE.MeshBasicMaterial({ 
        map: textures.normal,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.1
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 0.2, -0.51); 
    face.rotation.y = Math.PI; 
    mesh.add(face);

    return { mesh, faceMat, textures, ghostMat }; 
}