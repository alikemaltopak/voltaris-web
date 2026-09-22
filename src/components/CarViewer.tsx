import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useLanguage } from "../context/LanguageContext";

const MODEL_URL = "/models/voltaris-arac.glb";

/** Does this browser have a working WebGL context at all? */
function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function Car({ spinning }: { spinning: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    // The materials are authored in Blender and carried in the file, so the
    // only thing left is to let the body and rims pick up the environment.
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const material = child.material as THREE.MeshStandardMaterial;
      if (material) material.envMapIntensity = 1.15;
    });
  }, [scene]);

  useFrame((_, delta) => {
    if (spinning && group.current) group.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

export function CarViewer() {
  const { t } = useLanguage();
  const [supported] = useState(webglAvailable);
  const [spinning, setSpinning] = useState(true);

  if (!supported) {
    return (
      <div className="car-viewer car-viewer--fallback">
        <p>{t.vehicle.viewerUnsupported}</p>
      </div>
    );
  }

  return (
    <div
      className="car-viewer"
      onPointerDown={() => setSpinning(false)}
      onWheel={() => setSpinning(false)}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.0, 1.7, 4.5], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* The environment is built from light panels rather than a preset,
              because the presets fetch an HDR from a third-party CDN at
              runtime. Metal and paint still get something to reflect. */}
          <Environment resolution={256}>
            <Lightformer intensity={2.6} position={[0, 4, 1]} scale={[8, 3, 1]} />
            <Lightformer intensity={1.1} position={[-4, 2, -3]} scale={[6, 4, 1]} />
            <Lightformer
              intensity={1.9}
              color="#9fe7ff"
              position={[4, 2.2, 3]}
              scale={[5, 3, 1]}
            />
            <Lightformer intensity={0.5} position={[0, -3, 0]} scale={[10, 6, 1]} />
          </Environment>
          {/* No shadow map on this one: across a 3 m car it produced acne
              striping over the bodywork, and ContactShadows already grounds
              the car. */}
          <directionalLight position={[4.5, 6, 3]} intensity={1.5} />
          <ambientLight intensity={0.25} />
          <Car spinning={spinning} />
          <ContactShadows position={[0, 0.01, 0]} opacity={0.62} scale={9} blur={2.4} far={3} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={2.8}
          maxDistance={9}
          // Stop the camera dropping under the ground plane.
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.6, 0]}
        />
      </Canvas>
      <span className="car-viewer__hint">{t.vehicle.viewerHint}</span>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
