import Header from "./components/Header";
import HeaderDash from "./components/HeaderDash";
import Households from "./components/Households";
import Visuals from "./components/Visuals";
import ScrollToTop from "./components/ScrollToTop";


export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <Header />
      <HeaderDash />
      <Visuals />
      <Households />
      <ScrollToTop />
    </div>
  );
}
