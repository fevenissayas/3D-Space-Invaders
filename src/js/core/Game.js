import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Alien } from '../classes/Alien.js';
import { Player } from '../classes/Player.js';
import { PlayerBullet } from '../classes/PlayerBullet.js';
import { AlienBullet } from '../classes/AlienBullet.js';
import { Mothership } from '../classes/Mothership.js';
import { Explosion } from '../classes/Explosion.js';

export class Game {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.player = null;
        this.aliens = [];
        this.playerBullets = [];
        this.alienBullets = [];
        this.explosions = [];
        this.mothership = null;
        this.wave = 0;
        this.gameOver = false;
        this.score = 0;

        this.setupScene().then(() => {
            this.setupControls();
            this.setupLighting();
            this.startWave();
        });
    }

    async setupScene() {
        this.player = new Player(this.scene, this);
        return new Promise(resolve => {
            const checkPlayer = setInterval(() => {
                if (this.player.mesh) {
                    clearInterval(checkPlayer);
                    resolve();
                }
            }, 100);
        });
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, -10, 0);
        this.controls.enablePan = false;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 50;
        this.controls.update();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);

        const spotLight = new THREE.SpotLight(0xffffff, 1.5, 100, Math.PI / 6);
        spotLight.position.set(0, 30, 20);
        spotLight.target.position.set(0, 0, 0);
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
    }

    startWave() {
        this.wave += 1;
        this.aliens = [];
        const types = ['Alien_1', 'Alien_2', 'Alien_3'];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                const type = types[Math.floor(Math.random() * types.length)];
                const position = new THREE.Vector3((col - 2) * 5, 5 + row * 3, 0);
                const alien = new Alien(this.scene, position, type, this);
                this.aliens.push(alien); 
            }
        }
    }

    spawnPlayerBullet(position) {
        const bullet = new PlayerBullet(this.scene, position, this);
        this.playerBullets.push(bullet);
    }

    spawnAlienBullet(position) {
        const bullet = new AlienBullet(this.scene, position, this);
        this.alienBullets.push(bullet);
    }

    onAlienDestroyed(alien) {
        this.addScore(30); 
        this.aliens = this.aliens.filter(a => a !== alien);
        if (alien.mesh && alien.mesh.position) {
            const explosion = new Explosion(this.scene, alien.mesh.position.clone(), 20, 1);
            this.explosions.push(explosion);
            this.scene.remove(alien.mesh);
        }
        console.log('Aliens left:', this.aliens.length);
        if (this.aliens.length === 0 && !this.mothership) {
            console.log('Spawning mothership!');
            this.mothership = new Mothership(this.scene, this);
        }
    }

    onMothershipDestroyed() {
        this.addScore(50);
        if (this.mothership && this.mothership.mesh) {
            const explosion = new Explosion(this.scene, this.mothership.mesh.position.clone(), 30, 2);
            this.explosions.push(explosion);
        }
        this.mothership = null;
        this.startWave();
    }

    onPlayerDestroyed() {
        if (this.player && this.player.mesh) {
            const explosion = new Explosion(this.scene, this.player.mesh.position.clone(), 40, 2.5);
            this.explosions.push(explosion);
        }
        this.gameOver = true;
        console.log('Game Over!');
        if (window.onGameOver) window.onGameOver();
    }

    playSound(soundName) {
        console.log(`Playing sound: ${soundName}`);
    }

    onBarrierDestroyed(barrier) {
        if (barrier && barrier.parent) {
            this.scene.remove(barrier);
        }
    }

    addScore(points) {
        this.score += points;
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        const scoreDiv = document.getElementById('score-display');
        if (scoreDiv) scoreDiv.textContent = `Score: ${this.score}`;
        const restartScore = document.getElementById('restart-score');
        if (restartScore) restartScore.textContent = `Score: ${this.score}`;
    }

    update(delta) {
        if (this.gameOver) return;

        delta = Math.min(delta, 0.033);

        if (this.player) this.player.update(delta);
        this.aliens.forEach(alien => alien.update(delta));
        if (this.mothership) this.mothership.update(delta);
        this.playerBullets.forEach(bullet => {
            if (!bullet.disposed) bullet.update(delta);
        });
        this.alienBullets.forEach(bullet => {
            if (!bullet.disposed) bullet.update(delta);
        });
        this.explosions.forEach(explosion => {
            if (!explosion.disposed) explosion.update(delta);
        });

        this.playerBullets = this.playerBullets.filter(bullet => !bullet.disposed);
        this.alienBullets = this.alienBullets.filter(bullet => !bullet.disposed);
        this.explosions = this.explosions.filter(explosion => !explosion.disposed);

        this.checkCollisions();
    }

    checkCollisions() {
        this.playerBullets.forEach(bullet => {
            if (bullet.disposed || !bullet.mesh || !bullet.mesh.parent) return;
            const rayLength = 2;
            const direction = new THREE.Vector3(0, 1, 0).normalize();
            const raycaster = new THREE.Raycaster(bullet.mesh.position, direction, 0, rayLength);

            let alienMeshes = [];
            this.aliens.forEach(alien => {
                if (alien.mesh) {
                    alien.mesh.traverse(child => {
                        if (child.isMesh) alienMeshes.push(child);
                    });
                }
            });

            if (this.mothership && this.mothership.mesh) {
                this.mothership.mesh.traverse(child => {
                    if (child.isMesh) alienMeshes.push(child);
                });
            }

            const intersects = raycaster.intersectObjects(alienMeshes, true);
            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                const hitPoint = intersects[0].point;

                const existingExplosion = this.explosions.find(exp =>
                    exp.position.distanceTo(hitPoint) < 1.0
                );
                if (!existingExplosion) {
                    const explosion = new Explosion(this.scene, hitPoint.clone(), 10, 0.7);
                    this.explosions.push(explosion);
                }

                bullet.disposed = true;
                bullet.handleCollision(hitMesh);
            }
        });

        this.alienBullets.forEach(bullet => {
            if (bullet.disposed || !bullet.mesh || !bullet.mesh.parent) return;
            const rayLength = 2;
            const direction = new THREE.Vector3(0, -1, 0).applyQuaternion(
                bullet.mesh.getWorldQuaternion(new THREE.Quaternion())
            ).normalize();
            const raycaster = new THREE.Raycaster(bullet.mesh.position, direction, 0, rayLength);

            if (this.player && this.player.mesh && this.player.mesh.parent) {
                const intersects = raycaster.intersectObject(this.player.mesh, true);
                if (intersects.length > 0) {
                    const hitPoint = intersects[0].point;

                    const existingExplosion = this.explosions.find(exp =>
                        exp.position.distanceTo(hitPoint) < 1.0
                    );
                    if (!existingExplosion) {
                        const explosion = new Explosion(this.scene, hitPoint.clone(), 12, 1.2);
                        this.explosions.push(explosion);
                    }

                    bullet.disposed = true;
                    bullet.handleCollision(this.player.mesh);
                }
            }
        });
    }
}