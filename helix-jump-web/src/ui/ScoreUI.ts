export class ScoreUI {
    private scoreElement: HTMLElement | null;

    constructor() {
        this.scoreElement = document.getElementById('score-value');
    }

    setScore(score: number): void {
        if (this.scoreElement) {
            this.scoreElement.textContent = score.toString();

            // 점수 변경 애니메이션
            this.scoreElement.style.transform = 'scale(1.2)';
            setTimeout(() => {
                if (this.scoreElement) {
                    this.scoreElement.style.transform = 'scale(1)';
                }
            }, 100);
        }
    }

    reset(): void {
        this.setScore(0);
    }
}
