import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Game } from './Game.js';
import spaceImg from '../../../public/assets/textures/space.jpg'; 

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.game = null;
        this.clock = new THREE.Clock();
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        loader.load(spaceImg, texture => {
            this.scene.background = new THREE.Color(0x101020); // Deep space blue
        });

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 35); // Z is further back, Y is slightly above
        this.camera.lookAt(0, -15, 0);     // Look slightly down toward the playfield

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('app').appendChild(this.renderer.domElement);

        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5, 
            0.4, 
            0.85 
        );
        this.composer.addPass(bloomPass);

        this.game = new Game(this.scene, this.camera, this.renderer);

        this.addStars();

        window.addEventListener('resize', () => this.onWindowResize());

        this.animate();
    }

    addStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 });
        const starVertices = [];
        for (let i = 0; i < 500; i++) {
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 100;
            const z = -Math.random() * 100;
            starVertices.push(x, y, z);
        }
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        this.game.update(delta);
        this.composer.render();
    }
}