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
  onCeyrek: { tr: "Ön 3/4", en: "Front 3/4", at: [3.05, 1.3, 3.5] },
  yan: { tr: "Yan", en: "Side", at: [0.1, 0.95, 4.9] },
  arkaCeyrek: { tr: "Arka 3/4", en: "Rear 3/4", at: [-3.25, 1.35, 3.4] },
  ust: { tr: "Kuşbakışı", en: "Top", at: [1.6, 4.6, 1.8] },
} satisfies Record<string, ViewPreset>;

type ViewKey = keyof typeof VIEWS;

const TARGET = new THREE.Vector3(0, 0.55, 0);

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
          {/* Fades the far edge of the floor into the background, so the studio
              has no visible horizon seam cutting across the car. */}
          <fog attach="fog" args={["#06070a", 6, 13.5]} />
          <Suspense fallback={null}>
            {/* The environment is built from light panels rather than a drei
                preset, because the presets fetch an HDR from a third-party CDN
                at runtime. Metal and paint still get something to reflect. */}
            <Environment resolution={256}>
              <Lightformer intensity={3.4} position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[9, 4, 1]} />
              <Lightformer intensity={1.2} position={[-5, 2, -3]} scale={[6, 4, 1]} />
              <Lightformer intensity={1.8} color="#9fe7ff" position={[5, 2.4, 3]} scale={[5, 3, 1]} />
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
            <ContactShadows position={[0, 0.01, 0]} opacity={0.75} scale={11} blur={2.6} far={3.2} />
            {/* The floor catches the overhead light as a pool, which is what
                makes it read as a studio rather than a void. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <circleGeometry args={[42, 72]} />
              <meshStandardMaterial color="#0c0e13" roughness={0.55} metalness={0.15} />
            </mesh>
          </Suspense>
          <ViewRig view={view} nudge={nudge} />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={2.6}
            maxDistance={9.5}
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
