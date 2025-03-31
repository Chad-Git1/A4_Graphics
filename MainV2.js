import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import PerlinNoise from './Perlin.js';
import { GUI } from 'dat.gui';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Load shaders
async function loadShaders() {
    const vertexResponse = await fetch('shaders/shader.vert');
    const fragmentResponse = await fetch('shaders/shader.frag');
    return {
        vertexShader: await vertexResponse.text(),
        fragmentShader: await fragmentResponse.text()
    };
}

// Initi scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Clock for timing animations
const clock = new THREE.Clock();

// Perlin noise
const perlin = new PerlinNoise();

// Parameters for animation and effects
const params = {
    noiseIntensity: 0,
    animationSpeed: 0.5,
    alienAbductionAmplitude: 4.0,
    alienAbductionSpeed: 1.0,
    // Lighting parameters
    ambientIntensity: 0.4,
    directionalIntensity: 3.0,
    ufoGlowIntensity: 0.0,
    useVertexColors: true,
    enableCustomShaders: false
};

let currentAbductionSpeed = params.alienAbductionSpeed;
let phaseOffset = 0;

// Keyboard movement state
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
};

// GUI setup
const gui = new GUI();
const movementFolder = gui.addFolder('Movement');
movementFolder.add(params, 'noiseIntensity', 0, 2, 0.05).name('Perlin Noise');
movementFolder.add(params, 'animationSpeed', 0, 1, 0.001).name('Movement Speed');
movementFolder.add(params, 'alienAbductionAmplitude', 0, 4.0, 0.1).name('Abduction Ampl.');
movementFolder.add(params, 'alienAbductionSpeed', 0, 3, 0.01)
  .name('Abduction Speed')
  .onFinishChange((newSpeed) => {
      const currentTime = clock.getElapsedTime();
      const currentPhase = currentTime * currentAbductionSpeed + phaseOffset;
      phaseOffset = currentPhase - currentTime * newSpeed;
      currentAbductionSpeed = newSpeed;
  });
movementFolder.open();

const lightingFolder = gui.addFolder('Lighting');
lightingFolder.add(params, 'ambientIntensity', 0, 1, 0.05).name('Ambient Light').onChange(updateLighting);
lightingFolder.add(params, 'directionalIntensity', 0, 5, 0.05).name('Sun Light').onChange(updateLighting);
lightingFolder.add(params, 'ufoGlowIntensity', 0, 1, 0.025).name('Glow').onChange(updateMaterials);
lightingFolder.add(params, 'useVertexColors').name('Use Vertex Colors').onChange(updateMaterials);
lightingFolder.add(params, 'enableCustomShaders').name('Custom Shaders').onChange(updateMaterials,updateLighting);
lightingFolder.open();

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, params.ambientIntensity);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, params.directionalIntensity);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);

// Helper function to update lighting
function updateLighting() {
    // Update Three.js lights
    ambientLight.intensity = params.ambientIntensity;
    directionalLight.intensity = params.directionalIntensity;
    
    // Update all custom materials with new lighting values
    customMaterials.forEach(material => {
        if (material.uniforms) {
            // Update ambient light uniform
            if (material.uniforms.ambientLight) {
                material.uniforms.ambientLight.value.copy(
                    new THREE.Color(0x404040).multiplyScalar(params.ambientIntensity)
                );
            }
            
            // Update directional light uniform
            if (material.uniforms.directionalLightColor) {
                material.uniforms.directionalLightColor.value.copy(
                    new THREE.Color(0xffffff).multiplyScalar(params.directionalIntensity)
                );
            }
            
            // Update glow intensity
            if (material.uniforms.glowIntensity) {
                material.uniforms.glowIntensity.value = params.ufoGlowIntensity;
            }
        }
    });
}

// Shader uniforms to be updated every frame
const shaderUniforms = {
    time: { value: 0 },
    noiseIntensity: { value: params.noiseIntensity },
    glowColor: { value: new THREE.Color(0x00ffff) },
    glowIntensity: { value: params.ufoGlowIntensity },
    useVertexColors: { value: params.useVertexColors },
    ambientLight: { value: new THREE.Color(0x404040).multiplyScalar(params.ambientIntensity) },
    directionalLightColor: { value: new THREE.Color(0xffffff).multiplyScalar(params.directionalIntensity) },
    directionalLightDirection: { value: new THREE.Vector3(5, 10, 7).normalize() },
    ufoColor: { value: new THREE.Color(0x88ccff) }
};

