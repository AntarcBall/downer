import { Ball } from './Ball';
import { Platform } from './Platform';
import { Tower } from './Tower';
import { GAME_CONFIG } from '../config/gameConfig';

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
    private readonly collisionThreshold: number = GAME_CONFIG.collision.threshold;

    /**
     * 공과 플랫폼 충돌 검사
     * 1단계: 높이 체크 (Y 좌표)
     * 2단계: 각도 체크 (Gap 여부)
     */
    checkCollision(_ball: Ball, _tower: Tower): CollisionResult {
        // 이 메서드는 이제 사용하지 않음 (하위 호환용)
        return { type: 'none' };
    }

    /**
     * 플랫폼 목록을 외부에서 받아서 충돌 검사
     * 무한 생성 모드에서 사용
     */
    checkCollisionWithPlatforms(ball: Ball, tower: Tower, platforms: Platform[]): CollisionResult {
        if (!ball.isAlive) {
            return { type: 'none' };
        }

        // 공이 올라가는 중이면 충돌 체크 안함
        if (ball.velocityY > 0) {
            return { type: 'none' };
        }

        const ballY = ball.y;
        const ballRadius = ball.getRadius();

        for (const platform of platforms) {
            // 1단계: 높이 체크
            const platformTop = platform.y + GAME_CONFIG.collision.platformHalfHeight;
            const platformBottom = platform.y - GAME_CONFIG.collision.platformHalfHeight;

            if (ballY - ballRadius <= platformTop &&
                ballY - ballRadius >= platformBottom - this.collisionThreshold) {

                // 2단계: 각도 체크
                const towerRotationDeg = tower.getRotationDegrees();
                const platformSelfRotationDeg = platform.selfRotation * (180 / Math.PI);

                const ballWorldAngle = GAME_CONFIG.collision.ballWorldAngleDeg;
                const effectiveAngle = this.normalizeAngle(ballWorldAngle - towerRotationDeg - platformSelfRotationDeg);

                if (this.isInGap(effectiveAngle, platform.gapStart, platform.gapEnd)) {
                    return { type: 'pass', platform };
                } else {
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
