import * as THREE from 'three';
import { Ball } from './Ball';
import { Tower } from './Tower';
import { CollisionSystem } from './CollisionSystem';
import { PlatformGenerator } from './PlatformGenerator';
import { AIController } from './AIController';
import { GAME_CONFIG } from '../config/gameConfig';

export interface GameOptions {
    isAI?: boolean;
    scoreElementId?: string;
    gameOverElementId?: string;
    layoutSeed?: number;
    showOpponentLayerBand?: boolean;
    rotationSpeed?: number;
    gravity?: number;
    bounceVelocity?: number;
}

export class Game {
    private readonly canvas: HTMLCanvasElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private ball: Ball;
    private tower: Tower;
    private collisionSystem: CollisionSystem;
    private platformGenerator: PlatformGenerator;
    private aiController: AIController | null = null;
    private opponentLayerBand: THREE.Mesh | null = null;

    private isQPressed: boolean = false;
    private isEPressed: boolean = false;
    private inputEventsAttached: boolean = false;
    private rotationSpeed: number;

    private score: number = 0;
    private isGameOver: boolean = false;
    private passedPlatformYs: Set<number> = new Set();
    private passStreakCount: number = 0;
    private passStreakPlatformYs: Set<number> = new Set();
    private lastBurstAtMs: number = 0;

    private isAI: boolean;
    private scoreElementId: string;
    private gameOverElementId: string;
    private readonly showOpponentLayerBand: boolean;
    private readonly onKeyDown = (e: KeyboardEvent): void => {
        if (this.isGameOver) return;

        if (e.key.toLowerCase() === 'q') {
            this.isQPressed = true;
        } else if (e.key.toLowerCase() === 'e') {
            this.isEPressed = true;
        }
    };
    private readonly onKeyUp = (e: KeyboardEvent): void => {
        if (e.key.toLowerCase() === 'q') {
            this.isQPressed = false;
        } else if (e.key.toLowerCase() === 'e') {
            this.isEPressed = false;
        }
    };

    constructor(canvas: HTMLCanvasElement, options: GameOptions = {}) {
        this.canvas = canvas;
        this.isAI = options.isAI || false;
        this.scoreElementId = options.scoreElementId || 'score-value';
        this.gameOverElementId = options.gameOverElementId || 'game-over-ui';
        this.showOpponentLayerBand = options.showOpponentLayerBand || false;
        this.rotationSpeed = options.rotationSpeed ?? GAME_CONFIG.controls.rotationSpeed;

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
        this.ball = new Ball(this.scene, {
            color: this.isAI ? 0x111111 : 0x1e66ff,
            emissive: this.isAI ? 0x000000 : 0x061126,
            gravity: options.gravity,
            bounceVelocity: options.bounceVelocity,
        });
        this.tower = new Tower(this.scene);
        this.collisionSystem = new CollisionSystem();
        this.platformGenerator = new PlatformGenerator(this.scene, this.tower.group, options.layoutSeed);

        if (this.showOpponentLayerBand) {
            this.createOpponentLayerBand();
        }

        // AI 모드인 경우 AI 컨트롤러 생성
        if (this.isAI) {
            this.aiController = new AIController(this.rotationSpeed);
        }

        // 초기 플랫폼 생성
        this.platformGenerator.generatePlatforms(this.ball.y);

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
        if (this.inputEventsAttached) return;

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.inputEventsAttached = true;
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
        this.platformGenerator.generatePlatforms(this.ball.y);
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
                this.passStreakCount = 0;
                this.passStreakPlatformYs.clear();
                this.ball.bounce();
                if (collision.platform) {
                    const platformY = collision.platform.y;
                    if (!this.passedPlatformYs.has(platformY)) {
                        this.passedPlatformYs.add(platformY);
                        this.score += 1;
                        this.updateScoreDisplay();
                    }
                }
                break;

            case 'trap':
                this.passStreakCount = 0;
                this.passStreakPlatformYs.clear();
                if (this.isAI && this.score < 10) {
                    this.ball.bounce();
                    if (collision.platform) {
                        const platformY = collision.platform.y;
                        if (!this.passedPlatformYs.has(platformY)) {
                            this.passedPlatformYs.add(platformY);
                            this.score += 1;
                            this.updateScoreDisplay();
                        }
                    }
                    break;
                }
                this.ball.die();
                this.isGameOver = true;
                this.showGameOver();
                break;

            case 'pass':
                if (collision.platform) {
                    const passPlatformY = collision.platform.y;
                    if (!this.passStreakPlatformYs.has(passPlatformY)) {
                        this.passStreakPlatformYs.add(passPlatformY);
                        this.passStreakCount += 1;

                        if (this.passStreakCount >= 3) {
                            this.emitPassBurstEffect(this.passStreakCount);
                        }
                    }
                }
                break;
        }

        // 배경색 부드러운 전환
        this.updateBackgroundColor();
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
                finalScoreEl.textContent = `Score: ${this.score}`;
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
            if (finalScoreEl) finalScoreEl.textContent = `Final Score: ${this.score}`;

