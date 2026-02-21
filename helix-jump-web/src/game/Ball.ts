import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

export class Ball {
    public mesh: THREE.Mesh;
    public y: number = 0;
    public velocityY: number = 0;
    public isAlive: boolean = true;

    private readonly gravity: number = GAME_CONFIG.physics.gravity;
    private readonly bounceForce: number = GAME_CONFIG.physics.bounceVelocity;
    private readonly radius: number = GAME_CONFIG.physics.ballRadius;

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(0, this.y, GAME_CONFIG.physics.ballZ);

        scene.add(this.mesh);
    }

    update(): void {
        if (!this.isAlive) return;

        this.velocityY += this.gravity;
        this.y += this.velocityY;

        this.mesh.position.y = this.y;
        this.mesh.position.z = GAME_CONFIG.physics.ballZ;
    }

    bounce(): void {
        this.velocityY = this.bounceForce;
    }

    die(): void {
        this.isAlive = false;
        this.velocityY = 0;
    }

    getRadius(): number {
        return this.radius;
    }

    reset(): void {
        this.y = 0;
        this.velocityY = 0;
        this.isAlive = true;
        this.mesh.position.set(0, this.y, GAME_CONFIG.physics.ballZ);
    }
}
