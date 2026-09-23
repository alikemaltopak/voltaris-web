import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useLanguage } from "../context/LanguageContext";

const MODEL_URL = "/models/voltaris-arac.glb";

interface Finish {
  id: string;
  tr: string;
  en: string;
  color: string;
  metalness: number;
  roughness: number;
}

const FINISHES: Finish[] = [
  { id: "turkuaz", tr: "Voltaris Turkuaz", en: "Voltaris Turquoise", color: "#0f8fa6", metalness: 0.65, roughness: 0.22 },
  { id: "gece", tr: "Gece Siyahı", en: "Midnight Black", color: "#15181d", metalness: 0.9, roughness: 0.16 },
  { id: "gumus", tr: "Sıvı Gümüş", en: "Liquid Silver", color: "#b9c1cb", metalness: 0.95, roughness: 0.2 },
  { id: "beyaz", tr: "İnci Beyazı", en: "Pearl White", color: "#eef1f5", metalness: 0.35, roughness: 0.25 },
  { id: "kirmizi", tr: "Yarış Kırmızısı", en: "Racing Red", color: "#b21f24", metalness: 0.8, roughness: 0.2 },
  { id: "lacivert", tr: "Derin Lacivert", en: "Deep Navy", color: "#17305e", metalness: 0.85, roughness: 0.19 },
];

interface ViewPreset {
  tr: string;
  en: string;
  at: [number, number, number];
}

// Camera positions in the model's own frame: +X is the nose, +Y is up.
const VIEWS = {
  onCeyrek: { tr: "Ön 3/4", en: "Front 3/4", at: [2.35, 1.6, 4.85] },
  yan: { tr: "Yan", en: "Side", at: [0.1, 1.2, 5.45] },
  arkaCeyrek: { tr: "Arka 3/4", en: "Rear 3/4", at: [-3.35, 1.65, 4.25] },
  ust: { tr: "Kuşbakışı", en: "Top", at: [1.8, 4.1, 2.05] },
} satisfies Record<string, ViewPreset>;

type ViewKey = keyof typeof VIEWS;

const TARGET = new THREE.Vector3(0, 0.62, 0);

// Studio dimensions, in metres, in the car's own frame: +X is the nose, +Y is
// up, +Z is across. The car sits on the podium, whose top is y = 0.
const FLOOR_Y = -0.1;
const PODIUM_R = 2.15;
const COVE_R = 9;
const COVE_H = 8;
const COVE_FLARE = 3.2;

/** One overhead softbox: a dark housing with a lit diffuser under it. */
function Softbox({
  position,
  rotation = [0, 0, 0],
  size,
  glow = 2.2,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  glow?: number;
}) {
  const [along, across] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[along, 0.07, across]} />
        <meshStandardMaterial color="#0a0b0d" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[along - 0.09, 0.012, across - 0.09]} />
        {/* toneMapped off, or the diffusers read as grey rather than lit. */}
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={glow} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The room: curved cove, turntable podium, lighting rig and front screen. */
function Studio() {
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <torusGeometry args={[PODIUM_R + 0.02, 0.022, 12, 96]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.7} toneMapped={false} />
      </mesh>

      {/* Overhead rig: one long box down the middle, two strips angled in. */}
      <Softbox position={[0, 2.85, 0]} size={[4.4, 1.6]} glow={2.4} />
      <Softbox position={[0, 2.9, 2.85]} rotation={[Math.PI * (38 / 180), 0, 0]} size={[4.4, 0.55]} glow={2} />
      <Softbox position={[0, 2.9, -2.85]} rotation={[-Math.PI * (38 / 180), 0, 0]} size={[4.4, 0.55]} glow={2} />
      <Softbox position={[-2.9, 2.25, 0]} rotation={[0, 0, Math.PI / 4]} size={[0.6, 1.8]} glow={1.8} />

      {/* The white screen standing in front of the nose. This is what lays the
          long highlight down the bonnet and flanks. */}
      <mesh position={[3.55, 1.25, 0]} rotation={[0, -Math.PI / 2, -Math.PI * (10 / 180)]}>
        <planeGeometry args={[2.7, 2.4]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#fff"
          emissiveIntensity={0.85}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[3.62, 1.25, 0]} rotation={[0, -Math.PI / 2, -Math.PI * (10 / 180)]}>
        <planeGeometry args={[2.86, 2.56]} />
        <meshStandardMaterial color="#0a0b0d" metalness={0.75} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
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
  finish: Finish;
  headlights: boolean;
  taillights: boolean;
  spinning: boolean;
  /** Bumped when a camera preset is picked, to bring the car back to square. */
  homeKey: number;
}

