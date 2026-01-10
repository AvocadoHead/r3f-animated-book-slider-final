import { Environment, Float, OrbitControls } from "@react-three/drei";
// CORRECT IMPORT: Book is in the same folder as Experience
import { Book } from "./Book"; 

export const Experience = () => {
  return (
    <>
      <Float
        rotation-x={-0.1}
        floatIntensity={0.2}
        speed={2}
        rotationIntensity={0.5}
      >
        <Book />
      </Float>
      <OrbitControls 
        maxPolarAngle={Math.PI / 2} 
        minDistance={3}
        maxDistance={15}
      />
      <Environment preset="studio"></Environment>
      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
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