const customMaterials = [];

// Updating material properties
function updateMaterials() {
    shaderUniforms.glowIntensity.value = params.ufoGlowIntensity;
    shaderUniforms.useVertexColors.value = params.useVertexColors;
    shaderUniforms.ambientLight.value.copy(new THREE.Color(0x404040).multiplyScalar(params.ambientIntensity));
    shaderUniforms.directionalLightColor.value.copy(new THREE.Color(0xffffff).multiplyScalar(params.directionalIntensity));
    
    // Switch between custom shaders and standard materials
    if (scene.getObjectByName('ufoMesh') && customMaterials.length > 0) {
        if (params.enableCustomShaders) {
            scene.getObjectByName('ufoMesh').material = customMaterials[0];
            customMaterials[0].uniforms.glowIntensity.value = params.ufoGlowIntensity;
            customMaterials[0].uniforms.ambientLight.value.copy(new THREE.Color(0x404040).multiplyScalar(params.ambientIntensity));
            customMaterials[0].uniforms.directionalLightColor.value.copy(new THREE.Color(0xffffff).multiplyScalar(params.directionalIntensity));
        } else {
            scene.getObjectByName('ufoMesh').material = new THREE.MeshStandardMaterial({
                vertexColors: params.useVertexColors,
                metalness: 0.5,
                roughness: 0.2,
                emissive: new THREE.Color(0x00ffff),
                emissiveIntensity: params.ufoGlowIntensity * 0.3
            });
        }
    }
    
    if (scene.getObjectByName('alienMesh') && customMaterials.length > 1) {
        if (params.enableCustomShaders) {
            scene.getObjectByName('alienMesh').material = customMaterials[1];
            customMaterials[1].uniforms.glowIntensity.value = params.ufoGlowIntensity;
            customMaterials[1].uniforms.ambientLight.value.copy(new THREE.Color(0x404040).multiplyScalar(params.ambientIntensity));
            customMaterials[1].uniforms.directionalLightColor.value.copy(new THREE.Color(0xffffff).multiplyScalar(params.directionalIntensity));
        } else {
            scene.getObjectByName('alienMesh').material = new THREE.MeshStandardMaterial({
                vertexColors: params.useVertexColors,
                metalness: 0.1,
                roughness: 0.8
            });
        }
    }
    
    if (scene.getObjectByName('earthMesh') && customMaterials.length > 2) {
        if (params.enableCustomShaders) {
            scene.getObjectByName('earthMesh').material = customMaterials[2];
            customMaterials[2].uniforms.glowIntensity.value = params.ufoGlowIntensity;
            customMaterials[2].uniforms.ambientLight.value.copy(new THREE.Color(0x404040).multiplyScalar(params.ambientIntensity));
            customMaterials[2].uniforms.directionalLightColor.value.copy(new THREE.Color(0xffffff).multiplyScalar(params.directionalIntensity));
        } else {
            scene.getObjectByName('earthMesh').material = new THREE.MeshStandardMaterial({
                vertexColors: params.useVertexColors,
                metalness: 0.1,
                roughness: 0.7
            });
        }
    }
    updateLighting();

}

