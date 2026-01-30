import * as THREE from 'three';

export interface PlatformData {
    y: number;
    gapStart: number;
    gapEnd: number;
    isTrap: boolean;
    isMoving: boolean;
    color: string;
}

export class Platform {
    public mesh: THREE.Group;
    public y: number;
    public gapStart: number;
    public gapEnd: number;
    public isTrap: boolean;
    public isMoving: boolean;
    public selfRotation: number = 0;

    private readonly innerRadius: number = 0.5;
    private readonly outerRadius: number = 2.5;
    private readonly height: number = 0.15;
    private movingDirection: number = 1;
    private readonly movingSpeed: number = 0.02;

    constructor(data: PlatformData, scene: THREE.Scene) {
        this.y = data.y;
        this.gapStart = data.gapStart;
        this.gapEnd = data.gapEnd;
        this.isTrap = data.isTrap;
        this.isMoving = data.isMoving;

        this.mesh = new THREE.Group();

        const color = parseInt(data.color, 16);

        // 구멍이 있는 링 생성 (여러 세그먼트로)
        this.createRingWithGap(color);

        this.mesh.position.y = this.y;
        scene.add(this.mesh);
    }

    private createRingWithGap(color: number): void {
        // 구멍 시작/끝 각도를 라디안으로 
        const gapStartRad = THREE.MathUtils.degToRad(this.gapStart);
        const gapEndRad = THREE.MathUtils.degToRad(this.gapEnd);

        // 구멍 크기 계산 (라디안)
        let gapSizeRad = gapEndRad - gapStartRad;
        if (gapSizeRad < 0) gapSizeRad += Math.PI * 2;

        // 채워진 부분의 각도
        const solidAngle = Math.PI * 2 - gapSizeRad;

        // 렌더링 시작 각도 (구멍이 끝나는 지점부터 시작)
        const solidStartRad = gapEndRad;

        if (solidAngle > 0.1) {
            // 링을 CylinderGeometry로 생성
            const ringGeometry = new THREE.CylinderGeometry(
                this.outerRadius,
                this.outerRadius,
                this.height,
                64,
                1,
                true,
                solidStartRad,
                solidAngle
            );
            // 내부 원통
            const innerGeometry = new THREE.CylinderGeometry(
                this.innerRadius,
                this.innerRadius,
                this.height,
                64,
                1,
                true,
                solidStartRad,
                solidAngle
            );

            const material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.2,
                roughness: 0.6,
                side: THREE.DoubleSide,
            });

            // 상단 면 (링 형태)
            const topGeometry = new THREE.RingGeometry(
                this.innerRadius,
                this.outerRadius,
                64,
                1,
                solidStartRad,
                solidAngle
            );
            topGeometry.rotateX(-Math.PI / 2);

            const topMesh = new THREE.Mesh(topGeometry, material);
            topMesh.position.y = this.height / 2;

            const bottomGeometry = topGeometry.clone();
            const bottomMesh = new THREE.Mesh(bottomGeometry, material);
            bottomMesh.position.y = -this.height / 2;

            // 외부/내부 벽
            const outerMesh = new THREE.Mesh(ringGeometry, material);
            const innerMesh = new THREE.Mesh(innerGeometry, material);

            this.mesh.add(topMesh);
            this.mesh.add(bottomMesh);
            this.mesh.add(outerMesh);
            this.mesh.add(innerMesh);
        }
    }

    update(): void {
        if (this.isMoving) {
            // 좌우로 흔들리는 움직임
            this.selfRotation += this.movingSpeed * this.movingDirection;

            // 90도 범위 내에서 방향 전환
            if (Math.abs(this.selfRotation) > Math.PI / 2) {
                this.movingDirection *= -1;
            }

            this.mesh.rotation.y = this.selfRotation;
        }
    }

    getEffectiveGapStart(): number {
        return this.gapStart + THREE.MathUtils.radToDeg(this.selfRotation);
    }

    getEffectiveGapEnd(): number {
        return this.gapEnd + THREE.MathUtils.radToDeg(this.selfRotation);
    }
}
