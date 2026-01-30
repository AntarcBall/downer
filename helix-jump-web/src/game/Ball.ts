import * as THREE from 'three';

export class Ball {
    public mesh: THREE.Mesh;
    public y: number = 0;
    public velocityY: number = 0;
    public isAlive: boolean = true;

    private readonly gravity: number = -0.015;
    private readonly bounceForce: number = 0.25;
    private readonly radius: number = 0.3;

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xe94560,
            metalness: 0.3,
            roughness: 0.4,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(0, this.y, 0);

        scene.add(this.mesh);
    }

    update(): void {
        if (!this.isAlive) return;

        // 중력 적용
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // 메시 위치 업데이트
        this.mesh.position.y = this.y;
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
        this.mesh.position.y = this.y;
    }
}
