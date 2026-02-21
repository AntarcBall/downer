export interface PlatformDifficultyBand {
    maxProgressExclusive: number;
    trapChance: number;
    movingChance: number;
    minGapSize: number;
    maxGapSize: number;
}

export const GAME_CONFIG = {
    physics: {
        gravity: -0.0025,
        bounceVelocity: 0.09,
        ballRadius: 0.5,
        ballZ: 1.5,
    },
    controls: {
        rotationSpeed: 0.04,
    },
    platforms: {
        initialGapCenter: 45,
        initialY: -2,
        defaultLayoutSeed: 1337,
        spacing: {
            min: 2.2,
            max: 3.2,
        },
        generationBufferDistance: 15,
        cleanupDistance: 10,
        gapCenterOffsetRange: {
            min: -120,
            max: 120,
        },
        trapGapCenterOffsetMax: 45,
        moving: {
            speed: 0.02,
            maxSwingRadians: Math.PI / 2,
            indicatorSpokes: {
                count: 4,
                radialInset: 0.18,
                width: 0.08,
                thickness: 0.012,
                lift: 0.01,
                edgePaddingRadians: 0.18,
                color: 0x111111,
            },
        },
        difficultyBands: [
            { maxProgressExclusive: 100, trapChance: 0.10, movingChance: 0.15, minGapSize: 90, maxGapSize: 100 },
            { maxProgressExclusive: 300, trapChance: 0.15, movingChance: 0.20, minGapSize: 80, maxGapSize: 100 },
            { maxProgressExclusive: 500, trapChance: 0.20, movingChance: 0.25, minGapSize: 70, maxGapSize: 95 },
            { maxProgressExclusive: Number.POSITIVE_INFINITY, trapChance: 0.25, movingChance: 0.30, minGapSize: 60, maxGapSize: 90 },
        ] satisfies PlatformDifficultyBand[],
    },
    collision: {
        threshold: 0.4,
        platformHalfHeight: 0.075,
        ballWorldAngleDeg: 270,
    },
    ai: {
        maxThinkingTimeMs: 1000,
        deadZoneDeg: 5,
    },
} as const;
