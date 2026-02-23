import { Game } from './game/Game';
import { GAME_CONFIG } from './config/gameConfig';

const RESTART_COMBO = ['q', 'e', 'q', 'e', 'q', 'e'] as const;
const RESTART_AFTER_COMBO_DELAY_MS = 500;

const BASE_BG = { r: 0.94, g: 0.95, b: 0.96 };
const TARGET_BG = { r: 200 / 255, g: 0, b: 0 };
const TUNING_MIN_PERCENT = 80;
const TUNING_MAX_PERCENT = 129;

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
    const scoreGapSlider = document.getElementById('score-gap-threshold') as HTMLInputElement;
    const scoreGapValue = document.getElementById('score-gap-value');
    const particleSlider = document.getElementById('particle-intensity') as HTMLInputElement;
    const particleValue = document.getElementById('particle-intensity-value');
    const rotationScaleSlider = document.getElementById('rotation-scale') as HTMLInputElement;
    const rotationScaleValue = document.getElementById('rotation-scale-value');
    const gravityScaleSlider = document.getElementById('gravity-scale') as HTMLInputElement;
    const gravityScaleValue = document.getElementById('gravity-scale-value');
    const bounceScaleSlider = document.getElementById('bounce-scale') as HTMLInputElement;
    const bounceScaleValue = document.getElementById('bounce-scale-value');
    const darkenOverlay = document.getElementById('reset-darken-overlay') as HTMLElement | null;

    const humanGameOverCard = document.getElementById('human-game-over');
    const aiGameOverCard = document.getElementById('ai-game-over');

    let humanGame: Game;
    let aiGame: Game;
    let currentLayoutSeed = randomSeed();

    let isPlaying = false;
    let isRoundFrozen = false;
    let opponentBandVisibleLatch = false;
    let scoreGapWinThreshold = 10;

    let restartComboIndex = 0;
    let restartSequenceLocked = false;

    const setCardState = (el: HTMLElement | null, state: 'neutral' | 'win' | 'lose'): void => {
        if (!el) return;
        el.classList.remove('state-win', 'state-lose');
        if (state === 'win') el.classList.add('state-win');
        if (state === 'lose') el.classList.add('state-lose');
    };

    const getDifficulty = (): number => {
        return Math.max(0, Math.min(1, parseInt(difficultySlider.value, 10) / 100));
    };

    const getScoreGapThreshold = (): number => {
        const raw = parseInt(scoreGapSlider.value, 10);
        if (Number.isNaN(raw)) return 10;
        return Math.max(4, Math.min(10, raw));
    };

    const getPercentValue = (
        slider: HTMLInputElement | null,
        min: number,
        max: number,
        fallback: number
    ): number => {
        if (!slider) return fallback;
        const raw = parseInt(slider.value, 10);
        if (Number.isNaN(raw)) return fallback;
        return Math.max(min, Math.min(max, raw));
    };

    const getParticleIntensity = (): number => {
        return getPercentValue(particleSlider, 0, 100, 50) / 100;
    };

    const getRotationSpeed = (): number => {
        const scale = getPercentValue(rotationScaleSlider, TUNING_MIN_PERCENT, TUNING_MAX_PERCENT, 100) / 100;
        return GAME_CONFIG.controls.rotationSpeed * scale;
    };

    const getGravity = (): number => {
        const scale = getPercentValue(gravityScaleSlider, TUNING_MIN_PERCENT, TUNING_MAX_PERCENT, 100) / 100;
        return GAME_CONFIG.physics.gravity * scale;
    };

    const getBounceVelocity = (): number => {
        const scale = getPercentValue(bounceScaleSlider, TUNING_MIN_PERCENT, TUNING_MAX_PERCENT, 100) / 100;
        return GAME_CONFIG.physics.bounceVelocity * scale;
    };

    const updateParticleLabel = (): void => {
        if (!particleValue) return;
        const percent = getPercentValue(particleSlider, 0, 100, 50);
        particleValue.textContent = `${percent}%`;
    };

    const updateRotationLabel = (): void => {
        if (!rotationScaleValue) return;
        const percent = getPercentValue(rotationScaleSlider, TUNING_MIN_PERCENT, TUNING_MAX_PERCENT, 100);
        rotationScaleValue.textContent = `${percent}% (${getRotationSpeed().toFixed(4)})`;
    };

    const updateGravityLabel = (): void => {
        if (!gravityScaleValue) return;
        const percent = getPercentValue(gravityScaleSlider, TUNING_MIN_PERCENT, TUNING_MAX_PERCENT, 100);
        gravityScaleValue.textContent = `${percent}% (${getGravity().toFixed(5)})`;
    };

    const updateBounceLabel = (): void => {
        if (!bounceScaleValue) return;
        const percent = getPercentValue(bounceScaleSlider, TUNING_MIN_PERCENT, TUNING_MAX_PERCENT, 100);
        bounceScaleValue.textContent = `${percent}% (${getBounceVelocity().toFixed(4)})`;
    };

    const applyDarkenProgress = (): void => {
        if (!darkenOverlay) return;
        const progress = restartComboIndex / RESTART_COMBO.length;
        darkenOverlay.style.opacity = String(progress * 0.85);
    };

    const resetRestartCombo = (): void => {
        restartComboIndex = 0;
        restartSequenceLocked = false;
        if (darkenOverlay) {
            darkenOverlay.style.opacity = '0';
        }
    };

    const resetRoundUI = (): void => {
        if (humanScoreBox && aiScoreBox) {
            humanScoreBox.classList.remove('human-lead', 'losing', 'trap-hit');
            aiScoreBox.classList.remove('ai-lead', 'losing', 'trap-hit');
        }

        if (humanGameOverCard) {
            const titleEl = humanGameOverCard.querySelector('h2');
            const finalScoreEl = humanGameOverCard.querySelector('.final-score');
            if (titleEl) titleEl.textContent = 'ROUND END';
            if (finalScoreEl) finalScoreEl.textContent = 'Score: 0';
            setCardState(humanGameOverCard, 'neutral');
            humanGameOverCard.style.display = 'none';
        }

        if (aiGameOverCard) {
            const titleEl = aiGameOverCard.querySelector('h2');
            const finalScoreEl = aiGameOverCard.querySelector('.final-score');
            if (titleEl) titleEl.textContent = 'ROUND END';
            if (finalScoreEl) finalScoreEl.textContent = 'Score: 0';
            setCardState(aiGameOverCard, 'neutral');
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
            showOpponentLayerBand: true,
            rotationSpeed: getRotationSpeed(),
            gravity: getGravity(),
            bounceVelocity: getBounceVelocity(),
            particleIntensity: getParticleIntensity(),
        });

        aiGame = new Game(aiCanvas, {
            isAI: true,
            scoreElementId: 'ai-score',
            gameOverElementId: 'ai-game-over',
            layoutSeed,
            showOpponentLayerBand: false,
            rotationSpeed: getRotationSpeed(),
            gravity: getGravity(),
            bounceVelocity: getBounceVelocity(),
            particleIntensity: getParticleIntensity(),
        });

        aiGame.setAIDifficulty(getDifficulty());
        humanGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
        aiGame.setTargetBackgroundColor(BASE_BG.r, BASE_BG.g, BASE_BG.b);
    };

    const freezeRound = (
        humanMessage: string,
        aiMessage: string,
        humanState: 'neutral' | 'win' | 'lose' = 'neutral',
        aiState: 'neutral' | 'win' | 'lose' = 'neutral'
    ): void => {
        if (isRoundFrozen) return;

        isRoundFrozen = true;
        isPlaying = false;
        resetRestartCombo();

        humanGame.forceGameOver(humanMessage);
        aiGame.forceGameOver(aiMessage);
        setCardState(humanGameOverCard, humanState);
        setCardState(aiGameOverCard, aiState);
    };

    const restartRound = (): void => {
        currentLayoutSeed = nextDifferentSeed(currentLayoutSeed);
        createGames(currentLayoutSeed);
        resetRoundUI();

        isRoundFrozen = false;
        isPlaying = true;
        resetRestartCombo();
    };

    const handleRestartComboKey = (key: string): void => {
        if (!isRoundFrozen || restartSequenceLocked) return;
        if (key !== 'q' && key !== 'e') return;

        const expectedKey = RESTART_COMBO[restartComboIndex];
        if (key === expectedKey) {
            restartComboIndex += 1;
            applyDarkenProgress();

            if (restartComboIndex >= RESTART_COMBO.length) {
                restartSequenceLocked = true;

                // After full combo, restore brightness first, then restart.
                if (darkenOverlay) {
                    darkenOverlay.style.opacity = '0';
                }

                window.setTimeout(() => {
                    restartRound();
                }, RESTART_AFTER_COMBO_DELAY_MS);
            }
            return;
        }

        restartComboIndex = key === RESTART_COMBO[0] ? 1 : 0;
        applyDarkenProgress();
    };

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        handleRestartComboKey(e.key.toLowerCase());
    });

    createGames(currentLayoutSeed);
    resetRoundUI();
    resetRestartCombo();

    if (difficultySlider && difficultyValue) {
        difficultySlider.addEventListener('input', () => {
            difficultyValue.textContent = difficultySlider.value;
            if (aiGame) aiGame.setAIDifficulty(getDifficulty());
        });
    }

    if (scoreGapSlider && scoreGapValue) {
        scoreGapSlider.addEventListener('input', () => {
            scoreGapValue.textContent = scoreGapSlider.value;
        });
    }

    if (particleSlider) {
        particleSlider.addEventListener('input', updateParticleLabel);
    }
    if (rotationScaleSlider) {
        rotationScaleSlider.addEventListener('input', updateRotationLabel);
    }
    if (gravityScaleSlider) {
        gravityScaleSlider.addEventListener('input', updateGravityLabel);
    }
    if (bounceScaleSlider) {
        bounceScaleSlider.addEventListener('input', updateBounceLabel);
    }

    updateParticleLabel();
    updateRotationLabel();
    updateGravityLabel();
    updateBounceLabel();

    if (startBtn && startScreen) {
        startBtn.addEventListener('click', () => {
            createGames(currentLayoutSeed);
            resetRoundUI();
            startScreen.style.display = 'none';
            isPlaying = true;
            isRoundFrozen = false;
            scoreGapWinThreshold = getScoreGapThreshold();
            aiGame.setAIDifficulty(getDifficulty());
        });
    }

    const animate = () => {
        requestAnimationFrame(animate);

        if (isPlaying && !isRoundFrozen) {
            humanGame.update();
            aiGame.update();

            if (humanGame.isOver() || aiGame.isOver()) {
                if (humanGame.isOver() && !aiGame.isOver()) {
                    if (humanScoreBox && aiScoreBox) {
                        humanScoreBox.classList.remove('human-lead', 'losing');
                        aiScoreBox.classList.remove('ai-lead', 'losing');
                        humanScoreBox.classList.add('trap-hit');
                    }
                    freezeRound('HUMAN DOWN', 'AI SURVIVED', 'lose', 'win');
                } else if (!humanGame.isOver() && aiGame.isOver()) {
                    if (humanScoreBox && aiScoreBox) {
                        humanScoreBox.classList.remove('human-lead', 'losing');
                        aiScoreBox.classList.remove('ai-lead', 'losing');
                        aiScoreBox.classList.add('trap-hit');
                    }
                    freezeRound('HUMAN SURVIVED', 'AI DOWN', 'win', 'lose');
                } else {
                    if (humanScoreBox && aiScoreBox) {
                        humanScoreBox.classList.remove('human-lead', 'losing');
                        aiScoreBox.classList.remove('ai-lead', 'losing');
                        humanScoreBox.classList.add('trap-hit');
                        aiScoreBox.classList.add('trap-hit');
                    }
                    freezeRound('ROUND END', 'ROUND END');
                }
            } else {
                const humanScore = humanGame.getScore();
                const aiScore = aiGame.getScore();
                const diff = humanScore - aiScore;

                const maxDiff = scoreGapWinThreshold;
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
                    humanScoreBox.classList.remove('human-lead', 'losing', 'trap-hit');
                    aiScoreBox.classList.remove('ai-lead', 'losing', 'trap-hit');

                    if (diff > 0) {
                        humanScoreBox.classList.add('human-lead');
                        aiScoreBox.classList.add('losing');
                    } else if (diff < 0) {
                        aiScoreBox.classList.add('ai-lead');
                        humanScoreBox.classList.add('losing');
                    }
                }

                if (Math.abs(diff) >= scoreGapWinThreshold) {
                    if (diff > 0) {
                        freezeRound(`PERFECT WIN!`, `DEFEAT (Score Gap > ${scoreGapWinThreshold})`, 'win', 'lose');
                    } else {
                        freezeRound(`DEFEAT (Score Gap > ${scoreGapWinThreshold})`, 'AI WINS!', 'lose', 'win');
                    }
                }
            }
        }

        if (isPlaying) {
            const humanBallY = humanGame.getBallY();
            const aiBallY = aiGame.getBallY();
            const delta = humanBallY - aiBallY;

            // Stabilize visibility near thresholds to prevent flicker.
            // Use symmetric range so the marker stays visible even when player is behind.
            const absDelta = Math.abs(delta);
            const enterRange = absDelta <= 8;
            const keepRange = absDelta <= 8.6;
            if (opponentBandVisibleLatch) {
                opponentBandVisibleLatch = keepRange;
            } else {
                opponentBandVisibleLatch = enterRange;
            }

            humanGame.setOpponentLayerBandY(opponentBandVisibleLatch ? aiBallY : null);
        } else {
            opponentBandVisibleLatch = false;
            humanGame.setOpponentLayerBandY(null);
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
