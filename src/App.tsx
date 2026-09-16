import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ElectricField } from "./components/ElectricField";
import { SmoothScroll } from "./components/SmoothScroll";
import { CustomCursor } from "./components/CustomCursor";
import { Home } from "./pages/Home";
import { Team } from "./pages/Team";
import { Vehicle } from "./pages/Vehicle";
import { Applications } from "./pages/Applications";
import { Sponsors } from "./pages/Sponsors";
import { Contact } from "./pages/Contact";

function Layout() {
  return (
    <>
      <SmoothScroll />
      <ElectricField />
      <CustomCursor />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/takim" element={<Team />} />
          <Route path="/arac" element={<Vehicle />} />
          <Route path="/basvurular" element={<Applications />} />
          <Route path="/sponsorlar" element={<Sponsors />} />
          <Route path="/iletisim" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