function createAsteroidBelt() {
    // Params for the asteroid belt
    const asteroidBelt = [];
    const beltRadius = 8;
    const beltThickness = 0.4; 
    const asteroidCount = 600; 

    // Create custom asteroid shader material
    const asteroidMaterial = new THREE.ShaderMaterial({
        uniforms: {
            ...shaderUniforms,
            glowIntensity: { value: 0.1 },  // Less glow for asteroids
            ufoColor: { value: new THREE.Color(0x888888) }  // Default asteroid color
        },
        vertexShader: customShaders.vertexShader,
        fragmentShader: customShaders.fragmentShader,
        vertexColors: true
    });
    customMaterials.push(asteroidMaterial);

    // Creates i asteroids
    for (let i = 0; i < asteroidCount; i++) {
        const geometry = new THREE.SphereGeometry(
            Math.random() * 0.03 + 0.1, // Random asteroid sizes
            8, 
            8
        );
        
        // Create a clone of the material with unique color
        const material = params.enableCustomShaders ? 
            asteroidMaterial.clone() : 
            new THREE.MeshStandardMaterial({ 
                color: new THREE.Color(
                    0.6 + Math.random() * 0.4, 
                    0.6 + Math.random() * 0.4, 
                    0.6 + Math.random() * 0.4
                ),
                roughness: 0.7,
                metalness: 0.3
            });
        
        if (params.enableCustomShaders) {
            material.uniforms.ufoColor.value = new THREE.Color(
                0.6 + Math.random() * 0.4, 
                0.6 + Math.random() * 0.4, 
                0.6 + Math.random() * 0.4
            );
        }
        
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.name = `asteroid_${i}`;
        asteroid.castShadow = true;
        asteroid.receiveShadow = true;
        
        // Initial placement for the asteroids in orbit
        const angle = Math.random() * Math.PI * 2;
        const orbitSpeed = (Math.random() * 0.5 + 0.5); // Random speed
        const radiusVariation = (Math.random() - 0.5) * 7; 
        const heightVariation = (Math.random() - 0.5) * beltThickness;
        
        // Data inputted from the GUI
        asteroid.userData = {
            angle: angle,
            orbitRadius: beltRadius + radiusVariation,
            orbitSpeed: orbitSpeed,
            heightOffset: heightVariation
        };
        
        // Initial position 
        updateAsteroidPosition(asteroid, 0);
        
        // Random rotation
        asteroid.rotation.x = Math.random() * Math.PI * 2;
        asteroid.rotation.y = Math.random() * Math.PI * 2;
        asteroid.rotation.z = Math.random() * Math.PI * 2;
        
        scene.add(asteroid);
        asteroidBelt.push(asteroid);
    }
    
    return asteroidBelt;
}

function updateAsteroidPosition(asteroid, time) {
    const data = asteroid.userData;
    
    // Orbiting motion
    const newAngle = data.angle + data.orbitSpeed * 0.02 * params.animationSpeed;
    data.angle = newAngle;
    
    // Calculate position
    const x = Math.cos(newAngle) * data.orbitRadius;
    const z = Math.sin(newAngle) * data.orbitRadius;
    
    // Add Perlin noise
    const noiseX = perlin.noise(time + asteroid.id * 0.1);
    const noiseY = perlin.noise(time + asteroid.id * 0.2 + 100);
    const noiseZ = perlin.noise(time + asteroid.id * 0.3 + 200);
    
    // Control the intensity of the added noise
    asteroid.position.x = x + (noiseX - 0.5) * params.noiseIntensity * 0.5;
    asteroid.position.y = data.heightOffset + (noiseY - 0.5) * params.noiseIntensity * 0.5;
    asteroid.position.z = z + (noiseZ - 0.5) * params.noiseIntensity * 0.5;
    
    // Update noise intensity in shader if using custom shader
    if (params.enableCustomShaders && asteroid.material.uniforms) {
        asteroid.material.uniforms.noiseIntensity.value = params.noiseIntensity;
    }
}

const textureLoader = new THREE.TextureLoader();
const starTexture = textureLoader.load('/Assets/Circle.png'); 

// Function to create a star field (particle system).
function createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = [];
    const range = 300; // how large an area the stars are spread over
  
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * range - range / 2;
      const y = Math.random() * range - range / 2;
      const z = Math.random() * range - range / 2;
      positions.push(x, y, z);
    }
  
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      sizeAttenuation: true,
      map: starTexture,
      alphaTest: 0.1,    // so the transparent part of the texture is discarded
      transparent: true, // for partial transparency
    });
  
    return new THREE.Points(starGeometry, starMaterial);
}

// Add the star field to the scene
const starField = createStarField();
scene.add(starField);

let customShaders = {
    vertexShader: '',
    fragmentShader: ''
};

function cloneUniforms(uniforms) {
    const cloned = {};
    for (const [key, uniform] of Object.entries(uniforms)) {
        if (uniform.value instanceof THREE.Vector3) {
            cloned[key] = { value: uniform.value.clone() };
        } else if (uniform.value instanceof THREE.Color) {
            cloned[key] = { value: uniform.value.clone() };
        } else {
            cloned[key] = { value: uniform.value };
        }
    }
    return cloned;
}

