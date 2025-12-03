import React from "react";
import Navbar from "./components/Navbar";
import ProductsPage from "./pages/ProductsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MePage from "./pages/MePage";
import CartPage from "./pages/CartPage";
import { CartProvider } from "./context/CartContext";
import OrdersPage from "./pages/OrdersPage";
import GeoPage from "./pages/GeoPage";
import ProductDetailPage from "./pages/ProductDetailPage";

function App() {
  const path = window.location.pathname;

  let Page = ProductsPage;
  if (path === "/login") Page = LoginPage;
  else if (path === "/register") Page = RegisterPage;
  else if (path === "/me") Page = MePage;
  else if (path === "/cart") Page = CartPage;
  else if (path === "/orders") Page = OrdersPage;
  else if (path === "/geo") Page = GeoPage;
  else if (path === "/product") Page = ProductDetailPage;

  return (
    <CartProvider>
      <Navbar />
      <Page />
    </CartProvider>
  );
}



export default App;
