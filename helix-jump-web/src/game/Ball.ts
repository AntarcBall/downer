import * as THREE from 'three';

export class Ball {
    public mesh: THREE.Mesh;
    public y: number = 0;
    public velocityY: number = 0;
    public isAlive: boolean = true;

    private readonly gravity: number = -0.008;      // 느린 중력
    private readonly bounceForce: number = 0.12;    // 절반 점프력
    private readonly radius: number = 0.5; // 크기 증가

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        // 조명 영향 없는 Basic 재질 사용 (디버깅용)
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000, // 완전 빨강
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(0, this.y, 1.5); // 기둥 앞 (카메라 쪽)

        scene.add(this.mesh);
    }

    update(): void {
        if (!this.isAlive) return;

        // 중력 적용
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // 메시 위치 업데이트
        this.mesh.position.y = this.y;
        this.mesh.position.z = 1.5; // z 위치 고정
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
        this.mesh.position.set(0, this.y, 1.5);
    }
}