let pointerLockControls;

// Initialize the scene
async function init() {
    // Load custom shaders
    try {
        customShaders = await loadShaders();
        console.log("Custom shaders loaded successfully");
    } catch (error) {
        console.error("Error loading shaders:", error);
        params.enableCustomShaders = false;
    }
    
    // Load PLY models
    const plyLoader = new PLYLoader();
    const plyModels = ['UFO.ply', 'Alien.ply', 'Earth.ply'];
    const plyPositions = [
        new THREE.Vector3(0, 10.2, 0),     // UFO
        new THREE.Vector3(0, 5.99, 0),    // Alien
        new THREE.Vector3(0, 0, 0)    // Earth
    ];
    const plyNames = ['ufoMesh', 'alienMesh', 'earthMesh'];
    // Glow colours for the .ply objects
    const plyGlowColors = [
        new THREE.Color(0x00ffff),  // Cyan - UFO
        new THREE.Color(0x22ff22),  // Green - Alien
        new THREE.Color(0x2288ff)   // Blue - Earth
    ];
    const plyGlowIntensities = [params.ufoGlowIntensity, params.ufoGlowIntensity, params.ufoGlowIntensity];
    
    // Create materials before loading models
    for (let i = 0; i < plyModels.length; i++) {
        const customMaterial = new THREE.ShaderMaterial({
            uniforms: {
                ...cloneUniforms(shaderUniforms),
                glowColor: { value: plyGlowColors[i] },
                glowIntensity: { value: plyGlowIntensities[i] }
            },
            vertexShader: customShaders.vertexShader,
            fragmentShader: customShaders.fragmentShader,
            vertexColors: true
        });
        customMaterials.push(customMaterial);
    }

    for (let i = 0; i < plyModels.length; i++) {
        plyLoader.load(`Assets/${plyModels[i]}`, function (geometry) {
            geometry.computeVertexNormals();
            
            let material;
            if (params.enableCustomShaders) {
                material = customMaterials[i];
            } else {
                material = new THREE.MeshStandardMaterial({
                    vertexColors: params.useVertexColors,
                    flatShading: false,
                    metalness: i === 0 ? 0.5 : 0.1, 
                    roughness: i === 0 ? 0.2 : 0.8,  
                    emissive: plyGlowColors[i],
                    emissiveIntensity: plyGlowIntensities[i] * 0.3
                });
            }
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = plyNames[i];
            mesh.position.copy(plyPositions[i]);
            
            // Special cases for each model
            if (plyModels[i] === 'UFO.ply') {
                mesh.scale.set(0.03, 0.03, 0.03); // decreasing UFO size
                
                // Add a point light inside the UFO
                const ufoLight = new THREE.PointLight(0x00ffff, 1, 10);
                ufoLight.position.set(0, 0, 0);
                mesh.add(ufoLight);
            }
            
            if (plyModels[i] === 'Alien.ply') {
                // Store its initial Y position
                mesh.userData.initialY = mesh.position.y;
            }
            
            if (plyModels[i] === 'Earth.ply') {
                mesh.scale.set(2, 2, 2); // increasing Earth size
                // Make Earth cast and receive shadows
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            
        }, undefined, function (error) {
            console.error(`Error loading PLY model ${plyModels[i]}:`, error);
        });
    }

    // Create asteroid belt
    createAsteroidBelt();

    // Set camera position
    camera.position.x = 0;
    camera.position.y = 4;
    camera.position.z = 20;

    pointerLockControls = new PointerLockControls(camera, renderer.domElement);
    scene.add(pointerLockControls.object);

    // Attach click listener to the canvas only
    renderer.domElement.addEventListener('click', (event) => {
        // Only lock pointer if the click target is exactly the canvas
        if (event.target === renderer.domElement) {
            pointerLockControls.lock();
        }
    });

    // Get the dat.GUI container (dat.GUI creates a div with class 'dg')
    const guiContainer = document.querySelector('.dg');
    if (guiContainer) {
        // When the mouse enters the GUI, unlock pointer lock if it's active
        guiContainer.addEventListener('mouseenter', () => {
            if (pointerLockControls.isLocked) {
                pointerLockControls.unlock();
            }
        });

        // Stop propagation for clicks on the GUI so they don't reach the canvas
        guiContainer.addEventListener('click', (event) => {
            event.stopPropagation();
        }, true);
    }

    document.addEventListener('click', () => {
        pointerLockControls.lock();
    }, false);
    pointerLockControls.addEventListener('lock', () => {
        console.log('Pointer locked: fly-through enabled.');
    });
    pointerLockControls.addEventListener('unlock', () => {
        console.log('Pointer unlocked: click to re-enable fly-through.');
    });
    
    // Enable renderer shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Start animation loop
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    const t = elapsedTime * params.animationSpeed;
    
    // Update shader uniforms
    shaderUniforms.time.value = elapsedTime;
    shaderUniforms.noiseIntensity.value = params.noiseIntensity;
    
    // Update all custom materials
    customMaterials.forEach(material => {
        if (material.uniforms) {
            material.uniforms.time.value = elapsedTime;
            material.uniforms.noiseIntensity.value = params.noiseIntensity;
        }
    });
    
    // Update asteroid positions
    scene.children.forEach(child => {
        if (child.name && child.name.startsWith('asteroid_')) {
            updateAsteroidPosition(child, t);
            
            // Asteroids rotate on themselves
            child.rotation.x += 0.01;
            child.rotation.y += 0.005;
            child.rotation.z += 0.008;
        }
    });

    // Update alien position using the smoothed speed
    const alienMesh = scene.getObjectByName('alienMesh');
    if (alienMesh) {
        const baseY = alienMesh.userData.initialY; // The starting Y position
        const phase = clock.getElapsedTime() * currentAbductionSpeed + phaseOffset;
        alienMesh.position.y = baseY + Math.sin(phase) * params.alienAbductionAmplitude;
    }
    
    // Make UFO rotate
    const ufoMesh = scene.getObjectByName('ufoMesh');
    if (ufoMesh) {
        ufoMesh.rotation.y += 0.01;
    }

    // Move camera using keyboard
    const moveSpeed = 0.05;
    const direction = new THREE.Vector3();
    const player = pointerLockControls.object;

    // Forward/backward in camera's facing direction
    if (movement.forward) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.normalize();
        player.position.add(forward.multiplyScalar(moveSpeed));
    }
    if (movement.backward) {
        const backward = new THREE.Vector3();
        camera.getWorldDirection(backward);
        backward.normalize();
        player.position.add(backward.multiplyScalar(-moveSpeed));
    }

    // Lateral movement: compute left/right vectors
    if (movement.left) {
        const left = new THREE.Vector3();
        camera.getWorldDirection(left);
        left.y = 0;
        left.normalize();
        left.cross(camera.up);
        player.position.add(left.multiplyScalar(-moveSpeed));
    }
    if (movement.right) {
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.y = 0;
        right.normalize();
        right.cross(camera.up);
        player.position.add(right.multiplyScalar(moveSpeed));
    }

    // Vertical movement
    if (movement.up) player.position.y += moveSpeed;
    if (movement.down) player.position.y -= moveSpeed;

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            movement.forward = true;
            break;
        case 'ArrowDown':
        case 's':
            movement.backward = true;
            break;
        case 'ArrowLeft':
        case 'a':
            movement.left = true;
            break;
        case 'ArrowRight':
        case 'd':
            movement.right = true;
            break;
        // Use space to go up
        case ' ':
        case 'Space':
            movement.up = true;
            break;
        // Use shift to go down
        case 'Shift':
        case 'ShiftLeft':
        case 'ShiftRight':
            movement.down = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            movement.forward = false;
            break;
        case 'ArrowDown':
        case 's':
            movement.backward = false;
            break;
        case 'ArrowLeft':
        case 'a':
            movement.left = false;
            break;
        case 'ArrowRight':
        case 'd':
            movement.right = false;
            break;
        case ' ':
        case 'Space':
            movement.up = false;
            break;
        case 'Shift':
        case 'ShiftLeft':
        case 'ShiftRight':
            movement.down = false;
            break;
    }
});

init();