import { Canvas } from "@react-three/fiber";
import { useState, useMemo } from "react";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { DefaultBookLoader } from "./components/DefaultBookLoader";
import { LoadingScreen } from "./components/LoadingScreen";
import { AuthCallback } from "./components/AuthCallback";
import { SharedBookLoader } from "./components/SharedBookLoader";

// Simple path parser
const getRouteInfo = () => {
  const path = window.location.pathname;

  // /auth/callback
  if (path === '/auth/callback') {
    return { route: 'auth-callback' };
  }

  // /book/:id
  const bookMatch = path.match(/^\/book\/([a-zA-Z0-9-]+)$/);
  if (bookMatch) {
    return { route: 'shared-book', bookId: bookMatch[1] };
  }

  // Default home
  return { route: 'home' };
};

function App() {
  const [loading, setLoading] = useState(true);
  const routeInfo = useMemo(() => getRouteInfo(), []);

  // Handle auth callback
  if (routeInfo.route === 'auth-callback') {
    return <AuthCallback />;
  }

  const isSharedBook = routeInfo.route === 'shared-book';

  return (
    <>
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}

      {/* Load appropriate content based on route */}
      {isSharedBook ? (
        <SharedBookLoader bookId={routeInfo.bookId} />
      ) : (
        <DefaultBookLoader />
      )}

      <UI />
      <Canvas
        shadows
        camera={{ position: [-0.5, 1, 4], fov: 45 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      >
        <Experience />
      </Canvas>
    </>
  );
}

export default App;
