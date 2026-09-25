import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useLanguage } from "../context/LanguageContext";
import { lookFor, makeHologramMaterial } from "../three/hologram";

const MODEL_URL = "/models/voltaris-arac.glb";
// The view behind the studio until someone drops in their own picture.
const DEFAULT_BACKDROP: string | null = null;

// One scheme colour for the whole x-ray. Parts that need to stand out — the
// pack, the motors, the cabling — carry their own tint in the look table.
const SCHEME = "#29d3e8";

interface ViewPreset {
  tr: string;
  en: string;
  at: [number, number, number];
}

// Camera positions in the model's own frame: +X is the nose, +Y is up.
const VIEWS = {
  onCeyrek: { tr: "Ön 3/4", en: "Front 3/4", at: [2.5, 1.95, 5.15] },
  yan: { tr: "Yan", en: "Side", at: [0.1, 1.5, 5.7] },
  arkaCeyrek: { tr: "Arka 3/4", en: "Rear 3/4", at: [-3.5, 1.95, 4.5] },
  ust: { tr: "Kuşbakışı", en: "Top", at: [1.8, 4.1, 2.05] },
} satisfies Record<string, ViewPreset>;

type ViewKey = keyof typeof VIEWS;

const TARGET = new THREE.Vector3(0, 0.72, 0);

// Studio dimensions, in metres, in the car's own frame: +X is the nose, +Y is
// up, +Z is across. The car sits on the podium, whose top is y = 0.
const FLOOR_Y = -0.1;
const PODIUM_R = 2.15;
const COVE_R = 9;
const COVE_H = 8;
const COVE_FLARE = 3.2;

// The picture screen: a wide arc hung high on the back wall, centred opposite
// the default camera so it fills the background of the opening shot.
const SCREEN_R = 8.5;
const SCREEN_H = 6;
const SCREEN_Y = 3.2;
const SCREEN_ARC = 180;
const SCREEN_FROM = 206 - SCREEN_ARC / 2;
// Width-to-height of the unrolled screen, used to lay a picture on it without
// stretching: the arc is 27 m across and 6 m tall.
const SCREEN_ASPECT = (Math.PI * SCREEN_R * SCREEN_ARC) / 180 / SCREEN_H;

// The overhead rig: hung high and kept slim, cropping into the top of frame.
const RIG: { at: [number, number, number]; tilt: number; size: [number, number] }[] = [
  { at: [0, 3.35, 0], tilt: 0, size: [3.8, 0.75] },
  { at: [0, 3.25, 3.5], tilt: 40, size: [3.8, 0.26] },
  { at: [0, 3.25, -3.5], tilt: -40, size: [3.8, 0.26] },
];

