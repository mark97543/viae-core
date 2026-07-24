import "./Splash.css";

const Splash = ({ splash }: { splash: boolean }) => {

    return (
        <div className="Splash_Screen_Wrapper" style={{ display: splash ? "block" : "none" }}>
            <img src="./Banner.svg" alt="Iter Viae" />
        </div>

    )
}

export default Splash;
