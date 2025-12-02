"use client";

import { useMemo, useState } from "react";
import Header from "./components/Header";
import HeaderDash from "./components/HeaderDash";
import Households from "./components/Households";
import Visuals from "./components/Visuals";
import ScrollToTop from "./components/ScrollToTop";

export default function Home() {
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedHousehold((current) => (current === id ? null : id));
  };

  const selectedLabel = useMemo(
    () => (selectedHousehold ? `Focused on ${selectedHousehold}` : "All households"),
    [selectedHousehold],
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <Header />
      <HeaderDash selectedHousehold={selectedHousehold} contextLabel={selectedLabel} />
      <Visuals selectedHousehold={selectedHousehold} contextLabel={selectedLabel} />
      <Households selectedId={selectedHousehold} onSelect={handleSelect} />
      <ScrollToTop />
    </div>
  );
}
