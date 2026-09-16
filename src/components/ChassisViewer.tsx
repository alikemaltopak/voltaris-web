import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/voltaris-chassis.glb";

function ChassisModel() {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const isRollbar = child.name === "Rollbar";
    child.material = new THREE.MeshStandardMaterial({
      color: isRollbar ? new THREE.Color("#22d3ee") : new THREE.Color("#9aa3ad"),
      metalness: isRollbar ? 0.55 : 0.75,
      roughness: isRollbar ? 0.3 : 0.4,
    });
    child.castShadow = true;
    child.receiveShadow = true;
  });

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

export function ChassisViewer() {
  return (
    <div className="chassis-viewer">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.2, 1.8, 3.2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Stage adjustCamera={1.35} intensity={0.6} shadows="contact" environment="city">
            <ChassisModel />
          </Stage>
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={7}
          autoRotate={false}
          makeDefault
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
