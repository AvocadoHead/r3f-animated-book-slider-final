import { Environment, Float, OrbitControls } from "@react-three/drei";
// CORRECT IMPORT: Sibling file in 'src/components/'
import { Book } from "./Book"; 

export const Experience = () => {
  return (
    <>
      <Float
        rotation-x={-Math.PI / 4} // Initial tilt for reading angle
        floatIntensity={0.5}      // Weighted (0.5 is heavier than 1)
        speed={2}                 // Speed of the floating bob
        rotationIntensity={1}     // 1 allows tilting forward/back/side (0.2 was too stiff)
        floatingRange={[-0.1, 0.1]}
      >
        <Book />
      </Float>
      <OrbitControls 
        maxPolarAngle={Math.PI / 2} // Don't go under the floor
        minDistance={3}
        maxDistance={15}
      />
      <Environment preset="studio"></Environment>
      
      {/* Lighting Fix: Balanced to stop right-page washout */}
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
