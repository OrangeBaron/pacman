import * as THREE from 'three';

export class GhostVision {
    // Restituisce true se il giocatore è visibile
    static canSeePlayer(ghostMesh, playerPos, hasLineOfSight) {
        const distToPlayer = ghostMesh.position.distanceTo(playerPos);
        
        // Se è abbastanza vicino da vederci
        if (distToPlayer < 20.0) {
            const toPlayer = new THREE.Vector3().subVectors(playerPos, ghostMesh.position).normalize();
            toPlayer.y = 0; // Ignora l'altezza
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ghostMesh.quaternion);
            
            // Se il giocatore è nel cono visivo (dot > 0.6) e non ci sono muri in mezzo
            if (forward.dot(toPlayer) > 0.6 && hasLineOfSight) { 
                return true;
            }
        }
        return false;
    }
}