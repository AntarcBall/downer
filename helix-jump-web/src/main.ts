import { Game } from './game/Game';

// DOM 로드 후 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const game = new Game(canvas);
    game.start();
});
