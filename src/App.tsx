import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import FindItem from './pages/FindItem';
import PostItem from './pages/PostItem';
import MyPosts from './pages/MyPosts';
import AboutUs from './pages/AboutUs';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/find-item" element={<FindItem />} />
          <Route path="/post-item" element={<PostItem />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/about-us" element={<AboutUs />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;