function Car({ finish, headlights, taillights, spinning, homeKey }: CarProps) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const homing = useRef(false);

  // The GLB carries its materials, so they only need finding once — after
  // that the controls edit them in place.
  const parts = useMemo(() => {
    const found: Record<string, THREE.MeshStandardMaterial> = {};
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard?.name) continue;
        standard.envMapIntensity = 1.2;
        found[standard.name] = standard;
      }
    });
    return found;
  }, [scene]);

  useEffect(() => {
    const paint = parts.Govde_Boya;
    if (!paint) return;
    paint.color = new THREE.Color(finish.color);
    paint.metalness = finish.metalness;
    paint.roughness = finish.roughness;
    paint.needsUpdate = true;
  }, [parts, finish]);

  useEffect(() => {
    if (parts.Far) parts.Far.emissiveIntensity = headlights ? 3 : 0;
    if (parts.Stop) parts.Stop.emissiveIntensity = taillights ? 2 : 0;
  }, [parts, headlights, taillights]);

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
      {/* A little spill on the floor, so switching the lamps on reads even in
          a viewer with no volumetrics. */}
      <pointLight position={[1.95, 0.45, 0.45]} intensity={headlights ? 1.1 : 0} distance={2.1} color="#cfe9ff" />
      <pointLight position={[1.95, 0.45, -0.45]} intensity={headlights ? 1.1 : 0} distance={2.1} color="#cfe9ff" />
      <pointLight position={[-1.9, 0.55, 0]} intensity={taillights ? 1.0 : 0} distance={1.8} color="#ff3344" />
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
  const [finish, setFinish] = useState(FINISHES[0]);
  const [headlights, setHeadlights] = useState(true);
  const [taillights, setTaillights] = useState(true);
  const [spinning, setSpinning] = useState(true);
  const [view, setView] = useState<ViewKey>("onCeyrek");
  const [nudge, setNudge] = useState(0);

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
        <Canvas shadows dpr={[1, 2]} camera={{ position: VIEWS.onCeyrek.at, fov: 40 }} gl={{ antialias: true }}>
          <color attach="background" args={["#06070a"]} />
          <Suspense fallback={null}>
            {/* The environment is built from light panels rather than a drei
                preset, because the presets fetch an HDR from a third-party CDN
                at runtime. Metal and paint still get something to reflect. */}
            <Environment resolution={256}>
              <Lightformer intensity={3} position={[0, 2.85, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[4.4, 1.6, 1]} />
              <Lightformer intensity={1.5} position={[0, 2.9, -2.85]} rotation={[-Math.PI / 4, 0, 0]} scale={[4.4, 0.6, 1]} />
              <Lightformer intensity={1.5} position={[0, 2.9, 2.85]} rotation={[Math.PI / 4, 0, 0]} scale={[4.4, 0.6, 1]} />
              <Lightformer intensity={2.2} position={[3.55, 1.25, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[2.7, 2.4, 1]} />
            </Environment>
            {/* Overhead softbox, as in a real studio. */}
            <directionalLight position={[1.5, 7, 2.5]} intensity={2.6} />
            <directionalLight position={[-3, 2.4, -4.5]} intensity={1.35} color="#bfe6ff" />
            <directionalLight position={[-4, 3, -3]} intensity={0.55} />
            <ambientLight intensity={0.18} />
            <Car
              finish={finish}
              headlights={headlights}
              taillights={taillights}
              spinning={spinning}
              homeKey={nudge}
            />
            <ContactShadows position={[0, 0.012, 0]} opacity={0.7} scale={6.5} blur={2.4} far={2.6} />
            <Studio />
          </Suspense>
          <ViewRig view={view} nudge={nudge} />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={3}
            maxDistance={11}
            // Stop the camera dropping under the floor.
            maxPolarAngle={Math.PI / 2.06}
            target={TARGET}
          />
        </Canvas>
        <span className="car-studio__hint">{t.vehicle.viewerHint}</span>
      </div>

      <div className="car-studio__panel">
        <div className="car-studio__row">
          <span className="car-studio__label">{t.vehicle.viewerFinish}</span>
          <span className="car-studio__value">{label(finish)}</span>
        </div>
        <div className="car-studio__swatches">
          {FINISHES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`car-studio__swatch${item.id === finish.id ? " is-active" : ""}`}
              style={{ background: item.color }}
              aria-label={label(item)}
              aria-pressed={item.id === finish.id}
              onClick={() => setFinish(item)}
            />
          ))}
        </div>

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