/** One overhead softbox: a slim housing, a lit diffuser, and drop rods. */
function Softbox({
  position,
  rotation = [0, 0, 0],
  size,
  glow,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  glow: number;
}) {
  const [along, across] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.026, 0]}>
        <boxGeometry args={[along, 0.05, across]} />
        <meshStandardMaterial color="#0b0d10" metalness={0.85} roughness={0.26} />
      </mesh>
      <mesh>
        <boxGeometry args={[along - 0.05, 0.008, across - 0.05]} />
        {/* toneMapped off, or the diffusers read as grey rather than lit. */}
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={glow} toneMapped={false} />
      </mesh>
      {/* Thin rods running up out of frame, so the rig reads as hung rather
          than floating in mid-air. */}
      {[-along * 0.34, along * 0.34].map((x) => (
        <mesh key={x} position={[x, 1.2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 2.4, 8]} />
          <meshStandardMaterial color="#14171c" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The curved screen hung behind the car. Empty it is a dark panel; given a
 * picture it becomes the view behind the studio.
 *
 * The picture is read from the visitor's own file picker and never leaves
 * their browser.
 */
function Backdrop({ imageUrl, lights }: { imageUrl: string | null; lights: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }
    let live = true;
    new THREE.TextureLoader().load(imageUrl, (loaded) => {
      if (!live) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      // Fit the picture to the screen's height at its own proportions: a
      // snapshot would otherwise be smeared across 27 m of arc. Anything
      // narrower than the sweep runs its edge pixels out to the sides, which
      // is why a wide panorama suits this screen best.
      const shape = loaded.image.width / loaded.image.height;
      const span = SCREEN_ASPECT / shape;
      loaded.wrapS = THREE.MirroredRepeatWrapping;
      // Negative, because the screen is seen from inside the curve and the
      // picture would otherwise read backwards.
      loaded.repeat.x = -span;
      loaded.offset.x = (1 + span) / 2;
      setTexture(loaded);
    });
    return () => {
      live = false;
    };
  }, [imageUrl]);

  useEffect(() => () => texture?.dispose(), [texture]);

  const arc = (radius: number, height: number, from: number, sweep: number) =>
    [radius, radius, height, 120, 1, true, THREE.MathUtils.degToRad(from), THREE.MathUtils.degToRad(sweep)] as const;

  return (
    <group position={[0, SCREEN_Y, 0]}>
      {/* A bezel a little behind and a little proud of the picture, so the
          edge of the screen reads as a frame rather than as a cut. */}
      <mesh>
        <cylinderGeometry args={arc(SCREEN_R + 0.07, SCREEN_H + 0.18, SCREEN_FROM - 0.7, SCREEN_ARC + 1.4)} />
        <meshStandardMaterial color="#0a0c10" metalness={0.8} roughness={0.34} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={arc(SCREEN_R, SCREEN_H, SCREEN_FROM, SCREEN_ARC)} />
        {texture ? (
          <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            color="#0d1016"
            emissive="#13323c"
            emissiveIntensity={0.25 * lights}
            roughness={0.66}
            side={THREE.BackSide}
          />
        )}
      </mesh>
    </group>
  );
}

/** The room: curved cove, turntable podium, lighting rig and front screen. */
function Studio({ lights, imageUrl }: { lights: number; imageUrl: string | null }) {
  // A cove that flares as it rises, so floor and wall meet with no corner —
  // the seamless backdrop a real studio sweeps into.
  const cove = useMemo(() => {
    const points = [new THREE.Vector2(COVE_R, FLOOR_Y)];
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      points.push(
        new THREE.Vector2(
          COVE_R + COVE_FLARE * (1 - Math.cos((t * Math.PI) / 2)),
          FLOOR_Y + COVE_H * t,
        ),
      );
    }
    return new THREE.LatheGeometry(points, 96);
  }, []);

  return (
    <group>
      <mesh geometry={cove}>
        <meshStandardMaterial color="#0b0d11" roughness={0.62} metalness={0.05} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <circleGeometry args={[COVE_R + 0.05, 72]} />
        <meshStandardMaterial color="#0b0d11" roughness={0.62} metalness={0.05} />
      </mesh>

      {/* Turntable podium, with a lit rim so its edge reads against the floor. */}
      <mesh position={[0, FLOOR_Y / 2, 0]} receiveShadow>
        <cylinderGeometry args={[PODIUM_R, PODIUM_R + 0.09, -FLOOR_Y, 96]} />
        <meshStandardMaterial color="#101318" roughness={0.3} metalness={0.35} />
      </mesh>
      {/* Its top is a mirror, softened. A car standing on its own reflection
          is most of what separates a showroom shot from a model on a plate. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[PODIUM_R, 96]} />
        <MeshReflectorMaterial
          resolution={256}
          mixBlur={1.1}
          mixStrength={22}
          blur={[200, 60]}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#0e1116"
          metalness={0.55}
          roughness={0.72}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <torusGeometry args={[PODIUM_R + 0.02, 0.022, 12, 96]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={1.7 * lights}
          toneMapped={false}
        />
      </mesh>

      <Backdrop imageUrl={imageUrl} lights={lights} />

      {/* Overhead rig: one panel down the middle, two strips angled in. */}
      {RIG.map(({ at, tilt, size }) => (
        <Softbox
          key={`${at[1]}-${at[2]}`}
          position={at}
          rotation={[THREE.MathUtils.degToRad(tilt), 0, 0]}
          size={size}
          glow={2.2 * lights}
        />
      ))}

    </group>
  );
}

