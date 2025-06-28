import * as THREE from 'three';

const MAX_TAIL_PARTICLES = 50; 
const PARTICLE_LIFESPAN = 0.4; 
const TAIL_SPAWN_RATE = 300;

export class AlienBullet {
    constructor(scene, position, game) {
        this.scene = scene;
        this.game = game;
        this.minY = -30;
        this.offset = -2;
        this.bulletSpeed = -20; 
        this.disposed = false;
        this.isDestroyed = false; 
        this.time = 0;
        this.timeSinceLastSpawn = 0;

        const geometry = new THREE.BoxGeometry(0.4, 2, 0.8);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xffee66), 
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position).add(new THREE.Vector3(0, this.offset, 0));
        this.mesh.userData = { type: 'alienbullet', parent: this };
        const bulletArc = Math.PI / 6;
        this.mesh.rotation.z = (Math.random() * bulletArc) - bulletArc / 2;
        this.scene.add(this.mesh);

        const textureLoader = new THREE.TextureLoader();
        const glowMaterial = new THREE.SpriteMaterial({
            color: new THREE.Color(0xffee66), 
            blending: THREE.AdditiveBlending, 
            transparent: true,
            opacity: 1.0,
            depthWrite: false, 
        });
        this.glowSprite = new THREE.Sprite(glowMaterial);
        this.glowSprite.scale.set(1, 1, 1); 
        this.glowSprite.position.set(0, 1.1, 0); 
        this.mesh.add(this.glowSprite); 

        this.setupTail();
    }

    setupTail() {
        this.tailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(MAX_TAIL_PARTICLES * 3);
        const lifespans = new Float32Array(MAX_TAIL_PARTICLES);
        const alphas = new Float32Array(MAX_TAIL_PARTICLES);

        this.tailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.tailGeometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));
        this.tailGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        const tailMaterial = new THREE.PointsMaterial({
            size: 0.3,
            color: new THREE.Color(0xff4500),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        tailMaterial.onBeforeCompile = shader => {
            shader.vertexShader = 'attribute float alpha;\n' + 'varying float vAlpha;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\nvAlpha = alpha;'
            );
            shader.fragmentShader = 'varying float vAlpha;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                'vec4 diffuseColor = vec4( diffuse, opacity );',
                'vec4 diffuseColor = vec4( diffuse, opacity * vAlpha );'
            );
        };

        this.tail = new THREE.Points(this.tailGeometry, tailMaterial);
        this.tail.frustumCulled = false; 
        this.scene.add(this.tail);
        
        this.particleIndex = 0;
        this.activeParticles = 0;
    }
    
    update(delta) {
        if (this.disposed) return;
        this.time += delta;

        if (!this.isDestroyed) {
            const moveVector = new THREE.Vector3(0, this.bulletSpeed, 0);
            moveVector.applyQuaternion(this.mesh.quaternion);
            this.mesh.position.add(moveVector.multiplyScalar(delta));

            this.spawnTailParticles(delta);

            if (this.mesh.position.y < this.minY) {
                this.destroyBullet();
            }
        }

        this.updateTailParticles(delta);
        
        if (this.isDestroyed && this.activeParticles === 0) {
            this.dispose();
        }
    }

    spawnTailParticles(delta) {
        this.timeSinceLastSpawn += delta;
        const spawnInterval = 1.0 / TAIL_SPAWN_RATE;

        while (this.timeSinceLastSpawn > spawnInterval) {
            this.timeSinceLastSpawn -= spawnInterval;

            const positions = this.tailGeometry.attributes.position.array;
            const lifespans = this.tailGeometry.attributes.lifespan.array;

            positions[this.particleIndex * 3] = this.mesh.position.x;
            positions[this.particleIndex * 3 + 1] = this.mesh.position.y;
            positions[this.particleIndex * 3 + 2] = this.mesh.position.z;

            lifespans[this.particleIndex] = PARTICLE_LIFESPAN;
            
            if (this.activeParticles < MAX_TAIL_PARTICLES) {
                this.activeParticles++;
            }

            this.particleIndex = (this.particleIndex + 1) % MAX_TAIL_PARTICLES;
        }
    }
    
    updateTailParticles(delta) {
        if (this.activeParticles === 0) return;

        const lifespans = this.tailGeometry.attributes.lifespan.array;
        const alphas = this.tailGeometry.attributes.alpha.array;
        let particlesStillAlive = 0;

        for (let i = 0; i < MAX_TAIL_PARTICLES; i++) {
            if (lifespans[i] > 0) {
                lifespans[i] -= delta;
                if (lifespans[i] <= 0) {
                    alphas[i] = 0;
                } else {
                    alphas[i] = Math.min(1.0, lifespans[i] / (PARTICLE_LIFESPAN * 0.75));
                    particlesStillAlive++;
                }
            }
        }
        this.activeParticles = particlesStillAlive;
        
        this.tailGeometry.attributes.lifespan.needsUpdate = true;
        this.tailGeometry.attributes.alpha.needsUpdate = true;
        this.tailGeometry.attributes.position.needsUpdate = true;
    }

    handleCollision(collidedMesh) {
        if (this.isDestroyed) return;

        console.log('Bullet collided with:', collidedMesh.userData?.type);

        const collidedType = collidedMesh.userData?.type;
        if (collidedType === 'player') {
            collidedMesh.userData.parent?.hit();
        } else if (collidedType === 'barrier') {
            this.game?.onBarrierDestroyed(collidedMesh);
        }
        
        this.destroyBullet();
    }

    destroyBullet() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.scene.remove(this.mesh);
    }
    
    dispose() {
        this.disposed = true;
        this.scene.remove(this.tail);
        this.tail.geometry.dispose();
        this.tail.material.dispose();
        
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.glowSprite.material.dispose();
    }
}