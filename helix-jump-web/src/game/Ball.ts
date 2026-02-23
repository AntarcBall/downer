import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

export interface BallOptions {
    color?: number;
    emissive?: number;
    gravity?: number;
    bounceVelocity?: number;
}

export class Ball {
    public mesh: THREE.Mesh;
    public y: number = 0;
    public velocityY: number = 0;
    public isAlive: boolean = true;

    private readonly gravity: number;
    private readonly bounceForce: number;
    private readonly radius: number = GAME_CONFIG.physics.ballRadius;

    constructor(scene: THREE.Scene, options: BallOptions = {}) {
        const ballColor = options.color ?? 0xdd2b3a;
        const emissiveColor = options.emissive ?? 0x240508;
        this.gravity = options.gravity ?? GAME_CONFIG.physics.gravity;
        this.bounceForce = options.bounceVelocity ?? GAME_CONFIG.physics.bounceVelocity;

        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: ballColor,
            metalness: 0.08,
            roughness: 0.28,
            emissive: emissiveColor,
            emissiveIntensity: 0.18,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.set(0, this.y, GAME_CONFIG.physics.ballZ);

        // Cheap 3D look boost: top highlight + underside shade, no gameplay impact.
        const highlight = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius * 0.32, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 })
        );
        highlight.position.set(this.radius * 0.28, this.radius * 0.3, this.radius * 0.24);
        this.mesh.add(highlight);

        const undersideShade = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius * 0.52, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 })
        );
        undersideShade.position.set(0, -this.radius * 0.42, 0);
        this.mesh.add(undersideShade);

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