            gameOverUI.style.display = 'block';
        }
    }

    isOver(): boolean {
        return this.isGameOver;
    }

    private currentBgColor: THREE.Color = new THREE.Color(0xf0f2f5);
    private targetBgColor: THREE.Color = new THREE.Color(0xf0f2f5);

    setTargetBackgroundColor(r: number, g: number, b: number): void {
        this.targetBgColor.setRGB(r, g, b);
    }

    private updateBackgroundColor(): void {
        const lerpFactor = 0.05; // 부드러운 전환 속도
        this.currentBgColor.lerp(this.targetBgColor, lerpFactor);

        this.scene.background = this.currentBgColor;
        if (this.scene.fog) {
            this.scene.fog.color.copy(this.currentBgColor);
        }
    }

    setAIDifficulty(value: number): void {
        if (this.aiController) {
            this.aiController.setDifficulty(value);
        }
    }

    getBallY(): number {
        return this.ball.y;
    }

    setOpponentLayerBandY(y: number | null): void {
        if (!this.opponentLayerBand) return;

        if (y === null) {
            this.opponentLayerBand.visible = false;
            return;
        }

        this.opponentLayerBand.visible = true;
        this.opponentLayerBand.position.y = y + 0.01;
    }

    private createOpponentLayerBand(): void {
        const platformOuterRadius = 2.5;
        const k = 0.18;
        const innerRadius = platformOuterRadius + k;
        const outerRadius = platformOuterRadius + 2 * k;

        const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.82,
            side: THREE.DoubleSide,
        });

        this.opponentLayerBand = new THREE.Mesh(geometry, material);
        this.opponentLayerBand.visible = false;
        this.tower.group.add(this.opponentLayerBand);
    }

    private emitPassBurstEffect(streak: number): void {
        const now = Date.now();
        if (now - this.lastBurstAtMs < 30) return;
        this.lastBurstAtMs = now;

        const rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const projected = this.ball.mesh.position.clone().project(this.camera);
        const centerX = rect.left + (projected.x + 1) * 0.5 * rect.width;
        const centerY = rect.top + (1 - (projected.y + 1) * 0.5) * rect.height;

        const particleCount = Math.min(108, 42 + streak * 12);
        const saturation = 88;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const size = 4 + Math.random() * 11;
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 180;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            const duration = (420 + Math.random() * 420) * 1.25;
            const hue = Math.floor(Math.random() * 360);
            const lightness = 56 + Math.random() * 16;
            const particleColor = `hsl(${hue} ${saturation}% ${lightness}%)`;

            particle.style.position = 'fixed';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1200';
            particle.style.background = particleColor;
            particle.style.boxShadow = `0 0 20px hsl(${hue} ${saturation}% 72% / 0.9)`;
            particle.style.transform = 'translate(-50%, -50%) scale(1)';
            particle.style.opacity = '1';

            document.body.appendChild(particle);

            const animation = particle.animate(
                [
                    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                    { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) scale(0.55)`, opacity: 0.75 },
                    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.12)`, opacity: 0 }
                ],
                {
                    duration,
                    easing: 'cubic-bezier(0.15, 0.75, 0.2, 1)',
                    fill: 'forwards'
                }
            );
            animation.onfinish = () => particle.remove();
        }

        const ring = document.createElement('div');
        ring.style.position = 'fixed';
        ring.style.left = `${centerX}px`;
        ring.style.top = `${centerY}px`;
        ring.style.width = '18px';
        ring.style.height = '18px';
        const ringHue = Math.floor(Math.random() * 360);
        ring.style.border = `3px solid hsl(${ringHue} ${saturation}% 72% / 0.95)`;
        ring.style.borderRadius = '999px';
        ring.style.pointerEvents = 'none';
        ring.style.zIndex = '1199';
        ring.style.transform = 'translate(-50%, -50%) scale(1)';
        ring.style.opacity = '0.95';
        document.body.appendChild(ring);

        const ringAnim = ring.animate(
            [
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95 },
                { transform: 'translate(-50%, -50%) scale(14)', opacity: 0 }
            ],
            { duration: 620, easing: 'ease-out', fill: 'forwards' }
        );
        ringAnim.onfinish = () => ring.remove();

        const ring2 = document.createElement('div');
        ring2.style.position = 'fixed';
        ring2.style.left = `${centerX}px`;
        ring2.style.top = `${centerY}px`;
        ring2.style.width = '12px';
        ring2.style.height = '12px';
        const ringHue2 = Math.floor(Math.random() * 360);
        ring2.style.border = `2px solid hsl(${ringHue2} ${saturation}% 75% / 0.85)`;
        ring2.style.borderRadius = '999px';
        ring2.style.pointerEvents = 'none';
        ring2.style.zIndex = '1198';
        ring2.style.transform = 'translate(-50%, -50%) scale(1)';
        ring2.style.opacity = '0';
        document.body.appendChild(ring2);

        const ring2Anim = ring2.animate(
            [
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
                { transform: 'translate(-50%, -50%) scale(1.6)', opacity: 0.9, offset: 0.2 },
                { transform: 'translate(-50%, -50%) scale(18)', opacity: 0 }
            ],
            { duration: 760, easing: 'ease-out', fill: 'forwards' }
        );
        ring2Anim.onfinish = () => ring2.remove();
    }

    dispose(): void {
        if (this.inputEventsAttached) {
            window.removeEventListener('keydown', this.onKeyDown);
            window.removeEventListener('keyup', this.onKeyUp);
            this.inputEventsAttached = false;
        }
        if (this.opponentLayerBand) {
            this.tower.group.remove(this.opponentLayerBand);
            this.opponentLayerBand.geometry.dispose();
            if (this.opponentLayerBand.material instanceof THREE.Material) {
                this.opponentLayerBand.material.dispose();
            }
            this.opponentLayerBand = null;
        }
        this.renderer.dispose();
    }
}
