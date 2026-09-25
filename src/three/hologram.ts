import * as THREE from "three";

/**
 * The x-ray look, as a material.
 *
 * Additive blending is the whole trick: overlapping surfaces accumulate
 * brightness instead of hiding one another, so the chassis reads straight
 * through the bodywork and the picture never depends on which triangle the
 * renderer happened to draw first. That also means depth writing has to be
 * off — with it on, a panel in front would punch a hole in everything behind.
 *
 * On top of that sits a Fresnel term: a surface facing the camera is nearly
 * invisible, one seen edge-on lights up. That is what turns a curved panel
 * into a glowing outline rather than a flat tinted sheet.
 */
export interface HologramLook {
  /** How much the surface glows when facing the camera. */
  base: number;
  /** How much it gains at a grazing angle. */
  rim: number;
  /** Higher values keep the rim tighter to the silhouette. */
  falloff: number;
  /** Multiplies the scheme colour; use for parts that should read warm. */
  tint?: THREE.ColorRepresentation;
  /** How strongly the scanning band lights this part (default 0.9). */
  scan?: number;
}

/**
 * One clock shared by every hologram material, so the scan crosses the whole
 * car as a single band rather than each part keeping its own time.
 */
export const SCAN_CLOCK = { value: 0 };

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vToEye;
  varying float vAlong;
  varying float vHeight;
  void main() {
    // Model space, not world: the scan belongs to the car and turns with it
    // on the turntable instead of sweeping a fixed plane of the room.
    vAlong = position.x;
    vHeight = position.y;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vToEye = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBase;
  uniform float uRim;
  uniform float uFalloff;
  uniform float uGain;
  uniform float uTime;
  uniform float uScan;
  varying vec3 vNormal;
  varying vec3 vToEye;
  varying float vAlong;
  varying float vHeight;
  void main() {
    // Backfaces arrive with the normal pointing away; abs() treats both sides
    // alike, which is what lets the far wall of a panel glow too.
    float facing = abs(dot(normalize(vNormal), normalize(vToEye)));
    float edge = pow(1.0 - facing, uFalloff);

    // A bright band sweeping nose to tail every few seconds, the scanner the
    // references are built round, with a soft wake behind it.
    float head = mod(uTime * 0.55, 5.2) - 2.6;
    float band = exp(-pow((vAlong - head) / 0.07, 2.0));
    float wake = exp(-max(head - vAlong, 0.0) * 2.4) * step(vAlong, head) * 0.22;

    // Faint horizontal striations, like the raster of a projected image.
    float lines = 0.86 + 0.14 * sin(vHeight * 260.0);

    float strength = ((uBase + uRim * edge) * lines + (band + wake) * uScan) * uGain;
    gl_FragColor = vec4(uColor * strength, strength);
  }
`;

export function makeHologramMaterial(
  colour: THREE.Color,
  look: HologramLook,
  gain: number,
): THREE.ShaderMaterial {
  const shade = look.tint ? new THREE.Color(look.tint) : colour.clone();
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: shade },
      uBase: { value: look.base },
      uRim: { value: look.rim },
      uFalloff: { value: look.falloff },
      uGain: { value: gain },
      uTime: SCAN_CLOCK,
      uScan: { value: look.scan ?? 0.9 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * How brightly each part of the car reads.
 *
 * The bodywork carries the picture: it is the shape anyone recognises, and the
 * wireframe over it supplies the detail. The structure inside is pulled back
 * to sit behind the skin rather than burn through it — a chassis brighter than
 * the car it lives in reads as a frame with a bag over it.
 */
export const LOOKS: Record<string, HologramLook> = {
  Govde: { base: 0.10, rim: 0.95, falloff: 2.0 },
  Cam: { base: 0.09, rim: 0.8, falloff: 2.0 },
  Ayna: { base: 0.20, rim: 0.85, falloff: 1.9 },
  Panel: { base: 0.5, rim: 0.5, falloff: 1.6 },
  Sasi: { base: 0.26, rim: 0.7, falloff: 1.9 },
  RollCage: { base: 0.30, rim: 0.8, falloff: 1.9 },
  Tekerlek: { base: 0.20, rim: 0.85, falloff: 2.0 },
  Koltuk: { base: 0.26, rim: 0.85, falloff: 1.9 },
  Direksiyon: { base: 0.30, rim: 0.8, falloff: 1.8 },
  Kokpit: { base: 0.22, rim: 0.7, falloff: 2.0 },
  Ekran: { base: 1.0, rim: 0.4, falloff: 1.5, tint: "#9beaff" },
  Far: { base: 1.05, rim: 0.8, falloff: 1.7, tint: "#d8f0ff" },
  Stop: { base: 1.00, rim: 0.8, falloff: 1.7, tint: "#ff4436" },
  // The powertrain runs warm against the cold structure, so the eye finds it.
  Batarya_Hucre: { base: 0.55, rim: 0.6, falloff: 1.7, tint: "#ff9b2e" },
  Batarya_Kutu: { base: 0.38, rim: 0.8, falloff: 1.8, tint: "#ff7d16" },
  Batarya_Fan: { base: 0.85, rim: 0.5, falloff: 1.6, tint: "#ffb44a" },
  Motor: { base: 0.60, rim: 0.9, falloff: 1.6, tint: "#ffae3d" },
};

export const DEFAULT_LOOK: HologramLook = { base: 0.2, rim: 0.6, falloff: 2.0 };

/**
 * The mesh's own topology, drawn over the skin.
 *
 * This is where the reference images get their detail: the lines are the
 * surface's edges, not a texture painted on it, so they follow every curve and
 * crowd wherever the CAD tessellation is dense. Only the outer parts are
 * worth wiring — a wireframe over the structure as well turns the whole car
 * into noise.
 */
/**
 * Crisp outlines of the parts with real edges — seat, dash, wheel, cage, pack,
 * motors. The Fresnel glow shows curvature; these show where a shape turns a
 * corner, which is what makes the interior read as designed parts rather than
 * soft blobs.
 */
export const EDGE_ON = [
  "Koltuk",
  "Kokpit",
  "Direksiyon",
  "RollCage",
  "Batarya_Kutu",
  "Motor",
  "Ekran",
  "Ayna",
];
export const EDGE_ANGLE = 28; // degrees between faces before an edge is drawn

export function makeEdgeMaterial(colour: THREE.Color, strength: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: colour.clone().multiplyScalar(strength),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export const WIRE_PREFIX = "Tel_";

export function makeWireMaterial(colour: THREE.Color, strength: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: colour.clone().multiplyScalar(strength),
    wireframe: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function lookFor(name: string): HologramLook {
  const key = Object.keys(LOOKS).find((k) => name.startsWith(k));
  return key ? LOOKS[key] : DEFAULT_LOOK;
}
