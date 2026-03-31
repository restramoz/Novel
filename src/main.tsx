import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import CreateNovel from "./pages/CreateNovel";
import NovelDetail from "./pages/NovelDetail";
import ReaderPage from "./pages/ReaderPage";
import MusicPlayer from "./components/MusicPlayer";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"                          element={<App />} />
        <Route path="/create"                    element={<CreateNovel />} />
        <Route path="/novel/:id"                 element={<NovelDetail />} />
        <Route path="/novel/:id/read/:chapterId" element={<ReaderPage />} />
      </Routes>
      <MusicPlayer /> {/* Di luar Routes — tidak unmount saat navigasi */}
    </BrowserRouter>
  </React.StrictMode>
);
