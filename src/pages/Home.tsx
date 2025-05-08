import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-6xl font-bold mb-8">Lost and Found</h1>
        <Link
          to="/find-item"
          className="inline-block px-8 py-3 bg-white text-black rounded hover:bg-yellow-400 transition-colors"
        >
          Find Item
        </Link>
      </div>
    </div>
  );
}

export default Home;