import { useState, useEffect } from "react";
import "./App.css";
import Splash from "./assets/Splash/Splash";
import MapTool from "./assets/MapTool/MapTool";
import { listen } from "@tauri-apps/api/event";
import Map from "./assets/Map/Map";

type ViewState = 'splash' | 'map' | 'maptool'

function App() {

  const [currentView, setCurrentView] = useState<ViewState>('splash')

  useEffect(() => {
    //Splash Screen Effects
    const timer = setTimeout(() => {
      setCurrentView('map');
    }, 3000);

    //Listeners
    const unlisten = listen('navigate-to-view', (event) => {
      if (event.payload === 'map-loader') {
        setCurrentView('maptool')
      }
    })
    return () => {
      clearTimeout(timer);
      unlisten.then(f => f());
    }
  }, [])

  return (
    <div>

      <Splash splash={currentView === 'splash'} />
      <MapTool maptool_display={currentView === 'maptool'} setView={setCurrentView} />
      <Map map_display={currentView === 'map'} />
    </div>
  );
}

export default App;
