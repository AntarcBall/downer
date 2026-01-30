import * as THREE from 'three';
import { Ball } from './Ball';
import { Tower } from './Tower';
import { CollisionSystem } from './CollisionSystem';
import { ScoreUI } from '../ui/ScoreUI';
import levelsData from '../data/levels.json';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private ball: Ball;
    private tower: Tower;
    private collisionSystem: CollisionSystem;
    private scoreUI: ScoreUI;

    private isDragging: boolean = false;
    private previousMouseX: number = 0;
    private rotationSensitivity: number = 0.01;

    private score: number = 0;
    private isGameOver: boolean = false;
    private isWin: boolean = false;
    private passedPlatforms: Set<number> = new Set();

    constructor(canvas: HTMLCanvasElement) {
        // Scene 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f2f5); // 밝은 배경
        this.scene.fog = new THREE.Fog(0xf0f2f5, 10, 25); // 안개 효과 추가

        // 캔버스 크기 (5:3 비율)
        const container = canvas.parentElement!;
        const maxWidth = Math.min(window.innerWidth * 0.95, 1000);
        const width = maxWidth;
        const height = width * (3 / 5);

        container.style.width = `${width}px`;
        container.style.height = `${height}px`;

        // Camera 설정
        this.camera = new THREE.PerspectiveCamera(60, 5 / 3, 0.1, 1000);
        this.camera.position.set(0, 4.5, 5.5); // 카메라 각도 조정 (더 수직으로)
        this.camera.lookAt(0, -1.5, 0);

        // Renderer 설정
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // 톤 매핑 추가

        // 조명
        this.setupLights();

        // 게임 객체 생성
        this.ball = new Ball(this.scene);
        this.tower = new Tower(this.scene);
        this.collisionSystem = new CollisionSystem();
        this.scoreUI = new ScoreUI();

        // 레벨 로드
        this.loadLevel(0);

        // 입력 이벤트 설정
        this.setupInputEvents(canvas);

        // 리사이즈 핸들러
        window.addEventListener('resize', () => this.onResize());
    }

    private setupLights(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (main)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xebf4ff, 0.5);
        fillLight.position.set(-5, 5, 2);
        this.scene.add(fillLight);
    }

    private loadLevel(levelIndex: number): void {
        const level = levelsData.levels[levelIndex];
        if (!level) return;

        this.tower.loadLevel(level.platforms, level.finishY, this.scene);
        this.passedPlatforms.clear();
    }

    private setupInputEvents(canvas: HTMLCanvasElement): void {
        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMouseX = e.clientX;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || this.isGameOver || this.isWin) return;

            const deltaX = e.clientX - this.previousMouseX;
            this.tower.rotate(deltaX * this.rotationSensitivity);
            this.previousMouseX = e.clientX;
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.previousMouseX = e.touches[0].clientX;
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging || this.isGameOver || this.isWin) return;

            const deltaX = e.touches[0].clientX - this.previousMouseX;
            this.tower.rotate(deltaX * this.rotationSensitivity);
            this.previousMouseX = e.touches[0].clientX;
        });

        canvas.addEventListener('touchend', () => {
            this.isDragging = false;
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
        if (this.isGameOver || this.isWin) return;

        // 공 업데이트
        this.ball.update();

        // 타워 업데이트 (움직이는 플랫폼)
        this.tower.update();

        // 카메라 따라가기
        this.updateCamera();

        // 충돌 검사
        const collision = this.collisionSystem.checkCollision(this.ball, this.tower);

        switch (collision.type) {
            case 'bounce':
                this.ball.bounce();
                // 점수 추가 (플랫폼 통과)
                if (collision.platform) {
                    const platformIndex = this.tower.platforms.indexOf(collision.platform);
                    if (!this.passedPlatforms.has(platformIndex)) {
                        this.passedPlatforms.add(platformIndex);
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

            case 'finish':
                this.isWin = true;
                this.score += 50;
                this.scoreUI.setScore(this.score);
                this.showWin();
                break;
        }
    }

    private updateCamera(): void {
        // 카메라가 공을 부드럽게 따라감
        const targetY = this.ball.y + 3;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.05;
        this.camera.lookAt(0, this.ball.y - 2, 0);
    }

    private showGameOver(): void {
        const gameOverUI = document.getElementById('game-over-ui');
        if (gameOverUI) {
            gameOverUI.style.display = 'block';
        }
    }

    private showWin(): void {
        const winUI = document.getElementById('win-ui');
        if (winUI) {
            winUI.style.display = 'block';
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
