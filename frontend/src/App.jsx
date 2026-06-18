import { useState } from "react";
import Landing from "./Landing";
import AppFlow from "./AppFlow";

export default function App() {
  const [page, setPage] = useState("landing");

  return page === "landing"
    ? <Landing onLaunch={() => setPage("app")} />
    : <AppFlow onBack={() => setPage("landing")} />;
}
