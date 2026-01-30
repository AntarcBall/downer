import * as THREE from 'three';
import { Ball } from './Ball';
import { Tower } from './Tower';
import { CollisionSystem } from './CollisionSystem';
import { PlatformGenerator } from './PlatformGenerator';
import { ScoreUI } from '../ui/ScoreUI';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private ball: Ball;
    private tower: Tower;
    private collisionSystem: CollisionSystem;
    private platformGenerator: PlatformGenerator;
    private scoreUI: ScoreUI;

    private isQPressed: boolean = false;
    private isEPressed: boolean = false;
    private rotationSpeed: number = 0.08;

    private score: number = 0;
    private isGameOver: boolean = false;
    private passedPlatformYs: Set<number> = new Set(); // Y 좌표로 추적

    constructor(canvas: HTMLCanvasElement) {
        // Scene 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f2f5);
        this.scene.fog = new THREE.Fog(0xf0f2f5, 15, 40); // 안개 거리 늘림

        // 캔버스 크기 (5:3 비율)
        const container = canvas.parentElement!;
        const maxWidth = Math.min(window.innerWidth * 0.95, 1000);
        const width = maxWidth;
        const height = width * (3 / 5);

        container.style.width = `${width}px`;
        container.style.height = `${height}px`;

        // Camera 설정 - 정면에서 보기
        this.camera = new THREE.PerspectiveCamera(60, 5 / 3, 0.1, 1000);
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
        this.scoreUI = new ScoreUI();

        // 초기 플랫폼 생성
        this.platformGenerator.generatePlatforms(this.ball.y, this.score);

        // 입력 이벤트 설정
        this.setupInputEvents();

        // 리사이즈 핸들러
        window.addEventListener('resize', () => this.onResize());
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

    private onResize(): void {
        const container = this.renderer.domElement.parentElement!;
        const maxWidth = Math.min(window.innerWidth * 0.95, 1000);
        const width = maxWidth;
        const height = width * (3 / 5);

        container.style.width = `${width}px`;
        container.style.height = `${height}px`;

        this.renderer.setSize(width, height);
        this.camera.aspect = 5 / 3;
        this.camera.updateProjectionMatrix();
    }

    update(): void {
        if (this.isGameOver) return;

        // 타워 회전 (키보드 입력)
        if (this.isQPressed) {
            this.tower.rotate(this.rotationSpeed);
        }
        if (this.isEPressed) {
            this.tower.rotate(-this.rotationSpeed);
        }

        // 공 업데이트
        this.ball.update();

        // 플랫폼 생성 및 정리 (무한 생성)
        this.platformGenerator.generatePlatforms(this.ball.y, this.score);
        this.platformGenerator.cleanupPlatforms(this.ball.y);
        this.platformGenerator.updatePlatforms();

        // 기둥 위치 업데이트
        this.tower.updatePillarPosition(this.ball.y);

        // 카메라 따라가기
        this.updateCamera();

        // 충돌 검사 (플랫폼 목록을 전달)
        const platforms = this.platformGenerator.getPlatforms();
        const collision = this.collisionSystem.checkCollisionWithPlatforms(
            this.ball,
            this.tower,
            platforms
        );

        switch (collision.type) {
            case 'bounce':
                this.ball.bounce();
                // 점수 추가 (플랫폼 통과)
                if (collision.platform) {
                    const platformY = collision.platform.y;
                    if (!this.passedPlatformYs.has(platformY)) {
                        this.passedPlatformYs.add(platformY);
                        this.score += 5;
                        this.scoreUI.setScore(this.score);
                    }
                }
                break;

            case 'trap':
                this.ball.die();
                this.isGameOver = true;
                this.showGameOver();
                break;

            case 'pass':
                // 구멍 통과 - 아무것도 안 함
                break;
        }
    }

    private updateCamera(): void {
        const targetY = this.ball.y + 3;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;
        this.camera.lookAt(0, this.ball.y - 2, 0);
    }

    private showGameOver(): void {
        const gameOverUI = document.getElementById('game-over-ui');
        const finalScore = document.getElementById('final-score');
        if (gameOverUI) {
            gameOverUI.style.display = 'block';
        }
        if (finalScore) {
            finalScore.textContent = `점수: ${this.score}`;
        }
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    start(): void {
        const animate = () => {
            requestAnimationFrame(animate);
            this.update();
            this.render();
        };
        animate();
    }
}
