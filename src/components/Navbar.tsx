import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-black p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center">
        <img src="/Public/Vignanlogo.png" alt="Vignan Logo" className="h-12" />
        </Link>
        <div className="flex gap-8">
          <Link to="/" className="text-white hover:text-yellow-400">Home</Link>
          <Link to="/find-item" className="text-white hover:text-yellow-400">Find item</Link>
          <Link to="/post-item" className="text-white hover:text-yellow-400">Post item</Link>
          <Link to="/my-posts" className="text-white hover:text-yellow-400">My Posts</Link>
          <Link to="/about-us" className="text-white hover:text-yellow-400">About us</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
