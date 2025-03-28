/*  
TODO LIST: 

Specific
- A1 TODO : Add different textures to each 3D model

General
- Add a mandatory technique from section 4.1 Mandatory Techniques in the assignement instructions
- Create an animation
- Add space texture to scene background 

*/


import * as THREE from 'three'; 
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.671);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.671);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Load Models
/* 
Note : if you want to add a model just add the .glb to the assets folder, 
add it to the models array below and create a vector for it's position
*/
const loader = new GLTFLoader();

const models = ['Alien.glb', 'Earth.glb', 'Saucer.glb'];
const modelPositions = [
    new THREE.Vector3(0, 0, 0), //Alien
    new THREE.Vector3(5, 0, 0), //Earth
    new THREE.Vector3(-5, 0, 0) //Saucer
];

models.forEach((model, index) => {
    loader.load(`Assets/${model}`, (gltf) => { 
        const modelScene = gltf.scene;
        
        modelScene.position.copy(modelPositions[index]); // Set position for all 3 models

        modelScene.traverse((child) => {
            if (child.isMesh) {

                // A1 TODO : Add different textures to each 3D model
                if (!child.material.map) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x66ffff }); // Light blue Temporarily
                }
            }
        });

        scene.add(modelScene);
    }, undefined, (error) => {
        console.error(`Error loading ${model}:`, error);
    });
});


// PLY Models
const plyLoader = new PLYLoader();
const plyModels = ['UFO.ply', 'Alien.ply', 'Earth.ply'];
const plyPositions = [
    new THREE.Vector3(0, 2, 0),     // UFO
    new THREE.Vector3(3, -2, 0),     // Alien
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
            mesh.scale.set(0.05, 0.05, 0.05); // decreasing UFO size
        }
        scene.add(mesh);
    }, undefined, function (error) {
        console.error(`Error loading PLY model ${model}:`, error);
    });
});

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 2, 5);
controls.update();

// Animation
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
