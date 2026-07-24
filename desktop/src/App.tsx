import { useState, useEffect } from "react";
import "./App.css";
import Splash from "./assets/Splash/Splash";

function App() {

  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplash(false)
    }, 3000);

    return () => clearTimeout(timer);
  }, [])

  return (
    <div>

      <Splash splash={splash} />
    </div>
  );
}

export default App;
