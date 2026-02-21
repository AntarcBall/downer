import { Game } from './game/Game';

// DOM loaded -> start game setup
document.addEventListener('DOMContentLoaded', () => {
    const humanCanvas = document.getElementById('human-canvas') as HTMLCanvasElement;
    const aiCanvas = document.getElementById('ai-canvas') as HTMLCanvasElement;

    if (!humanCanvas || !aiCanvas) {
        console.error('Canvas elements not found!');
        return;
    }

    const sharedLayoutSeed = (Math.random() * 0xffffffff) >>> 0;

    const humanGame = new Game(humanCanvas, {
        isAI: false,
        scoreElementId: 'human-score',
        gameOverElementId: 'human-game-over',
        layoutSeed: sharedLayoutSeed,
    });

    const aiGame = new Game(aiCanvas, {
        isAI: true,
        scoreElementId: 'ai-score',
        gameOverElementId: 'ai-game-over',
        layoutSeed: sharedLayoutSeed,
    });

    const humanScoreBox = document.getElementById('human-score-box');
    const aiScoreBox = document.getElementById('ai-score-box');

    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const difficultySlider = document.getElementById('ai-difficulty') as HTMLInputElement;
    const difficultyValue = document.getElementById('difficulty-value');

    let isPlaying = false;
    let isRoundFrozen = false;

    const freezeRound = (humanMessage: string, aiMessage: string): void => {
        if (isRoundFrozen) return;

        isRoundFrozen = true;
        isPlaying = false;

        humanGame.forceGameOver(humanMessage);
        aiGame.forceGameOver(aiMessage);
    };

    if (difficultySlider && difficultyValue) {
        difficultySlider.addEventListener('input', () => {
            difficultyValue.textContent = difficultySlider.value;
        });
    }

    if (startBtn && startScreen) {
        startBtn.addEventListener('click', () => {
            startScreen.style.display = 'none';
            isPlaying = true;
            isRoundFrozen = false;

            const difficulty = parseInt(difficultySlider.value, 10) / 100;
            aiGame.setAIDifficulty(difficulty);
        });
    }

    const animate = () => {
        requestAnimationFrame(animate);

        if (isPlaying && !isRoundFrozen) {
            humanGame.update();
            aiGame.update();

            if (humanGame.isOver() || aiGame.isOver()) {
                if (humanGame.isOver() && !aiGame.isOver()) {
                    freezeRound('HUMAN DOWN', 'AI SURVIVED');
                } else if (!humanGame.isOver() && aiGame.isOver()) {
                    freezeRound('HUMAN SURVIVED', 'AI DOWN');
                } else {
                    freezeRound('ROUND END', 'ROUND END');
                }
            } else {
                const humanScore = humanGame.getScore();
                const aiScore = aiGame.getScore();
                const diff = humanScore - aiScore;

                const maxDiff = 10;
                const ratio = Math.min(Math.abs(diff) / maxDiff, 1.0);

                const baseR = 0.94;
                const baseG = 0.95;
                const baseB = 0.96;

                const targetR = 200 / 255;
                const targetG = 0;
                const targetB = 0;

                const currentR = baseR + (targetR - baseR) * ratio;
                const currentG = baseG + (targetG - baseG) * ratio;
                const currentB = baseB + (targetB - baseB) * ratio;

                if (diff > 0) {
                    aiGame.setTargetBackgroundColor(currentR, currentG, currentB);
                    humanGame.setTargetBackgroundColor(baseR, baseG, baseB);
                } else if (diff < 0) {
                    humanGame.setTargetBackgroundColor(currentR, currentG, currentB);
                    aiGame.setTargetBackgroundColor(baseR, baseG, baseB);
                } else {
                    humanGame.setTargetBackgroundColor(baseR, baseG, baseB);
                    aiGame.setTargetBackgroundColor(baseR, baseG, baseB);
                }

                if (humanScoreBox && aiScoreBox) {
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

                if (Math.abs(diff) >= 10) {
                    if (diff > 0) {
                        freezeRound('PERFECT WIN!', 'DEFEAT (Score Gap > 10)');
                    } else {
                        freezeRound('DEFEAT (Score Gap > 10)', 'AI WINS!');
                    }
                }
            }
        }

        // Render is always called to keep frozen game state visible.
        humanGame.render();
        aiGame.render();
    };

    animate();
});
