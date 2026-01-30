import { Game } from './game/Game';

// DOM 로드 후 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    // Human 플레이어 캔버스
    const humanCanvas = document.getElementById('human-canvas') as HTMLCanvasElement;
    // AI 플레이어 캔버스
    const aiCanvas = document.getElementById('ai-canvas') as HTMLCanvasElement;

    if (!humanCanvas || !aiCanvas) {
        console.error('Canvas elements not found!');
        return;
    }

    // Human 게임 인스턴스
    const humanGame = new Game(humanCanvas, {
        isAI: false,
        scoreElementId: 'human-score',
        gameOverElementId: 'human-game-over'
    });

    // AI 게임 인스턴스
    const aiGame = new Game(aiCanvas, {
        isAI: true,
        scoreElementId: 'ai-score',
        gameOverElementId: 'ai-game-over'
    });

    // 점수 UI 요소
    const humanScoreBox = document.getElementById('human-score-box');
    const aiScoreBox = document.getElementById('ai-score-box');

    // 공통 애니메이션 루프
    const animate = () => {
        requestAnimationFrame(animate);

        // Human 게임 업데이트 및 렌더
        humanGame.update();
        humanGame.render();

        // AI 게임 업데이트 및 렌더
        aiGame.update();
        aiGame.render();

        // 게임이 둘 다 진행 중일 때만 점수 비교 및 승리 체크
        if (!humanGame.isOver() && !aiGame.isOver()) {
            const humanScore = humanGame.getScore();
            const aiScore = aiGame.getScore();
            const diff = humanScore - aiScore;

            // UI 효과 업데이트
            if (humanScoreBox && aiScoreBox) {
                // 초기화
                humanScoreBox.classList.remove('human-lead', 'losing');
                aiScoreBox.classList.remove('ai-lead', 'losing');

                if (diff > 0) {
                    humanScoreBox.classList.add('human-lead');
                    aiScoreBox.classList.add('losing');
                } else if (diff < 0) {
                    aiScoreBox.classList.add('ai-lead');
                    humanScoreBox.classList.add('losing');
                }
            }

            // 승리 조건 체크 (점수차 10점 이상)
            if (Math.abs(diff) >= 10) {
                if (diff > 0) {
                    // Human 승리
                    humanGame.forceGameOver("🏆 PERFECT WIN!");
                    aiGame.forceGameOver("❌ DEFEAT (Score Gap > 10)");
                } else {
                    // AI 승리
                    aiGame.forceGameOver("🏆 AI WINS!");
                    humanGame.forceGameOver("❌ DEFEAT (Score Gap > 10)");
                }
            }
        }
    };

    animate();
});
