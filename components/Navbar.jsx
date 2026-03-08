'use client'
import React, { useState } from "react";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      {/* Green Top Banner */}
      <div className="bg-[#008751] text-white text-center transition-all duration-300 ease-in-out origin-top translate-y-0 opacity-100">
        <p className="text-sm md:text-base font-bold py-2">
          Powered by Movement for Amaechi Presidency ( MAP )
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="font-bold text-xl text-[#008751]">
                Rt. Hon. Rotimi Amaechi.
              </h1>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-8">
              <a
                href="/"
                className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm transition-colors duration-200"
              >
                HOME
              </a>
              <a
                href="governance"
                className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm transition-colors duration-200"
              >
                THE JOURNEY
              </a>
              <a
                href="planforchange"
                className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm transition-colors duration-200"
              >
                PLAN FOR CHANGE
              </a>
              <a
                href="connect"
                className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm transition-colors duration-200"
              >
                CONNECT
              </a>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href="https://adc.org.ng/membership"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#008751] text-white px-8 py-3 rounded-md font-bold text-sm tracking-wider hover:bg-[#006b40] transition-all duration-300 shadow-md hover:shadow-lg"
              >
                ADC PARTY REGISTRATION
              </a>
              <a
                href="registration"
                className="bg-[#FF6B35] text-white px-8 py-3 rounded-md font-bold text-sm tracking-wider hover:bg-[#e55a28] transition-all duration-300 shadow-md hover:shadow-lg"
              >
                REGISTRATION
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-[#008751] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden py-6 border-t border-gray-200">
              <div className="flex flex-col gap-4">
                <a
                  href="/"
                  className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm py-2 transition-colors duration-200"
                >
                  HOME
                </a>
                <a
                  href="governance"
                  className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm py-2 transition-colors duration-200"
                >
                  THE JOURNEY
                </a>
                <a
                  href="planforchange"
                  className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm py-2 transition-colors duration-200"
                >
                  PLAN FOR CHANGE
                </a>
                <a
                  href="connect"
                  className="text-gray-700 hover:text-[#008751] font-medium tracking-wide text-sm py-2 transition-colors duration-200"
                >
                  CONNECT
                </a>

                <div className="flex flex-col gap-3 mt-4">
                  <a
                    href="https://adc.org.ng/membership"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#008751] text-white px-6 py-3 rounded-md font-bold text-sm tracking-wider hover:bg-[#006b40] transition-all duration-300 text-center shadow-md"
                  >
                    ADC PARTY REGISTRATION
                  </a>
                  <a
                    href="registration"
                    className="bg-[#FF6B35] text-white px-6 py-3 rounded-md font-bold text-sm tracking-wider hover:bg-[#e55a28] transition-all duration-300 text-center shadow-md"
                  >
                    REGISTRATION
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;