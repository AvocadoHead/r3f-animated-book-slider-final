import { Canvas } from "@react-three/fiber";
import { useState, useMemo } from "react";
import { useAtom } from "jotai";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { DefaultBookLoader } from "./components/DefaultBookLoader";
import { LoadingScreen } from "./components/LoadingScreen";
import { AuthCallback } from "./components/AuthCallback";
import { SharedBookLoader } from "./components/SharedBookLoader";
import { displaySettingsAtom } from "./store/atoms";

// Simple path parser
const getRouteInfo = () => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // /auth/callback
  if (path === '/auth/callback') {
    return { route: 'auth-callback' };
  }

  // Check for ?book=id query parameter
  const bookIdFromQuery = params.get('book');
  if (bookIdFromQuery) {
    return { route: 'shared-book', bookId: bookIdFromQuery };
  }

  // /book/:id (path-based route)
   const bookMatch = path.match(/^\/book\/([a-zA-Z0-9-]+)$/);
  if (bookMatch) {
    return { route: 'shared-book', bookId: bookMatch[1] };
  }

  // Default home
  return { route: 'home' };
}; 
// ^^^ The extra }; was here. It is now gone.

function App() {
  const [loading, setLoading] = useState(true);
  const routeInfo = useMemo(() => getRouteInfo(), []);
  const [displaySettings] = useAtom(displaySettingsAtom);

  // Handle auth callback
  if (routeInfo.route === 'auth-callback') {
    return <AuthCallback />;
  }

  const isSharedBook = routeInfo.route === 'shared-book';

  // Build CSS filter for contrast adjustment
  const canvasFilter = displaySettings.contrast !== 1.0
    ? `contrast(${displaySettings.contrast})`
    : 'none';

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
        camera={{ position: [-0.3, 0.8, 2.8], fov: 45 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          filter: canvasFilter
        }}
      >
        <Experience />
      </Canvas>
    </>
  );
}

export default App;
