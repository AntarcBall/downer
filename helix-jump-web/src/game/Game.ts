import * as THREE from 'three';
import { Ball } from './Ball';
import { Tower } from './Tower';
import { CollisionSystem } from './CollisionSystem';
import { PlatformGenerator } from './PlatformGenerator';
import { AIController } from './AIController';

export interface GameOptions {
    isAI?: boolean;
    scoreElementId?: string;
    gameOverElementId?: string;
}

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private ball: Ball;
    private tower: Tower;
    private collisionSystem: CollisionSystem;
    private platformGenerator: PlatformGenerator;
    private aiController: AIController | null = null;

    private isQPressed: boolean = false;
    private isEPressed: boolean = false;
    private rotationSpeed: number = 0.08;

    private score: number = 0;
    private isGameOver: boolean = false;
    private passedPlatformYs: Set<number> = new Set();

    private isAI: boolean;
    private scoreElementId: string;
    private gameOverElementId: string;

    constructor(canvas: HTMLCanvasElement, options: GameOptions = {}) {
        this.isAI = options.isAI || false;
        this.scoreElementId = options.scoreElementId || 'score-value';
        this.gameOverElementId = options.gameOverElementId || 'game-over-ui';

        // Scene 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f2f5);
        this.scene.fog = new THREE.Fog(0xf0f2f5, 15, 40);

        // 캔버스 크기는 CSS로 제어
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 400;
        const height = rect.height || 240;

        // Camera 설정
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 12);
        this.camera.lookAt(0, -3, 0);

        // Renderer 설정
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        // 조명
        this.setupLights();

        // 게임 객체 생성
        this.ball = new Ball(this.scene);
        this.tower = new Tower(this.scene);
        this.collisionSystem = new CollisionSystem();
        this.platformGenerator = new PlatformGenerator(this.scene, this.tower.group);

        // AI 모드인 경우 AI 컨트롤러 생성
        if (this.isAI) {
            this.aiController = new AIController(this.rotationSpeed);
        }

        // 초기 플랫폼 생성
        this.platformGenerator.generatePlatforms(this.ball.y, this.score);

        // 입력 이벤트 설정 (AI가 아닌 경우에만)
        if (!this.isAI) {
            this.setupInputEvents();
        }

        // 점수 초기화
        this.updateScoreDisplay();
    }

    private setupLights(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xebf4ff, 0.5);
        fillLight.position.set(-5, 5, 2);
        this.scene.add(fillLight);
    }

    private setupInputEvents(): void {
        window.addEventListener('keydown', (e) => {
            if (this.isGameOver) return;

            if (e.key.toLowerCase() === 'q') {
                this.isQPressed = true;
            } else if (e.key.toLowerCase() === 'e') {
                this.isEPressed = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'q') {
                this.isQPressed = false;
            } else if (e.key.toLowerCase() === 'e') {
                this.isEPressed = false;
            }
        });
    }

    private updateScoreDisplay(): void {
        const scoreElement = document.getElementById(this.scoreElementId);
        if (scoreElement) {
            scoreElement.textContent = String(this.score);
        }
    }

    update(): void {
        if (this.isGameOver) return;

        // 플랫폼 목록 가져오기
        const platforms = this.platformGenerator.getPlatforms();

        // 타워 회전
        if (this.isAI && this.aiController) {
            // AI 제어
            this.aiController.update(this.ball, this.tower, platforms);
        } else {
            // 키보드 입력
            if (this.isQPressed) {
                this.tower.rotate(this.rotationSpeed);
            }
            if (this.isEPressed) {
                this.tower.rotate(-this.rotationSpeed);
            }
        }

        // 공 업데이트
        this.ball.update();

        // 플랫폼 생성 및 정리
        this.platformGenerator.generatePlatforms(this.ball.y, this.score);
        this.platformGenerator.cleanupPlatforms(this.ball.y);
        this.platformGenerator.updatePlatforms();

        // 기둥 위치 업데이트
        this.tower.updatePillarPosition(this.ball.y);

        // 카메라 따라가기
        this.updateCamera();

        // 충돌 검사
        const collision = this.collisionSystem.checkCollisionWithPlatforms(
            this.ball,
            this.tower,
            platforms
        );

        switch (collision.type) {
            case 'bounce':
                this.ball.bounce();
                if (collision.platform) {
                    const platformY = collision.platform.y;
                    if (!this.passedPlatformYs.has(platformY)) {
                        this.passedPlatformYs.add(platformY);
                        this.score += 5;
                        this.updateScoreDisplay();
                    }
                }
                break;

            case 'trap':
                this.ball.die();
                this.isGameOver = true;
                this.showGameOver();
                break;

            case 'pass':
                break;
        }
    }

    private updateCamera(): void {
        const targetY = this.ball.y + 3;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;
        this.camera.lookAt(0, this.ball.y - 2, 0);
    }

    private showGameOver(): void {
        const gameOverUI = document.getElementById(this.gameOverElementId);
        if (gameOverUI) {
            const finalScoreEl = gameOverUI.querySelector('#final-score, .final-score');
            if (finalScoreEl) {
                finalScoreEl.textContent = `점수: ${this.score}`;
            }
            gameOverUI.style.display = 'block';
        }
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    getScore(): number {
        return this.score;
    }

    forceGameOver(message: string): void {
        this.isGameOver = true;

        const gameOverUI = document.getElementById(this.gameOverElementId);
        if (gameOverUI) {
            const titleEl = gameOverUI.querySelector('h2');
            const finalScoreEl = gameOverUI.querySelector('#final-score, .final-score');

            if (titleEl) titleEl.textContent = message;
            if (finalScoreEl) finalScoreEl.textContent = `최종 점수: ${this.score}`;

            gameOverUI.style.display = 'block';
        }
    }

    isOver(): boolean {
        return this.isGameOver;
    }
}
