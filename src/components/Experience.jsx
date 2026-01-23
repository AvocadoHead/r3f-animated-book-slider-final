import { Environment, Float, OrbitControls } from "@react-three/drei";
import { useAtom } from "jotai";
import { Book } from "./Book";
import { displaySettingsAtom } from "../store/atoms";

export const Experience = () => {
  const [displaySettings] = useAtom(displaySettingsAtom);
  const wobble = displaySettings.wobble;
  const brightness = displaySettings.brightness;
  const envIntensity = displaySettings.envIntensity ?? 0.5;

  return (
    <>
      <Float
        rotation-x={-Math.PI / 4}
        floatIntensity={0.1 * wobble}
        speed={1 * wobble}
        rotationIntensity={0.2 * wobble}
        floatingRange={[-0.02 * wobble, 0.02 * wobble]}
      >
        <Book />
      </Float>
      <OrbitControls
        maxPolarAngle={Math.PI / 2}
        minDistance={1.5}
        maxDistance={12}
      />
      <Environment preset="studio" environmentIntensity={envIntensity} />

      <ambientLight intensity={1.5 * brightness} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={1 * brightness}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};
