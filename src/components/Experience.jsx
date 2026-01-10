import { Environment, Float, OrbitControls } from "@react-three/drei";
import { Book } from "./Book"; 

export const Experience = () => {
  return (
    <>
      <Float
        rotation-x={0} // upright, no forward lean by default
        rotation-y={0} 
        rotation-z={0}
        floatIntensity={0.4} // gentle bobbing up/down
        speed={2}
        rotationIntensity={0.2} // very slight rotation
        floatingRange={[-0.1, 0.1]} // keep it centered
      >
        <Book />
      </Float>
      <OrbitControls 
        maxPolarAngle={Math.PI / 2} // Don't go below floor
        minPolarAngle={0} // Allow looking from top
        minDistance={3}
        maxDistance={15}
      />
      <Environment preset="studio"></Environment>
      <directionalLight
        position={[0, 5, 2]} // Centered light to avoid uneven side lighting
        intensity={2.0}
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
