import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Product from "@/pages/Product";
import Selections from "@/pages/Selections";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/selections" element={<Selections />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster theme="dark" position="top-center" />
    </>
  );
}
