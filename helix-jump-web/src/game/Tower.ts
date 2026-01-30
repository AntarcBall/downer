import * as THREE from 'three';
import { Platform, PlatformData } from './Platform';

export class Tower {
    public group: THREE.Group;
    public platforms: Platform[] = [];
    public rotation: number = 0;

    private readonly pillarRadius: number = 0.4;
    private pillarMesh: THREE.Mesh;
    private finishPlatform: THREE.Mesh;
    public finishY: number = -20;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();

        // 중앙 기둥 생성
        const pillarGeometry = new THREE.CylinderGeometry(
            this.pillarRadius,
            this.pillarRadius,
            30,
            32
        );
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x16213e,
            metalness: 0.3,
            roughness: 0.7,
        });

        this.pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
        this.pillarMesh.position.y = -10;
        this.pillarMesh.castShadow = true;
        this.pillarMesh.receiveShadow = true;
        this.group.add(this.pillarMesh);

        // 피니시 플랫폼 (바닥)
        const finishGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.3, 32);
        const finishMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            metalness: 0.4,
            roughness: 0.5,
        });
        this.finishPlatform = new THREE.Mesh(finishGeometry, finishMaterial);
        this.finishPlatform.position.y = this.finishY;
        this.group.add(this.finishPlatform);

        scene.add(this.group);
    }

    loadLevel(platformsData: PlatformData[], finishY: number, scene: THREE.Scene): void {
        // 기존 플랫폼 제거
        this.platforms.forEach(p => {
            this.group.remove(p.mesh);
        });
        this.platforms = [];

        // 새 플랫폼 추가
        platformsData.forEach(data => {
            const platform = new Platform(data, scene);
            this.group.add(platform.mesh);
            this.platforms.push(platform);
        });

        // 피니시 라인 업데이트
        this.finishY = finishY;
        this.finishPlatform.position.y = finishY;
    }

    rotate(delta: number): void {
        this.rotation += delta;
        this.group.rotation.y = this.rotation;
    }

    setRotation(angle: number): void {
        this.rotation = angle;
        this.group.rotation.y = this.rotation;
    }

    update(): void {
        // 움직이는 플랫폼 업데이트
        this.platforms.forEach(platform => {
            platform.update();
        });
    }

    getRotationDegrees(): number {
        return THREE.MathUtils.radToDeg(this.rotation) % 360;
    }
}
