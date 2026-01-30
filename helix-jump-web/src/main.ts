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

    // 시작 화면 요소
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const difficultySlider = document.getElementById('ai-difficulty') as HTMLInputElement;
    const difficultyValue = document.getElementById('difficulty-value');

    let isPlaying = false;

    // 난이도 슬라이더 이벤트
    if (difficultySlider && difficultyValue) {
        difficultySlider.addEventListener('input', () => {
            difficultyValue.textContent = difficultySlider.value;
        });
    }

    // 게임 시작 버튼 이벤트
    if (startBtn && startScreen) {
        startBtn.addEventListener('click', () => {
            startScreen.style.display = 'none';
            isPlaying = true;

            // AI 난이도 적용 (0~100 -> 0.0~1.0)
            const difficulty = parseInt(difficultySlider.value) / 100;
            aiGame.setAIDifficulty(difficulty);
        });
    }

    // 공통 애니메이션 루프
    const animate = () => {
        requestAnimationFrame(animate);

        if (isPlaying) {
            // Human 게임 업데이트
            humanGame.update();

            // AI 게임 업데이트
            aiGame.update();

            // 게임이 둘 다 진행 중일 때만 점수 비교 및 승리 체크
            if (!humanGame.isOver() && !aiGame.isOver()) {
                const humanScore = humanGame.getScore();
                const aiScore = aiGame.getScore();
                const diff = humanScore - aiScore;

                // 배경색 업데이트
                const maxDiff = 10;
                const ratio = Math.min(Math.abs(diff) / maxDiff, 1.0);

                // 기본 배경색 (0xf0f2f5) -> RGB (0.94, 0.95, 0.96)
                const baseR = 0.94;
                const baseG = 0.95;
                const baseB = 0.96;

                // 목표 빨간색 (0xffcdd2) -> RGB (1.0, 0.8, 0.82)
                const targetR = 1.0;
                const targetG = 0.6;
                const targetB = 0.6;

                // 보간 계산
                const currentR = baseR + (targetR - baseR) * ratio;
                const currentG = baseG + (targetG - baseG) * ratio;
                const currentB = baseB + (targetB - baseB) * ratio;

                if (diff > 0) {
                    // Human 이김: AI 배경 빨개짐
                    aiGame.setTargetBackgroundColor(currentR, currentG, currentB);
                    humanGame.setTargetBackgroundColor(baseR, baseG, baseB);
                } else if (diff < 0) {
                    // AI 이김: Human 배경 빨개짐
                    humanGame.setTargetBackgroundColor(currentR, currentG, currentB);
                    aiGame.setTargetBackgroundColor(baseR, baseG, baseB);
                } else {
                    // 동점
                    humanGame.setTargetBackgroundColor(baseR, baseG, baseB);
                    aiGame.setTargetBackgroundColor(baseR, baseG, baseB);
                }

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
                        humanGame.forceGameOver("🏆 PERFECT WIN!");
                        aiGame.forceGameOver("❌ DEFEAT (Score Gap > 10)");
                    } else {
                        aiGame.forceGameOver("🏆 AI WINS!");
                        humanGame.forceGameOver("❌ DEFEAT (Score Gap > 10)");
                    }
                }
            }
        }

        // 렌더링은 항상 수행 (정지 화면 표시)
        humanGame.render();
        aiGame.render();
    };

    animate();
});
