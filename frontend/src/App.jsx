import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup"; // 또는 ./Signup
import Login from "./pages/Login";   // 또는 ./Login
import Dashboard from "./pages/Dashboard"; // 또는 ./Dashboard

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;
