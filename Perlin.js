// PerlinNoiseGenerator creates pseudo-random noise patterns.
class PerlinNoiseGenerator {
    constructor() {
        // Permutation table to randomize noise distribution
        this.permutationTable = new Uint8Array(512);
        
        // Gradient vectors for noise calculation
        this.gradientVectors = [
            // 12 vectors for distributing the noise
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        
        // Starts with a random seed
        this.setSeed(Math.random());
    }

    // Sets a seed to use in generating noise
    setSeed(seed) {
        // Initial sequential permutation array
        const initialPermutation = new Uint8Array(256);
        for (let i = 0; i < 256; i++) initialPermutation[i] = i;
        
        // Shuffle array based on the seed
        for (let i = 255; i > 0; i--) {
            const randomIndex = Math.floor(seed * (i + 1));
            [initialPermutation[i], initialPermutation[randomIndex]] = 
            [initialPermutation[randomIndex], initialPermutation[i]];
        }
        
        // Duplicate permutation to avoid array bounds checking
        for (let i = 0; i < 512; i++) {
            this.permutationTable[i] = initialPermutation[i & 255];
        }
    }

    // Smoothing to reduce sharp transitions in noise
    smooth(value) {
        // Cubic interpolation with smooth falloff
        return value * value * value * (value * (value * 6 - 15) + 10);
    }

    // Linear interpolation between two values
    interpolate(start, end, interpolationFactor) {
        return start + interpolationFactor * (end - start);
    }

    // Dot product of gradient vector and coordinates
    dotProduct(hash, x, y, z) {
        // Select gradient vector and compute dot product
        const selectedVector = this.gradientVectors[hash % 12];
        return selectedVector[0] * x + 
               selectedVector[1] * y + 
               selectedVector[2] * z;
    }

    // Generate Perlin noise
    noise(x, y = 0, z = 0) {
        // Find unit cube coordinates
        const unitCubeX = Math.floor(x) & 255;
        const unitCubeY = Math.floor(y) & 255;
        const unitCubeZ = Math.floor(z) & 255;

        // Calculate fractional part of coordinates
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        // Apply smoothing
        const smoothX = this.smooth(x);
        const smoothY = this.smooth(y);
        const smoothZ = this.smooth(z);

        // Hash coordinates to find noise values at cube corners
        const A = this.permutationTable[unitCubeX] + unitCubeY;
        const AA = this.permutationTable[A] + unitCubeZ;
        const AB = this.permutationTable[A + 1] + unitCubeZ;
        const B = this.permutationTable[unitCubeX + 1] + unitCubeY;
        const BA = this.permutationTable[B] + unitCubeZ;
        const BB = this.permutationTable[B + 1] + unitCubeZ;

        // Interpolate noise values
        return this.interpolate(
            this.interpolate(
                this.interpolate(
                    this.dotProduct(this.permutationTable[AA], x, y, z),
                    this.dotProduct(this.permutationTable[BA], x - 1, y, z),
                    smoothX
                ),
                this.interpolate(
                    this.dotProduct(this.permutationTable[AB], x, y - 1, z),
                    this.dotProduct(this.permutationTable[BB], x - 1, y - 1, z),
                    smoothX
                ),
                smoothY
            ),
            this.interpolate(
                this.interpolate(
                    this.dotProduct(this.permutationTable[AA + 1], x, y, z - 1),
                    this.dotProduct(this.permutationTable[BA + 1], x - 1, y, z - 1),
                    smoothX
                ),
                this.interpolate(
                    this.dotProduct(this.permutationTable[AB + 1], x, y - 1, z - 1),
                    this.dotProduct(this.permutationTable[BB + 1], x - 1, y - 1, z - 1),
                    smoothX
                ),
                smoothY
            ),
            smoothZ
        );
    }
}

export default PerlinNoiseGenerator;