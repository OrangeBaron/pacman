import * as THREE from 'three';

export class GhostBrain {
    constructor(ghost, pathfinder, levelMap, cellSize, offsetX, offsetZ) {
        this.ghost = ghost; // Riferimento all'entità principale
        this.pathfinder = pathfinder;
        this.levelMap = levelMap;
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;

        this.lastDecisionGrid = { x: -1, z: -1 };
        this.lastSeenPlayerGrid = null;
        this.investigateTargetGrid = null;
        this.direction = new THREE.Vector3(0, 0, 1);
        
        this.pickRandomDirection();
    }

    pickRandomDirection() { 
        const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]; 
        this.direction = dirs[Math.floor(Math.random() * dirs.length)]; 
    }

    setInvestigateTarget(gridPos) {
        this.investigateTargetGrid = gridPos;
    }

    setHuntTarget(gridPos) {
        this.lastSeenPlayerGrid = gridPos;
    }

    updateNavigation(gridPos, currentX, currentZ, state) {
        const cellCenterX = (gridPos.x + this.offsetX) * this.cellSize;
        const cellCenterZ = (gridPos.z + this.offsetZ) * this.cellSize;
        const distToCenter = Math.hypot(currentX - cellCenterX, currentZ - cellCenterZ);

        // Se siamo al centro di una cella, prendiamo una decisione su dove svoltare
        if (distToCenter < 0.1 && (this.lastDecisionGrid.x !== gridPos.x || this.lastDecisionGrid.z !== gridPos.z)) {
            this.lastDecisionGrid = { x: gridPos.x, z: gridPos.z };
            let decided = false;

            if (state === 'STUNNED') {
                decided = this.navigateStunned(gridPos, cellCenterX, cellCenterZ);
            } else if (state === 'HUNT' && this.lastSeenPlayerGrid) {
                decided = this.navigateHunt(gridPos, cellCenterX, cellCenterZ);
            } else if (state === 'INVESTIGATE' && this.investigateTargetGrid) {
                decided = this.navigateInvestigate(gridPos, cellCenterX, cellCenterZ);
            }

            // Fallback: Pattugliamento casuale
            if (!decided) {
                this.navigatePatrol(gridPos, cellCenterX, cellCenterZ);
            }
        }
    }

    navigateStunned(gridPos, cellCenterX, cellCenterZ) {
        const centerX = Math.floor(this.levelMap[0].length / 2);
        const centerZ = Math.floor(this.levelMap.length / 2);

        if (gridPos.x === centerX && gridPos.z === centerZ) {
            this.ghost.changeState('PATROL');
            return true;
        } 
        
        const path = this.pathfinder.findPath(gridPos.x, gridPos.z, centerX, centerZ);
        if (path && path.length > 0) {
            this.setDirection(path[0], cellCenterX, cellCenterZ);
            return true;
        }
        return false;
    }

    navigateHunt(gridPos, cellCenterX, cellCenterZ) {
        const path = this.pathfinder.findPath(gridPos.x, gridPos.z, this.lastSeenPlayerGrid.x, this.lastSeenPlayerGrid.z);
        if (path && path.length > 0) {
            this.setDirection(path[0], cellCenterX, cellCenterZ);
            return true;
        } 
        this.lastSeenPlayerGrid = null;
        this.ghost.changeState('PATROL');
        return false; 
    }

    navigateInvestigate(gridPos, cellCenterX, cellCenterZ) {
        const path = this.pathfinder.findPath(gridPos.x, gridPos.z, this.investigateTargetGrid.x, this.investigateTargetGrid.z);
        if (path && path.length > 0) {
            this.setDirection(path[0], cellCenterX, cellCenterZ);
            return true;
        } 
        this.investigateTargetGrid = null;
        this.ghost.changeState('PATROL');
        return false;
    }

    navigatePatrol(gridPos, cellCenterX, cellCenterZ) {
        const validDirs = this.pathfinder.getValidDirections(gridPos.x, gridPos.z);
        const backwardDir = this.direction.clone().multiplyScalar(-1);
        
        let possibleDirs = validDirs.filter(d => d.x !== backwardDir.x || d.z !== backwardDir.z);
        
        if (possibleDirs.length === 0) possibleDirs = validDirs; 
        
        const currentDirStillValid = possibleDirs.some(d => d.x === this.direction.x && d.z === this.direction.z);
        
        if (possibleDirs.length > 1 || !currentDirStillValid) {
            this.setDirection(possibleDirs[Math.floor(Math.random() * possibleDirs.length)], cellCenterX, cellCenterZ);
        }
    }

    setDirection(newDir, cellCenterX, cellCenterZ) {
        this.ghost.mesh.position.set(cellCenterX, this.ghost.mesh.position.y, cellCenterZ);
        this.direction = newDir;
    }

    moveAndAnimate(delta, speed) {
        // Spostamento in avanti
        this.ghost.mesh.position.add(this.direction.clone().multiplyScalar(speed * delta));
        
        // Rotazione morbida
        const targetLookPos = this.ghost.mesh.position.clone().add(this.direction);
        const dummyMatrix = new THREE.Matrix4().lookAt(this.ghost.mesh.position, targetLookPos, new THREE.Vector3(0, 1, 0));
        this.ghost.targetQuaternion.setFromRotationMatrix(dummyMatrix);
        this.ghost.mesh.quaternion.slerp(this.ghost.targetQuaternion, 10 * delta);
        
        // Fluttuazione
        const time = Date.now() * 0.004; 
        this.ghost.mesh.position.y = 1.0 + Math.sin(time) * 0.1;
    }
}