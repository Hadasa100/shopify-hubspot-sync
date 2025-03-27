import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram } from 'react-icons/fa';

function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#0e0b0f] via-[#2c0a3a] to-[#000000] text-white overflow-hidden">
      {/* Glow background circles */}
      <div className="absolute -top-20 -left-32 w-[600px] h-[600px] bg-fuchsia-500/20 rounded-full blur-[180px] z-0"></div>
      <div className="absolute -bottom-20 -right-32 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[160px] z-0"></div>

      {/* Content */}
      <div className="z-10 text-center px-4 max-w-xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl uppercase tracking-widest font-light leading-tight mb-6">
          Shopify–HubSpot Sync
        </h1>
        <p className="text-lg text-white/70 mb-12">
          Sync your Shopify product to HubSpot
        </p>

        {/* Button Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <Link to="/sync-sku" className="glow-btn">Sync by Product SKUs</Link>
          <Link to="/sync-all" className="glow-btn">Sync All Products</Link>
          <Link to="/sync-dates" className="glow-btn">Sync Product by Dates</Link>
          <a href="https://app.hubspot.com/contacts/49511833/objects/0-7/views/all/list" target="_blank" rel="noopener noreferrer" className="glow-btn">All HP Products</a>
        </div>

        {/* Footer */}
        <footer className="flex justify-center items-center gap-2 text-pink-400 text-sm">
          <FaInstagram />
          <span>@leibish</span>
        </footer>
      </div>
    </div>
  );
}

export default HomePage;
