import * as THREE from 'three';
import { Platform, PlatformData } from './Platform';

interface DifficultyParams {
    trapChance: number;
    movingChance: number;
    minGapSize: number;
    maxGapSize: number;
}

export class PlatformGenerator {
    private scene: THREE.Scene;
    private platforms: Platform[] = [];
    private towerGroup: THREE.Group;

    private lastGapCenter: number = 45; // 초기 구멍 중심
    private lastY: number = -2; // 마지막 생성된 플랫폼 Y
    private lastWasTrap: boolean = false;
    private lastWasMoving: boolean = false;
    private platformCount: number = 0;

    private readonly platformSpacingMin: number = 1.8;
    private readonly platformSpacingMax: number = 2.2;
    private readonly bufferDistance: number = 15; // 공 아래로 미리 생성
    private readonly cleanupDistance: number = 10; // 공 위로 정리

    constructor(scene: THREE.Scene, towerGroup: THREE.Group) {
        this.scene = scene;
        this.towerGroup = towerGroup;
    }

    // 난이도 파라미터 계산
    private getDifficulty(score: number): DifficultyParams {
        if (score < 100) {
            return { trapChance: 0.10, movingChance: 0.15, minGapSize: 90, maxGapSize: 100 };
        } else if (score < 300) {
            return { trapChance: 0.15, movingChance: 0.20, minGapSize: 80, maxGapSize: 100 };
        } else if (score < 500) {
            return { trapChance: 0.20, movingChance: 0.25, minGapSize: 70, maxGapSize: 95 };
        } else {
            return { trapChance: 0.25, movingChance: 0.30, minGapSize: 60, maxGapSize: 90 };
        }
    }

    // 랜덤 범위
    private randomRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    // 각도 정규화 (0~360)
    private normalizeAngle(angle: number): number {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    }

    // 다음 플랫폼 생성
    private generatePlatformData(score: number): PlatformData {
        const difficulty = this.getDifficulty(score);

        // 1. Y 위치 결정
        const spacing = this.randomRange(this.platformSpacingMin, this.platformSpacingMax);
        const y = this.lastY - spacing;

        // 2. 구멍 중심 결정 (이전 구멍 ±120도 내)
        const gapOffset = this.randomRange(-120, 120);
        let gapCenter = this.normalizeAngle(this.lastGapCenter + gapOffset);

        // 3. 구멍 크기 결정
        const gapSize = this.randomRange(difficulty.minGapSize, difficulty.maxGapSize);
        let gapStart = this.normalizeAngle(gapCenter - gapSize / 2);
        let gapEnd = this.normalizeAngle(gapCenter + gapSize / 2);

        // 4. 플랫폼 타입 결정
        let isTrap = false;
        let isMoving = false;

        // 함정은 연속 불가, 움직이는 플랫폼 다음에는 불가
        if (!this.lastWasTrap && !this.lastWasMoving && Math.random() < difficulty.trapChance) {
            isTrap = true;

            // 함정 구멍은 이전 구멍과 90도 이내로 조정
            const maxOffset = 45; // 중심 기준 ±45도 = 총 90도 범위
            const trapOffset = this.randomRange(-maxOffset, maxOffset);
            gapCenter = this.normalizeAngle(this.lastGapCenter + trapOffset);
            gapStart = this.normalizeAngle(gapCenter - gapSize / 2);
            gapEnd = this.normalizeAngle(gapCenter + gapSize / 2);
        } else if (!this.lastWasMoving && Math.random() < difficulty.movingChance) {
            isMoving = true;
        }

        // 5. 색상 결정
        let color = '0xffffff'; // 일반
        if (isTrap) color = '0xef9a9a';
        else if (isMoving) color = '0xce93d8';

        // 상태 업데이트
        this.lastY = y;
        this.lastGapCenter = gapCenter;
        this.lastWasTrap = isTrap;
        this.lastWasMoving = isMoving;
        this.platformCount++;

        return { y, gapStart, gapEnd, isTrap, isMoving, color };
    }

    // 플랫폼 생성 (공 위치 기준)
    generatePlatforms(ballY: number, score: number): void {
        // 공 아래로 bufferDistance만큼 플랫폼 생성
        const targetY = ballY - this.bufferDistance;

        while (this.lastY > targetY) {
            const data = this.generatePlatformData(score);
            const platform = new Platform(data, this.scene);
            this.towerGroup.add(platform.mesh);
            this.platforms.push(platform);
        }
    }

    // 오래된 플랫폼 정리 (공 위치 기준)
    cleanupPlatforms(ballY: number): void {
        const cleanupY = ballY + this.cleanupDistance;

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

    // 플랫폼 목록 반환
    getPlatforms(): Platform[] {
        return this.platforms;
    }

    // 플랫폼 업데이트 (움직이는 플랫폼)
    updatePlatforms(): void {
        this.platforms.forEach(platform => platform.update());
    }

    // 초기화
    reset(): void {
        // 모든 플랫폼 제거
        this.platforms.forEach(platform => {
            this.towerGroup.remove(platform.mesh);
        });
        this.platforms = [];

        // 상태 초기화
        this.lastGapCenter = 45;
        this.lastY = -2;
        this.lastWasTrap = false;
        this.lastWasMoving = false;
        this.platformCount = 0;
    }
}
