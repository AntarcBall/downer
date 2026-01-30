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

    // 공통 애니메이션 루프
    const animate = () => {
        requestAnimationFrame(animate);

        // Human 게임 업데이트 및 렌더
        humanGame.update();
        humanGame.render();

        // AI 게임 업데이트 및 렌더
        aiGame.update();
        aiGame.render();
    };

    animate();
});
