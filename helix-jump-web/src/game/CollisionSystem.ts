import { Ball } from './Ball';
import { Platform } from './Platform';
import { Tower } from './Tower';

export type CollisionType = 'none' | 'bounce' | 'pass' | 'trap' | 'finish';

export interface CollisionResult {
    type: CollisionType;
    platform?: Platform;
}

/**
 * 원통 좌표계 기반 충돌 감지 시스템
 * 물리 엔진 없이 수학적 좌표 비교로 구현 (advice.md 방식)
 */
export class CollisionSystem {
    private readonly collisionThreshold: number = 0.4;

    /**
     * 공과 플랫폼 충돌 검사
     * 1단계: 높이 체크 (Y 좌표)
     * 2단계: 각도 체크 (Gap 여부)
     */
    checkCollision(ball: Ball, tower: Tower): CollisionResult {
        // 공이 죽었으면 체크 안함
        if (!ball.isAlive) {
            return { type: 'none' };
        }

        // 피니시 라인 체크
        if (ball.y <= tower.finishY + 0.5) {
            return { type: 'finish' };
        }

        // 공이 올라가는 중이면 충돌 체크 안함 (아래로 떨어질 때만)
        if (ball.velocityY > 0) {
            return { type: 'none' };
        }

        const ballY = ball.y;
        const ballRadius = ball.getRadius();

        for (const platform of tower.platforms) {
            // 1단계: 높이 체크
            const platformTop = platform.y + 0.075; // 플랫폼 두께의 절반
            const platformBottom = platform.y - 0.075;

            // 공의 바닥이 플랫폼 상단보다 낮고, 이전 프레임에서는 위에 있었을 때
            if (ballY - ballRadius <= platformTop &&
                ballY - ballRadius >= platformBottom - this.collisionThreshold) {

                // 2단계: 각도 체크
                // 타워의 전체 회전 + 플랫폼 자체 회전
                const towerRotationDeg = tower.getRotationDegrees();
                const platformSelfRotationDeg = platform.selfRotation * (180 / Math.PI);

                // 공 위치: (0, y, 1.5) → Z+ 방향 (화면 앞쪽)
                // Three.js 좌표계상 Z+ 방향은 270도(또는 -90도)에 해당함
                const ballWorldAngle = 270;
                const effectiveAngle = this.normalizeAngle(ballWorldAngle - towerRotationDeg - platformSelfRotationDeg);

                // 구멍 범위 체크
                if (this.isInGap(effectiveAngle, platform.gapStart, platform.gapEnd)) {
                    // 구멍 통과
                    return { type: 'pass', platform };
                } else {
                    // 바닥에 닿음
                    if (platform.isTrap) {
                        return { type: 'trap', platform };
                    } else {
                        return { type: 'bounce', platform };
                    }
                }
            }
        }

        return { type: 'none' };
    }

    /**
     * 각도를 0-360 범위로 정규화
     */
    private normalizeAngle(angle: number): number {
        angle = angle % 360;
        if (angle < 0) angle += 360;
        return angle;
    }

    /**
     * 주어진 각도가 구멍 범위 내에 있는지 확인
     */
    private isInGap(angle: number, gapStart: number, gapEnd: number): boolean {
        gapStart = this.normalizeAngle(gapStart);
        gapEnd = this.normalizeAngle(gapEnd);
        angle = this.normalizeAngle(angle);

        // 구멍이 0도를 걸치는 경우 (예: 315 ~ 45)
        if (gapStart > gapEnd) {
            return angle >= gapStart || angle <= gapEnd;
        } else {
            return angle >= gapStart && angle <= gapEnd;
        }
    }
}
