import { Tower } from './Tower';
import { Platform } from './Platform';
import { Ball } from './Ball';

/**
 * AI 컨트롤러 - 다음 플랫폼의 구멍 방향으로 회전
 * 사람과 동일한 회전 속도(rotationSpeed)를 사용
 */
export class AIController {
    private rotationSpeed: number;

    constructor(rotationSpeed: number) {
        this.rotationSpeed = rotationSpeed;
    }

    /**
     * AI가 회전 방향을 결정하고 타워를 회전시킴
     */
    update(ball: Ball, tower: Tower, platforms: Platform[]): void {
        // 공 아래에 있는 가장 가까운 플랫폼 찾기
        const nextPlatform = this.findNextPlatform(ball.y, platforms);
        if (!nextPlatform) return;

        // 목표 구멍 중심 각도 계산
        let gapStart = nextPlatform.gapStart;
        let gapEnd = nextPlatform.gapEnd;

        // 구멍이 0도를 걸치는 경우 처리
        if (gapStart > gapEnd) {
            gapEnd += 360;
        }
        const gapCenter = ((gapStart + gapEnd) / 2) % 360;

        // 공의 현재 각도 (Tower 회전 + Platform 자체 회전 고려)
        const towerRotationDeg = tower.getRotationDegrees();
        const platformSelfRotationDeg = nextPlatform.selfRotation * (180 / Math.PI);

        // 공은 270도 위치에 고정되어 있음
        // 공이 구멍을 통과하려면: 270 - towerRotation - platformSelfRotation ≈ gapCenter
        // 즉, towerRotation ≈ 270 - gapCenter - platformSelfRotation
        const targetTowerRotationDeg = 270 - gapCenter - platformSelfRotationDeg;

        // 현재 타워 회전과 목표 회전의 차이
        let angleDiff = this.normalizeAngle(targetTowerRotationDeg - towerRotationDeg);

        // -180 ~ 180 범위로 변환 (최단 경로 선택)
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;

        // 각도 차이에 따라 회전 (데드존 적용)
        const deadZone = 5; // 5도 이내면 정지
        if (Math.abs(angleDiff) > deadZone) {
            if (angleDiff > 0) {
                tower.rotate(this.rotationSpeed);
            } else {
                tower.rotate(-this.rotationSpeed);
            }
        }
    }

    /**
     * 공 아래에 있는 가장 가까운 플랫폼 찾기
     */
    private findNextPlatform(ballY: number, platforms: Platform[]) {
        let closest = null;
        let closestDist = Infinity;

        for (const platform of platforms) {
            // 공보다 아래에 있는 플랫폼만
            if (platform.y < ballY) {
                const dist = ballY - platform.y;
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = platform;
                }
            }
        }

        return closest;
    }

    private normalizeAngle(angle: number): number {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    }
}
