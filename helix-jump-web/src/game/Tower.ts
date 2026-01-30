import * as THREE from 'three';

export class Tower {
    public group: THREE.Group;
    public rotation: number = 0;

    private readonly pillarRadius: number = 0.4;
    private pillarMesh: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();

        // 중앙 기둥 생성 (매우 긴 기둥)
        const pillarGeometry = new THREE.CylinderGeometry(
            this.pillarRadius,
            this.pillarRadius,
            500, // 매우 긴 기둥
            32
        );
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0xd1d8e0,
            metalness: 0.1,
            roughness: 0.8,
        });

        this.pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
        this.pillarMesh.position.y = -200; // 중심을 아래로
        this.pillarMesh.castShadow = true;
        this.pillarMesh.receiveShadow = true;
        this.group.add(this.pillarMesh);

        scene.add(this.group);
    }

    rotate(delta: number): void {
        this.rotation += delta;
        this.group.rotation.y = this.rotation;
    }

    setRotation(angle: number): void {
        this.rotation = angle;
        this.group.rotation.y = this.rotation;
    }

    getRotationDegrees(): number {
        return THREE.MathUtils.radToDeg(this.rotation) % 360;
    }

    // 기둥 위치 업데이트 (공을 따라감)
    updatePillarPosition(ballY: number): void {
        this.pillarMesh.position.y = ballY - 200;
    }
}

