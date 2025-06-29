import * as THREE from 'three';

export class PlayerBullet {
    constructor(scene, position, game) {
        this.scene = scene;
        this.game = game;
        this.maxY = 120;
        this.offset = 2;
        this.bulletSpeed = 1.25;
        this.disposed = false;

        const geometry = new THREE.BoxGeometry(0.5, 4, 1);
        const material = new THREE.MeshStandardMaterial({
            map: new THREE.TextureLoader().load('/assets/textures/player.jpg'),
            roughness: 0.5,
            metalness: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position).add(new THREE.Vector3(0, this.offset, 0));
        this.mesh.userData = { type: 'playerbullet', parent: this };
        this.scene.add(this.mesh);
    }

    update(delta) {
        if (this.disposed) return;
        this.mesh.position.y += this.bulletSpeed * delta * 60;

        if (this.mesh.position.y > this.maxY) {
            this.destroyBullet();
        }
    }

    handleCollision(collidedMesh) {
        if (!collidedMesh.userData || !collidedMesh.userData.type) {
            this.destroyBullet();
            return;
        }

        const collidedType = collidedMesh.userData.type;

        if (collidedType === 'alien' || collidedType === 'mothership') {
            collidedMesh.userData.parent?.hit();
            this.destroyBullet();

        } else if (collidedType === 'barrier') {
            this.game.onBarrierDestroyed(collidedMesh);
            this.destroyBullet();
        } else {
            this.destroyBullet();
        }
    }

    destroyBullet() {
        if (this.mesh.parent) {
            this.scene.remove(this.mesh);
        }
        this.disposed = true;
    }
}