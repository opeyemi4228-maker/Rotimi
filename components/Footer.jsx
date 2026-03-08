'use client'
import React, { useState } from "react";

const ArrowRight = ({ size = 24, strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const Footer = () => {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted:", { email, zip });
    alert(`Thank you for staying connected.`);
    setEmail("");
    setZip("");
  };

  return (
    <footer className="w-full">
      {/* Red Top Bar */}
      <div className="bg-[#008751] h-6"></div>

      {/* White Section with Social Icons */}
      <div className="bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <h1 className="font-bold text-2xl">Follow Us on our Social Media</h1>
            <a href="https://x.com/map9ja?s=11" className="hover:opacity-70 transition-opacity duration-300" aria-label="X">
              <img src="https://img.icons8.com/ios-filled/100/twitterx--v1.png" alt="X" className="w-12 h-12" />
            </a>
            <a href="https://www.tiktok.com/@map.9ja?_r=1&_t=ZS-94FStXknDvN" className="hover:opacity-70 transition-opacity duration-300" aria-label="TikTok">
              <img src="https://img.icons8.com/ios-filled/100/tiktok--v1.png" alt="TikTok" className="w-12 h-12" />
            </a>
            <a href="https://www.facebook.com/profile.php?id=61588365249213" className="hover:opacity-70 transition-opacity duration-300" aria-label="Facebook">
              <img src="https://img.icons8.com/ios-filled/100/facebook-new.png" alt="Facebook" className="w-12 h-12" />
            </a>
            <a href="https://www.instagram.com/map.9ja?igsh=MTViMGhkOXlla2w4YQ==" className="hover:opacity-70 transition-opacity duration-300" aria-label="Instagram">
              <img src="https://img.icons8.com/ios-filled/100/instagram-new--v1.png" alt="Instagram" className="w-12 h-12" />
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity duration-300" aria-label="YouTube">
              <img src="https://img.icons8.com/ios-filled/100/youtube-play.png" alt="YouTube" className="w-12 h-12" />
            </a>
          </div>
        </div>
      </div>

      {/* Navy Blue Section */}
      <div className="bg-[#631c02] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          
          {/* Stay Connected Section */}
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-6">Stay Connected</h3>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
              <input
                type="email"
                placeholder="ENTER YOUR EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-transparent border-2 border-white text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:border-white text-sm font-semibold tracking-wide"
                required
              />
              <input
                type="text"
                placeholder="YOUR CITY / STATE"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full sm:w-40 px-4 py-3 bg-transparent border-2 border-white text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:border-white text-sm font-semibold tracking-wide"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-transparent hover:bg-white hover:text-[#2B4075] border-2 border-white transition-all duration-300 flex items-center justify-center gap-2"
                aria-label="Submit"
              >
                <ArrowRight size={20} strokeWidth={2.5} />
              </button>
            </form>
          </div>

          {/* Horizontal Line */}
          <div className="border-t border-white/30 mb-8"></div>

          {/* Footer Links and Info */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            
            {/* Left Side - Disclaimer */}
            <div className="flex-1">
              <p className="text-xs text-white/90 bg-[#a93207] px-4 py-2 inline-block mb-4">
                This platform is dedicated to leadership, public service, and national development.
              </p>
              <p className="text-xs text-white/80 leading-relaxed">
                Content on this website reflects ideas, initiatives, and engagements focused on governance, infrastructure development, education, transportation reform, and nation-building.
              </p>
            </div>

            {/* Right Side - Footer Links */}
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="text-white hover:text-white/80 transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="text-white hover:text-white/80 transition-colors duration-200">
                Terms of Use
              </a>
              <a href="#" className="text-white hover:text-white/80 transition-colors duration-200">
                Media & Press
              </a>
              <a href="#" className="text-white hover:text-white/80 transition-colors duration-200">
                Public Engagements
              </a>
              <a href="#" className="text-white hover:text-white/80 transition-colors duration-200">
                © Chibuike Rotimi Amaechi
              </a>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
