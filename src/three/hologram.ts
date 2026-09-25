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
}

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vToEye;
  void main() {
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
  varying vec3 vNormal;
  varying vec3 vToEye;
  void main() {
    // Backfaces arrive with the normal pointing away; abs() treats both sides
    // alike, which is what lets the far wall of a panel glow too.
    float facing = abs(dot(normalize(vNormal), normalize(vToEye)));
    float edge = pow(1.0 - facing, uFalloff);
    float strength = (uBase + uRim * edge) * uGain;
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
 * The bodywork is barely there — it is the thing being seen through, and any
 * real brightness over a surface that large washes the rest out. The structure
 * and the powertrain are what the view exists to show.
 */
export const LOOKS: Record<string, HologramLook> = {
  Govde: { base: 0.11, rim: 1.15, falloff: 1.9 },
  Cam: { base: 0.06, rim: 0.75, falloff: 2.0 },
  Ayna: { base: 0.16, rim: 0.8, falloff: 2.0 },
  Panel: { base: 0.5, rim: 0.5, falloff: 1.6 },
  Logo: { base: 0.9, rim: 0.3, falloff: 1.5, tint: "#ff6a4d" },
  Sasi: { base: 0.55, rim: 0.7, falloff: 1.8 },
  RollCage: { base: 0.6, rim: 0.8, falloff: 1.8 },
  Tekerlek: { base: 0.22, rim: 0.85, falloff: 2.0 },
  Koltuk: { base: 0.3, rim: 0.7, falloff: 2.0 },
  Direksiyon: { base: 0.4, rim: 0.7, falloff: 1.8 },
  Kokpit: { base: 0.26, rim: 0.6, falloff: 2.0 },
  Ekran: { base: 1.0, rim: 0.4, falloff: 1.5, tint: "#9beaff" },
  Far: { base: 0.9, rim: 0.4, falloff: 1.5, tint: "#dff3ff" },
  Stop: { base: 0.8, rim: 0.4, falloff: 1.5, tint: "#ff5a4a" },
  // The powertrain runs warm against the cold structure, so the eye finds it.
  Batarya_Hucre: { base: 0.80, rim: 0.6, falloff: 1.7, tint: "#ffb648" },
  Batarya_Kutu: { base: 0.34, rim: 0.7, falloff: 1.8, tint: "#ff9a2e" },
  Batarya_Fan: { base: 0.8, rim: 0.5, falloff: 1.6, tint: "#ffc46a" },
  Motor: { base: 0.80, rim: 0.7, falloff: 1.7, tint: "#ffd07a" },
};

export const DEFAULT_LOOK: HologramLook = { base: 0.2, rim: 0.6, falloff: 2.0 };

export function lookFor(name: string): HologramLook {
  const key = Object.keys(LOOKS).find((k) => name.startsWith(k));
  return key ? LOOKS[key] : DEFAULT_LOOK;
}
