import * as THREE from 'three';

export class Explosion {
    constructor(scene, position, numParticles = 20, maxSize = 1) {
        this.scene = scene;
        this.position = position;
        this.numParticles = numParticles;
        this.maxSize = maxSize;
        this.particles = {};
        this.disposed = false;

        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < this.numParticles; i++) {
            this.createParticle();
        }
    }

    createParticle() {
        const id = `p${Math.floor(Math.random() * 1000000).toString(16)}`;
        const color = new THREE.Color(1, 1, Math.random());
        const size = this.maxSize / 1.5;

        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1
        });

        const mesh = new THREE.Mesh(geometry, material);

        const particle = {
            id,
            mesh,
            velocity: Math.random() / 3,
            movementVector: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
            rotationVelocity: Math.random() / 20,
            duration: 90,
            totalDuration: 90
        };

        mesh.position.copy(this.position);
        mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        mesh.translateOnAxis(particle.movementVector, particle.velocity * this.numParticles / 1.5);

        this.scene.add(mesh);
        this.particles[id] = particle;
    }

    update(delta) {
        Object.values(this.particles).forEach(particle => {
            this.move(particle, delta);
        });

        if (Object.keys(this.particles).length === 0) {
            if (!this.disposed) {
                console.log('Explosion disposed');
            }
            this.disposed = true;
        }
    }

   move(particle, delta) {
        particle.duration -= delta * 60;

        if (particle.duration <= 0) {
            if (particle.mesh && particle.mesh.parent) {
                this.scene.remove(particle.mesh);
            }
            if (particle.mesh) {
                particle.mesh.visible = false; 
                if (particle.mesh.geometry) {
                    particle.mesh.geometry.dispose();
                }
                if (particle.mesh.material) {
                    if (Array.isArray(particle.mesh.material)) {
                        particle.mesh.material.forEach(mat => mat.dispose());
                    } else {
                        particle.mesh.material.dispose();
                    }
                }
            }
            delete this.particles[particle.id]; 
            return;
        }

        const progress = 1 - particle.duration / particle.totalDuration;
        const fadeFactor = particle.duration < 40 ? particle.duration / 40 : 1;
        const scale = THREE.MathUtils.lerp(1, 0.3, progress);

        particle.mesh.material.opacity = fadeFactor;
        particle.mesh.scale.set(scale, scale, scale);
        particle.mesh.translateOnAxis(particle.movementVector, particle.velocity * delta * 60);
        particle.mesh.rotation.x += particle.rotationVelocity * delta * 60;
        particle.mesh.rotation.y += particle.rotationVelocity * delta * 60;
        particle.mesh.rotation.z += particle.rotationVelocity * delta * 60;
    }
}