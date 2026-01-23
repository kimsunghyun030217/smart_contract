import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyPage from "./pages/MyPage";
import SellPage from "./pages/SellPage";
import BuyPage from "./pages/BuyPage";
import OrdersPage from "./pages/OrdersPage"; // ✅ 추가

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/sell" element={<SellPage />} />
        <Route path="/buy" element={<BuyPage />} />

        <Route path="/orders" element={<OrdersPage />} /> {/* ✅ 추가 */}

        <Route path="/mypage" element={<MyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
