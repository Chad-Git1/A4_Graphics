import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import PerlinNoise from './Perlin.js';
import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const perlin = new PerlinNoise();
const params = {
    noiseIntensity: 0,
    animationSpeed: 0.5,
    alienAbductionAmplitude: 2.0,
    alienAbductionSpeed: 1.0
};

const gui = new GUI();
gui.add(params, 'noiseIntensity', 0, 2, 0.05).name('Perlin Noise');
gui.add(params, 'animationSpeed', 0, 1, 0.001).name('Orbit Speed');
gui.add(params, 'alienAbductionAmplitude', 0, 5, 0.1).name('Abduction Ampl.');
gui.add(params, 'alienAbductionSpeed', 0, 2, 0.01).name('Abduction Speed');

function createAsteroidBelt() {
    // Params for the asteroid belt
    const asteroidBelt = [];
    const beltRadius = 7;
    const beltThickness = 1.5; 
    const asteroidCount = 180; 

    // Creates i asteroids
    for (let i = 0; i < asteroidCount; i++) {
        const geometry = new THREE.SphereGeometry(
            Math.random() * 0.3 + 0.1, // Random asteroid sizes
            8, 
            8
        );
        
        // Currently a random colour for the asteroids ... TO change soon
        const material = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(
                0.6 + Math.random() * 0.4, 
                0.6 + Math.random() * 0.4, 
                0.6 + Math.random() * 0.4
            ),
            roughness: 0.7,
            metalness: 0.3
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        
        // Initial placement for the asteroids in orbit
        const angle = Math.random() * Math.PI * 2;
        const orbitSpeed = (Math.random() * 0.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1); // Random direction and speed
        const radiusVariation = (Math.random() - 0.5) * 1; 
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
    const newAngle = data.angle + data.orbitSpeed * 0.02;
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



// Load PLY models
const plyLoader = new PLYLoader();
const plyModels = ['UFO.ply', 'Alien.ply', 'Earth.ply'];
const plyPositions = [
    new THREE.Vector3(0, 2, 0),     // UFO
    new THREE.Vector3(0, -2, 0),     // Alien
    new THREE.Vector3(-3, -2, 0)     // Earth
];

plyModels.forEach((model, index) => {
    plyLoader.load(`Assets/${model}`, function (geometry) {
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(plyPositions[index]);
        if (model === 'UFO.ply') {
            mesh.scale.set(0.03, 0.03, 0.03); // decreasing UFO size
        }
        if (model === 'Alien.ply') {
            alienMesh = mesh;
            // Store its initial Y position.
            mesh.userData.initialY = mesh.position.y;
        }
        scene.add(mesh);
    }, undefined, function (error) {
        console.error(`Error loading PLY model ${model}:`, error);
    });
});

// Create asteroid belt
const asteroidBelt = createAsteroidBelt();

// Lighting
const mainLight = new THREE.AmbientLight(0xffffff, 0.8);
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(mainLight);

// Set camera position
camera.position.x = 0;
camera.position.y = 4;
camera.position.z = 10;

let alienMesh = null;

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Damping to smoothen the control movement
controls.dampingFactor = 0.25; 
controls.screenSpacePanning = false;

// Animation loop
function animate(time) {

    requestAnimationFrame(animate);
   
    const t = time * 0.001 * params.animationSpeed;
    const clampedTime = t % 1000;

    asteroidBelt.forEach((asteroid) => {
        updateAsteroidPosition(asteroid, clampedTime);

        // Asteroids rotate on themselves
        asteroid.rotation.x += 0.07;
        asteroid.rotation.y += 0.013;
        asteroid.rotation.z += 0.03;
    });

    // If the alien mesh is loaded, update its Y position for the abduction animation.
    if (alienMesh) {
        const baseY = alienMesh.userData.initialY;  // The starting Y position
        alienMesh.position.y = baseY + Math.sin(t * params.alienAbductionSpeed) * params.alienAbductionAmplitude;
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();