import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

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
    private readonly movingSpeed: number = GAME_CONFIG.platforms.moving.speed;

    constructor(data: PlatformData, scene: THREE.Scene) {
        this.y = data.y;
        this.gapStart = data.gapStart;
        this.gapEnd = data.gapEnd;
        this.isTrap = data.isTrap;
        this.isMoving = data.isMoving;

        this.mesh = new THREE.Group();

        const color = parseInt(data.color, 16);
        this.createRingWithGap(color);

        this.mesh.position.y = this.y;
        scene.add(this.mesh);
    }

    private createRingWithGap(color: number): void {
        const TAU = Math.PI * 2;
        const normalizeRad = (angle: number): number => {
            let normalized = angle % TAU;
            if (normalized < 0) normalized += TAU;
            return normalized;
        };

        const gapStartRad = THREE.MathUtils.degToRad(this.gapStart);
        const gapEndRad = THREE.MathUtils.degToRad(this.gapEnd);

        let gapSizeRad = gapEndRad - gapStartRad;
        if (gapSizeRad < 0) gapSizeRad += TAU;

        const solidAngle = TAU - gapSizeRad;
        const solidStartRad = gapEndRad;

        if (solidAngle <= 0.1) return;

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
            color,
            metalness: 0.2,
            roughness: 0.6,
            side: THREE.DoubleSide,
        });

        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111,
            side: THREE.DoubleSide,
        });

        const borderThickness = 0.06;
        const borderLift = 0.002;
        const edgeBorderAngle = 0.03;

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

        const outerBorderGeometry = new THREE.RingGeometry(
            this.outerRadius - borderThickness,
            this.outerRadius,
            64,
            1,
            solidStartRad,
            solidAngle
        );
        outerBorderGeometry.rotateX(-Math.PI / 2);
        const outerBorderMesh = new THREE.Mesh(outerBorderGeometry, borderMaterial);
        outerBorderMesh.position.y = this.height / 2 + borderLift;

        const innerBorderGeometry = new THREE.RingGeometry(
            this.innerRadius,
            this.innerRadius + borderThickness,
            64,
            1,
            solidStartRad,
            solidAngle
        );
        innerBorderGeometry.rotateX(-Math.PI / 2);
        const innerBorderMesh = new THREE.Mesh(innerBorderGeometry, borderMaterial);
        innerBorderMesh.position.y = this.height / 2 + borderLift;

        const makeEdgeTopBorder = (edgeAngle: number): THREE.Mesh => {
            const edgeTopGeometry = new THREE.RingGeometry(
                this.innerRadius,
                this.outerRadius,
                64,
                1,
                normalizeRad(edgeAngle - edgeBorderAngle / 2),
                edgeBorderAngle
            );
            edgeTopGeometry.rotateX(-Math.PI / 2);
            const edgeTopMesh = new THREE.Mesh(edgeTopGeometry, borderMaterial);
            edgeTopMesh.position.y = this.height / 2 + borderLift;
            return edgeTopMesh;
        };

        // const radialSpan = this.outerRadius - this.innerRadius;
        // const radialMid = this.innerRadius + radialSpan / 2;
        // const makeEdgeSideBorder = (edgeAngle: number): THREE.Mesh => {
        //     const edgeSideGeometry = new THREE.PlaneGeometry(radialSpan, this.height);
        //     const edgeSideMesh = new THREE.Mesh(edgeSideGeometry, borderMaterial);
        //     edgeSideMesh.position.set(
        //         Math.cos(edgeAngle) * radialMid,
        //         0,
        //         Math.sin(edgeAngle) * radialMid
        //     );
        //     edgeSideMesh.rotation.y = -edgeAngle;
        //     return edgeSideMesh;
        // };

        // Always use actual gap boundaries for edge lines.
        const gapEdgeStartRad = normalizeRad(gapStartRad);
        const gapEdgeEndRad = normalizeRad(gapEndRad);

        const startEdgeTopBorderMesh = makeEdgeTopBorder(gapEdgeStartRad);
        const endEdgeTopBorderMesh = makeEdgeTopBorder(gapEdgeEndRad);
        // const startEdgeSideBorderMesh = makeEdgeSideBorder(gapEdgeStartRad);
        // const endEdgeSideBorderMesh = makeEdgeSideBorder(gapEdgeEndRad);

        const bottomGeometry = topGeometry.clone();
        const bottomMesh = new THREE.Mesh(bottomGeometry, material);
        bottomMesh.position.y = -this.height / 2;

        const outerMesh = new THREE.Mesh(ringGeometry, material);
        const innerMesh = new THREE.Mesh(innerGeometry, material);

        this.mesh.add(topMesh);
        this.mesh.add(outerBorderMesh);
        this.mesh.add(innerBorderMesh);
        this.mesh.add(startEdgeTopBorderMesh);
        this.mesh.add(endEdgeTopBorderMesh);
        // this.mesh.add(startEdgeSideBorderMesh);
        // this.mesh.add(endEdgeSideBorderMesh);
        this.mesh.add(bottomMesh);
        this.mesh.add(outerMesh);
        this.mesh.add(innerMesh);

        if (this.isMoving) {
            this.addMovingIndicatorSpokes(solidStartRad, solidAngle);
        }
    }

    private addMovingIndicatorSpokes(solidStartRad: number, solidAngle: number): void {
        const spokeConfig = GAME_CONFIG.platforms.moving.indicatorSpokes;
        const spokeCount = spokeConfig.count;
        if (spokeCount <= 0 || solidAngle <= 0.1) return;

        const edgePadding = Math.min(spokeConfig.edgePaddingRadians, solidAngle * 0.25);
        const usableAngle = solidAngle - edgePadding * 2;
        if (usableAngle <= 0.05) return;

        const spokeLength = (this.outerRadius - spokeConfig.radialInset) - (this.innerRadius + spokeConfig.radialInset);
        if (spokeLength <= 0) return;

        const spokeMidRadius = this.innerRadius + spokeConfig.radialInset + spokeLength / 2;
        const spokeMaterial = new THREE.MeshBasicMaterial({
            color: spokeConfig.color,
            side: THREE.DoubleSide,
        });

        for (let i = 0; i < spokeCount; i++) {
            const t = (i + 1) / (spokeCount + 1);
            const angle = solidStartRad + edgePadding + usableAngle * t;

            const spokeGeometry = new THREE.BoxGeometry(
                spokeLength,
                spokeConfig.thickness,
                spokeConfig.width
            );
            const spokeMesh = new THREE.Mesh(spokeGeometry, spokeMaterial);
            spokeMesh.position.set(
                Math.cos(angle) * spokeMidRadius,
                this.height / 2 + spokeConfig.lift,
                Math.sin(angle) * spokeMidRadius
            );
            spokeMesh.rotation.y = -angle;
            this.mesh.add(spokeMesh);
        }
    }

    update(): void {
        if (this.isMoving) {
            this.selfRotation += this.movingSpeed * this.movingDirection;

            if (Math.abs(this.selfRotation) > GAME_CONFIG.platforms.moving.maxSwingRadians) {
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