/** Does this browser have a working WebGL context at all? */
function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

interface CarProps {
  headlights: boolean;
  taillights: boolean;
  spinning: boolean;
  /** Bumped when a camera preset is picked, to bring the car back to square. */
  homeKey: number;
  /** Overall brightness of the x-ray. */
  glow: number;
}

function Car({ headlights, taillights, spinning, homeKey, glow }: CarProps) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const homing = useRef(false);

  // Every mesh gets its own x-ray material, keyed on the object's name rather
  // than the material's: the painted model shares one material across parts
  // that need to read at quite different brightnesses here.
  const parts = useMemo(() => {
    const made: { name: string; material: THREE.ShaderMaterial }[] = [];
    const scheme = new THREE.Color(SCHEME);
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;
      const material = makeHologramMaterial(scheme, lookFor(child.name), 1);
      child.material = material;
      made.push({ name: child.name, material });
    });
    return made;
    // Built once per model; colour and brightness are pushed in below.
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const { name, material } of parts) {
      const lamp = name.startsWith("Far") ? headlights : name.startsWith("Stop") ? taillights : null;
      material.uniforms.uGain.value = lamp === false ? 0 : glow;
    }
  }, [parts, glow, headlights, taillights]);

  useEffect(() => {
    if (homeKey > 0) homing.current = true;
  }, [homeKey]);

  useFrame((_, delta) => {
    const car = group.current;
    if (!car) return;
    if (spinning) {
      car.rotation.y += delta * 0.2;
      homing.current = false;
      return;
    }
    // A camera preset means nothing while the turntable has left the car
    // pointing somewhere else, so wind the rotation back the short way.
    if (!homing.current) return;
    let angle = car.rotation.y % (Math.PI * 2);
    if (angle > Math.PI) angle -= Math.PI * 2;
    if (angle < -Math.PI) angle += Math.PI * 2;
    car.rotation.y = angle * (1 - Math.min(1, delta * 4));
    if (Math.abs(car.rotation.y) < 0.002) {
      car.rotation.y = 0;
      homing.current = false;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

/** Eases the camera to whichever preset was last picked. */
function ViewRig({ view, nudge }: { view: ViewKey; nudge: number }) {
  const { camera, controls } = useThree();
  const goal = useRef(new THREE.Vector3());
  const flying = useRef(false);

  useEffect(() => {
    goal.current.set(...VIEWS[view].at);
    flying.current = true;
  }, [view, nudge]);

  useFrame((_, delta) => {
    if (!flying.current) return;
    camera.position.lerp(goal.current, Math.min(1, delta * 3.4));
    (controls as OrbitControlsImpl | null)?.target.lerp(TARGET, Math.min(1, delta * 3.4));
    (controls as OrbitControlsImpl | null)?.update();
    if (camera.position.distanceTo(goal.current) < 0.02) flying.current = false;
  });

  return null;
}

export function CarViewer() {
  const { t, lang } = useLanguage();
  const [supported] = useState(webglAvailable);
  const [headlights, setHeadlights] = useState(true);
  const [taillights, setTaillights] = useState(true);
  const [spinning, setSpinning] = useState(true);
  const [view, setView] = useState<ViewKey>("onCeyrek");
  const [nudge, setNudge] = useState(0);
  const [lights, setLights] = useState(1);
  const [backdrop, setBackdrop] = useState<string | null>(DEFAULT_BACKDROP);

  // Object URLs are handed out by the browser and have to be handed back.
  useEffect(() => () => {
    if (backdrop?.startsWith("blob:")) URL.revokeObjectURL(backdrop);
  }, [backdrop]);

  const pickBackdrop = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBackdrop((previous) => {
      if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  if (!supported) {
    return (
      <div className="car-studio car-studio--fallback">
        <p>{t.vehicle.viewerUnsupported}</p>
      </div>
    );
  }

  const label = (item: { tr: string; en: string }) => (lang === "tr" ? item.tr : item.en);

  return (
    <div className="car-studio">
      <div className="car-studio__stage" onPointerDown={() => setSpinning(false)}>
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: VIEWS.onCeyrek.at, fov: 40 }} gl={{ antialias: true }}>
          <color attach="background" args={["#06070a"]} />
          <Suspense fallback={null}>
            {/* The environment is built from light panels rather than a drei
                preset, because the presets fetch an HDR from a third-party CDN
                at runtime. Metal and paint still get something to reflect. */}
            <Environment resolution={256}>
              <Lightformer intensity={3 * lights} position={[0, 3.35, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[3.8, 0.75, 1]} />
              <Lightformer intensity={1.5 * lights} position={[0, 3.25, -3.5]} rotation={[-Math.PI / 4, 0, 0]} scale={[3.8, 0.28, 1]} />
              <Lightformer intensity={1.5 * lights} position={[0, 3.25, 3.5]} rotation={[Math.PI / 4, 0, 0]} scale={[3.8, 0.28, 1]} />
            </Environment>
            {/* Overhead softbox, as in a real studio. */}
            <directionalLight position={[1.5, 7, 2.5]} intensity={2.6 * lights} />
            <directionalLight position={[-3, 2.4, -4.5]} intensity={1.35 * lights} color="#bfe6ff" />
            <directionalLight position={[-4, 3, -3]} intensity={0.55 * lights} />
            <directionalLight position={[6, 2, 1.5]} intensity={0.9 * lights} color="#eef6ff" />
            <ambientLight intensity={0.18 * lights} />
            <Car
              headlights={headlights}
              taillights={taillights}
              spinning={spinning}
              homeKey={nudge}
              glow={lights}
            />
            <Studio lights={lights} imageUrl={backdrop} />
          </Suspense>
          <ViewRig view={view} nudge={nudge} />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={3}
            maxDistance={8}
            // Stop the camera dropping under the floor.
            maxPolarAngle={Math.PI / 2.06}
            target={TARGET}
          />
        </Canvas>
        <span className="car-studio__hint">{t.vehicle.viewerHint}</span>
      </div>

      <div className="car-studio__panel">
        <div className="car-studio__toggles">
          {[
            { key: "far", text: t.vehicle.viewerHeadlights, on: headlights, set: setHeadlights },
            { key: "stop", text: t.vehicle.viewerTaillights, on: taillights, set: setTaillights },
            { key: "don", text: t.vehicle.viewerTurntable, on: spinning, set: setSpinning },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`car-studio__chip${item.on ? " is-on" : ""}`}
              aria-pressed={item.on}
              onClick={() => item.set(!item.on)}
            >
              {item.text}
              <span>{item.on ? t.vehicle.viewerOn : t.vehicle.viewerOff}</span>
            </button>
          ))}
        </div>

        <div className="car-studio__slider">
          <label htmlFor="studio-lights">{t.vehicle.viewerLights}</label>
          <input
            id="studio-lights"
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={lights}
            onChange={(event) => setLights(Number(event.target.value))}
          />
          <span>{Math.round(lights * 100)}%</span>
        </div>

        <div className="car-studio__backdrop">
          <span className="car-studio__label">{t.vehicle.viewerBackdrop}</span>
          <label className="car-studio__view car-studio__upload">
            {t.vehicle.viewerBackdropPick}
            <input type="file" accept="image/*" onChange={pickBackdrop} />
          </label>
          {backdrop && (
            <button type="button" className="car-studio__view" onClick={() => setBackdrop(null)}>
              {t.vehicle.viewerBackdropClear}
            </button>
          )}
        </div>

        <div className="car-studio__views">
          {(Object.keys(VIEWS) as ViewKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`car-studio__view${key === view ? " is-active" : ""}`}
              onClick={() => {
                setSpinning(false);
                setView(key);
                setNudge((n) => n + 1);
              }}
            >
              {label(VIEWS[key])}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
