import { useState, useEffect } from "react";
import "./App.css";
import Splash from "./components/splash/Splash.tsx";
import MapTool from "./components/maptool/MapTool.tsx";
import MapContainer from "./components/map/MapContainer.tsx";
import MobileNavApp from "./components/mobile/MobileNavApp.tsx";
import { listen } from "@tauri-apps/api/event";

type ViewState = 'splash' | 'map' | 'maptool';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('splash');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return (
      window.innerWidth <= 768 ||
      navigator.userAgent.toLowerCase().includes('android') ||
      navigator.userAgent.toLowerCase().includes('iphone')
    );
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
        navigator.userAgent.toLowerCase().includes('android') ||
        navigator.userAgent.toLowerCase().includes('iphone')
      );
    };

    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      setCurrentView('map');
    }, 3000);

    const unlisten = listen('navigate-to-view', (event) => {
      if (event.payload === 'map-loader') {
        setCurrentView('maptool');
      }
    });

    const handleOpenMapTool = () => setCurrentView('maptool');
    window.addEventListener('open-maptool', handleOpenMapTool);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      unlisten.then(f => f());
      window.removeEventListener('open-maptool', handleOpenMapTool);
    };
  }, []);

  if (isMobile) {
    return <MobileNavApp initialMapName="district-of-columbia-260723.mbtiles" />;
  }

  return (
    <div>
      <Splash splash={currentView === 'splash'} />
      <MapTool maptool_display={currentView === 'maptool'} setView={setCurrentView} />
      <MapContainer map_display={currentView === 'map'} />
    </div>
  );
}

export default App;
