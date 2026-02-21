import { Game } from './game/Game';

const RESTART_HOLD_MS = 1000;
const RESTART_START_DELAY_MS = 1000;

const BASE_BG = { r: 0.94, g: 0.95, b: 0.96 };
const TARGET_BG = { r: 200 / 255, g: 0, b: 0 };

document.addEventListener('DOMContentLoaded', () => {
    const humanCanvas = document.getElementById('human-canvas') as HTMLCanvasElement;
    const aiCanvas = document.getElementById('ai-canvas') as HTMLCanvasElement;

    if (!humanCanvas || !aiCanvas) {
        console.error('Canvas elements not found!');
        return;
    }

    const humanScoreBox = document.getElementById('human-score-box');
    const aiScoreBox = document.getElementById('ai-score-box');

    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const difficultySlider = document.getElementById('ai-difficulty') as HTMLInputElement;
    const difficultyValue = document.getElementById('difficulty-value');

    const humanGameOverCard = document.getElementById('human-game-over');
    const aiGameOverCard = document.getElementById('ai-game-over');

    let humanGame: Game;
    let aiGame: Game;
    let currentLayoutSeed = randomSeed();

    let isPlaying = false;
    let isRoundFrozen = false;
    let roundStartDelayUntil: number | null = null;

    let isQHeld = false;
    let isEHeld = false;
    let restartHoldStartedAt: number | null = null;

    const getDifficulty = (): number => {
        return Math.max(0, Math.min(1, parseInt(difficultySlider.value, 10) / 100));
    };

    const resetRoundUI = (): void => {
        if (humanScoreBox && aiScoreBox) {
            humanScoreBox.classList.remove('human-lead', 'losing');
            aiScoreBox.classList.remove('ai-lead', 'losing');
        }

        if (humanGameOverCard) {
            const titleEl = humanGameOverCard.querySelector('h2');
            const finalScoreEl = humanGameOverCard.querySelector('.final-score');
            if (titleEl) titleEl.textContent = 'ROUND END';
            if (finalScoreEl) finalScoreEl.textContent = 'Score: 0';
            humanGameOverCard.style.display = 'none';
        }

        if (aiGameOverCard) {
            const titleEl = aiGameOverCard.querySelector('h2');
            const finalScoreEl = aiGameOverCard.querySelector('.final-score');
            if (titleEl) titleEl.textContent = 'ROUND END';
            if (finalScoreEl) finalScoreEl.textContent = 'Score: 0';
            aiGameOverCard.style.display = 'none';
        }
    };

    const createGames = (layoutSeed: number): void => {
        if (humanGame) humanGame.dispose();
        if (aiGame) aiGame.dispose();

        humanGame = new Game(humanCanvas, {
            isAI: false,
            scoreElementId: 'human-score',
            gameOverElementId: 'human-game-over',
            layoutSeed,
        });

        aiGame = new Game(aiCanvas, {
            isAI: true,
            scoreElementId: 'ai-score',
            gameOverElementId: 'ai-game-over',
            layoutSeed,
        });

        aiGame.setAIDifficulty(getDifficulty());
        humanGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
        aiGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
    };

    const freezeRound = (humanMessage: string, aiMessage: string): void => {
        if (isRoundFrozen) return;

        isRoundFrozen = true;
        isPlaying = false;
        restartHoldStartedAt = null;

        humanGame.forceGameOver(humanMessage);
        aiGame.forceGameOver(aiMessage);
    };

    const restartRound = (): void => {
        currentLayoutSeed = nextDifferentSeed(currentLayoutSeed);
        createGames(currentLayoutSeed);
        resetRoundUI();

        isRoundFrozen = false;
        isPlaying = true;
        roundStartDelayUntil = Date.now() + RESTART_START_DELAY_MS;
        restartHoldStartedAt = null;
    };

    const updateRestartHold = (): void => {
        if (!isRoundFrozen) {
            restartHoldStartedAt = null;
            return;
        }

        if (!isQHeld || !isEHeld) {
            restartHoldStartedAt = null;
            return;
        }

        if (restartHoldStartedAt === null) {
            restartHoldStartedAt = Date.now();
            return;
        }

        if (Date.now() - restartHoldStartedAt >= RESTART_HOLD_MS) {
            restartRound();
        }
    };

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'q') isQHeld = true;
        if (key === 'e') isEHeld = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'q') isQHeld = false;
        if (key === 'e') isEHeld = false;

        if (!isQHeld || !isEHeld) {
            restartHoldStartedAt = null;
        }
    });

    createGames(currentLayoutSeed);
    resetRoundUI();

    if (difficultySlider && difficultyValue) {
        difficultySlider.addEventListener('input', () => {
            difficultyValue.textContent = difficultySlider.value;
            if (aiGame) aiGame.setAIDifficulty(getDifficulty());
        });
    }

    if (startBtn && startScreen) {
        startBtn.addEventListener('click', () => {
            startScreen.style.display = 'none';
            isPlaying = true;
            isRoundFrozen = false;
            roundStartDelayUntil = null;
            aiGame.setAIDifficulty(getDifficulty());
        });
    }

    const animate = () => {
        requestAnimationFrame(animate);

        updateRestartHold();

        if (isPlaying && !isRoundFrozen) {
            if (roundStartDelayUntil !== null) {
                if (Date.now() < roundStartDelayUntil) {
                    humanGame.render();
                    aiGame.render();
                    return;
                }
                roundStartDelayUntil = null;
            }

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

                const currentR = BASE_BG.r + (TARGET_BG.r - BASE_BG.r) * ratio;
                const currentG = BASE_BG.g + (TARGET_BG.g - BASE_BG.g) * ratio;
                const currentB = BASE_BG.b + (TARGET_BG.b - BASE_BG.b) * ratio;

                if (diff > 0) {
                    aiGame.setTargetBackgroundColor(currentR, currentG, currentB);
                    humanGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
                } else if (diff < 0) {
                    humanGame.setTargetBackgroundColor(currentR, currentG, currentB);
                    aiGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
                } else {
                    humanGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
                    aiGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
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

        humanGame.render();
        aiGame.render();
    };

    animate();
});

function randomSeed(): number {
    return (Math.random() * 0xffffffff) >>> 0;
}

function nextDifferentSeed(currentSeed: number): number {
    let next = randomSeed();
    while (next === currentSeed) {
        next = randomSeed();
    }
    return next;
}
