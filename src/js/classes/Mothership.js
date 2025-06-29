import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Explosion } from "./Explosion.js";

export class Mothership {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.mesh = null;
    this.lives = 7;
    this.speed = 0.1;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.bulletCooldown = 0;
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      "/assets/models/MotherShip.glb",
      (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.position.set(this.direction * 20, 8, 0);
        this.mesh.scale.set(1, 1, 1);
        this.mesh.userData = {
          type: "mothership",
          lives: this.lives,
          parent: this,
        };
        this.scene.add(this.mesh);

        this.mesh.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              map: new THREE.TextureLoader().load(
                "/assets/textures/Mothership.jpg"
              ),
              roughness: 0.4,
              metalness: 0.3,
            });
            child.userData.type = "mothership";
            child.userData.parent = this;
          }
        });
      },
      undefined,
      (error) => {
        console.error("Error loading Mothership.glb:", error);
      }
    );
  }

  update(delta) {
    if (!this.mesh) return;

    this.mesh.position.x += this.speed * this.direction * delta * 60;

    if (Math.abs(this.mesh.position.x) > 20) {
      this.direction *= -1;
    }

    this.bulletCooldown -= delta;
    if (this.bulletCooldown <= 0) {
      const offset = 2.5;
      const posLeft = this.mesh.position
        .clone()
        .add(new THREE.Vector3(-offset, -2, 0));
      const posRight = this.mesh.position
        .clone()
        .add(new THREE.Vector3(offset, -2, 0));
      if (Math.random() < 0.5) {
        this.game.spawnAlienBullet(posLeft);
        this.game.spawnAlienBullet(posRight);
      } else {
        this.game.spawnAlienBullet(
          this.mesh.position.clone().add(new THREE.Vector3(0, -2, 0))
        );
      }

      this.bulletCooldown = 1;
    }
  }

  hit() {
    this.lives -= 1;
    if (this.lives <= 0) {
      const explosion = new Explosion(this.scene, this.mesh.position, 20, 2);
      this.game.explosions.push(explosion);
      this.scene.remove(this.mesh);
      this.game.onMothershipDestroyed(this);
      return true;
    } else {
      this.mesh.rotation.z += (Math.random() - 0.5) * 0.25;
      const explosion = new Explosion(this.scene, this.mesh.position, 10, 1);
      this.game.explosions.push(explosion);
      return false;
    }
  }
}
