import * as THREE from 'three';

export function createPistolMesh() {
    const group = new THREE.Group();
    const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b });
    const lightMetalMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
    const gripMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
    const sightMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });

    const barrelGeo = new THREE.BoxGeometry(0.07, 0.08, 0.4);
    const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
    barrel.position.set(0, 0, -0.1);
    group.add(barrel);

    const slideGeo = new THREE.BoxGeometry(0.08, 0.04, 0.42);
    const slide = new THREE.Mesh(slideGeo, lightMetalMat);
    slide.position.set(0, 0.06, -0.11);
    group.add(slide);

    const handleGeo = new THREE.BoxGeometry(0.06, 0.2, 0.1);
    const handle = new THREE.Mesh(handleGeo, gripMat);
    handle.position.set(0, -0.14, 0.05);
    handle.rotation.x = -Math.PI / 8;
    group.add(handle);

    const guardGeo = new THREE.BoxGeometry(0.01, 0.08, 0.1);
    const guard = new THREE.Mesh(guardGeo, darkMetalMat);
    guard.position.set(0, -0.06, -0.03);
    group.add(guard);

    const sightGeo = new THREE.BoxGeometry(0.015, 0.03, 0.02);
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.09, -0.3);
    group.add(sight);

    return group;
}

export function createRifleMesh() {
    const group = new THREE.Group();
    const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const stockMat = new THREE.MeshBasicMaterial({ color: 0x2a1b12 });
    const sightMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 });

    const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.1);
    group.add(body);

    const barrelGeo = new THREE.BoxGeometry(0.04, 0.04, 0.5);
    const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
    barrel.position.set(0, 0.02, -0.6);
    group.add(barrel);

    const stockGeo = new THREE.BoxGeometry(0.06, 0.15, 0.3);
    const stock = new THREE.Mesh(stockGeo, stockMat);
    stock.position.set(0, -0.05, 0.3);
    group.add(stock);

    const handleGeo = new THREE.BoxGeometry(0.05, 0.2, 0.08);
    const handle = new THREE.Mesh(handleGeo, stockMat);
    handle.position.set(0, -0.15, 0.1);
    handle.rotation.x = -Math.PI / 8;
    group.add(handle);

    const magGeo = new THREE.BoxGeometry(0.06, 0.25, 0.12);
    const mag = new THREE.Mesh(magGeo, darkMetalMat);
    mag.position.set(0, -0.2, -0.1);
    mag.rotation.x = Math.PI / 16;
    group.add(mag);

    const sightGeo = new THREE.BoxGeometry(0.015, 0.03, 0.02);
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.075, -0.8);
    group.add(sight);

    return group;
}