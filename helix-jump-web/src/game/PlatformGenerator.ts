import * as THREE from 'three';
import { Platform, PlatformData } from './Platform';
import { GAME_CONFIG, PlatformDifficultyBand } from '../config/gameConfig';

type DifficultyParams = Omit<PlatformDifficultyBand, 'maxScoreExclusive'>;

export class PlatformGenerator {
    private scene: THREE.Scene;
    private platforms: Platform[] = [];
    private towerGroup: THREE.Group;

    private lastGapCenter: number = GAME_CONFIG.platforms.initialGapCenter;
    private lastY: number = GAME_CONFIG.platforms.initialY;
    private lastWasTrap: boolean = false;
    private lastWasMoving: boolean = false;
    private platformCount: number = 0;

    constructor(scene: THREE.Scene, towerGroup: THREE.Group) {
        this.scene = scene;
        this.towerGroup = towerGroup;
    }

    private getDifficulty(score: number): DifficultyParams {
        const band = GAME_CONFIG.platforms.difficultyBands.find((item) => score < item.maxScoreExclusive)
            ?? GAME_CONFIG.platforms.difficultyBands[GAME_CONFIG.platforms.difficultyBands.length - 1];

        const { maxScoreExclusive: _ignored, ...params } = band;
        return params;
    }

    private randomRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    private normalizeAngle(angle: number): number {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    }

    private generatePlatformData(score: number): PlatformData {
        const difficulty = this.getDifficulty(score);

        const spacing = this.randomRange(
            GAME_CONFIG.platforms.spacing.min,
            GAME_CONFIG.platforms.spacing.max
        );
        const y = this.lastY - spacing;

        const gapOffset = this.randomRange(
            GAME_CONFIG.platforms.gapCenterOffsetRange.min,
            GAME_CONFIG.platforms.gapCenterOffsetRange.max
        );
        let gapCenter = this.normalizeAngle(this.lastGapCenter + gapOffset);

        const gapSize = this.randomRange(difficulty.minGapSize, difficulty.maxGapSize);
        let gapStart = this.normalizeAngle(gapCenter - gapSize / 2);
        let gapEnd = this.normalizeAngle(gapCenter + gapSize / 2);

        let isTrap = false;
        let isMoving = false;

        if (!this.lastWasTrap && !this.lastWasMoving && Math.random() < difficulty.trapChance) {
            isTrap = true;

            const trapOffset = this.randomRange(
                -GAME_CONFIG.platforms.trapGapCenterOffsetMax,
                GAME_CONFIG.platforms.trapGapCenterOffsetMax
            );
            gapCenter = this.normalizeAngle(this.lastGapCenter + trapOffset);
            gapStart = this.normalizeAngle(gapCenter - gapSize / 2);
            gapEnd = this.normalizeAngle(gapCenter + gapSize / 2);
        } else if (!this.lastWasMoving && Math.random() < difficulty.movingChance) {
            isMoving = true;
        }

        let color = '0xffffff';
        if (isTrap) color = '0xef9a9a';
        else if (isMoving) color = '0xce93d8';

        this.lastY = y;
        this.lastGapCenter = gapCenter;
        this.lastWasTrap = isTrap;
        this.lastWasMoving = isMoving;
        this.platformCount++;

        return { y, gapStart, gapEnd, isTrap, isMoving, color };
    }

    generatePlatforms(ballY: number, score: number): void {
        const targetY = ballY - GAME_CONFIG.platforms.generationBufferDistance;

        while (this.lastY > targetY) {
            const data = this.generatePlatformData(score);
            const platform = new Platform(data, this.scene);
            this.towerGroup.add(platform.mesh);
            this.platforms.push(platform);
        }
    }

    cleanupPlatforms(ballY: number): void {
        const cleanupY = ballY + GAME_CONFIG.platforms.cleanupDistance;

        this.platforms = this.platforms.filter(platform => {
            if (platform.y > cleanupY) {
                this.towerGroup.remove(platform.mesh);
                platform.mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        if (child.material instanceof THREE.Material) {
                            child.material.dispose();
                        }
                    }
                });
                return false;
            }
            return true;
        });
    }

    getPlatforms(): Platform[] {
        return this.platforms;
    }

    updatePlatforms(): void {
        this.platforms.forEach(platform => platform.update());
    }

    reset(): void {
        this.platforms.forEach(platform => {
            this.towerGroup.remove(platform.mesh);
        });
        this.platforms = [];

        this.lastGapCenter = GAME_CONFIG.platforms.initialGapCenter;
        this.lastY = GAME_CONFIG.platforms.initialY;
        this.lastWasTrap = false;
        this.lastWasMoving = false;
        this.platformCount = 0;
    }
}
