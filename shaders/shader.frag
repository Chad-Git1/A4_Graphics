// fragment shader
uniform vec3 glowColor;
uniform float glowIntensity;
uniform bool useVertexColors;
uniform vec3 ambientLight;
uniform vec3 directionalLightColor;
uniform vec3 directionalLightDirection;
uniform vec3 ufoColor;
uniform float time;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
    // Normalize the normal
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(directionalLightDirection);
    
    // Calculate diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * directionalLightColor;
    
    // Calculate specular lighting (Blinn-Phong)
    vec3 viewDir = normalize(-vPosition);
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
    vec3 specular = spec * directionalLightColor * 0.5;
    
    // Base color - use vertex colors if available and enabled
    vec3 baseColor = useVertexColors ? vColor : ufoColor;
    
    // Add glow effect
    float glowFactor = sin(time * 2.0) * 0.5 + 0.5; // Pulsating glow effect
    vec3 glow = glowColor * glowIntensity * glowFactor;
    
    // Combine all lighting components
    vec3 finalColor = (ambientLight + diffuse) * baseColor + specular + glow;
    
    gl_FragColor = vec4(finalColor, 1.0);
}