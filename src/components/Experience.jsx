import { Environment, Float, OrbitControls } from "@react-three/drei";
import { Book } from "./Book"; 

export const Experience = () => {
  return (
    <>
      <Float
        rotation-x={-Math.PI / 4} // Initial tilt
        floatIntensity={0.5}      // Weighted feel
        speed={2}                 
        rotationIntensity={1}     // Allows tilting
        floatingRange={[-0.1, 0.1]}
      >
        <Book />
      </Float>
      <OrbitControls 
        maxPolarAngle={Math.PI / 2} 
        minDistance={3}
        maxDistance={15}
      />
      <Environment preset="studio"></Environment>
      
      <ambientLight intensity={1.5} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={1} 
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
