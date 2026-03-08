'use client'
import React, { useState } from "react";
import { ArrowRight, Users, Heart, Clock, MapPin, Mail, CheckCircle, User, Send, Phone, Briefcase, Shield, Star, Megaphone, Calendar, BookOpen, Target, CreditCard, UserCheck } from "lucide-react";

const AmaechiRegistration = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    state: "",
    nin: "",
    localGovernment: "",
    registeredBy: ""
  });
  const [submitted, setSubmitted] = useState(false);

  // ==================================================================
  // GOOGLE FORM INTEGRATION
  // ==================================================================
  const GOOGLE_FORM_ID = "1FAIpQLSe-8BYnvfHrsZA-w2qgV8e5SILxzDAgzSW5l_nM_Sr14Wor5A";
  const GOOGLE_FORM_ACTION_URL = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;

  const FORM_FIELD_IDS = {
    fullName:        "entry.529931322",
    phone:           "entry.97834466",
    state:           "entry.1321817977",
    nin:             "entry.1736472093",
    localGovernment: "entry.607682730",
    registeredBy:    "entry.2072749341",
  };

  const nigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe",
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
    "Taraba", "Yobe", "Zamfara"
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = document.createElement('form');
    form.action = GOOGLE_FORM_ACTION_URL;
    form.method = 'POST';
    form.target = 'hidden_iframe';

    Object.keys(FORM_FIELD_IDS).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = FORM_FIELD_IDS[key];
      input.value = formData[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setSubmitted(true);

    setTimeout(() => {
      setFormData({ fullName: "", phone: "", state: "", nin: "", localGovernment: "", registeredBy: "" });
    }, 1000);
  };

  const resetForm = () => {
    setFormData({ fullName: "", phone: "", state: "", nin: "", localGovernment: "", registeredBy: "" });
    setSubmitted(false);
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#008751] via-[#006b40] to-[#008751] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF6B35] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-16 lg:px-24 py-24 md:py-32 lg:py-40">
          <div className="max-w-4xl">
            <div className="inline-block mb-6">
              <span className="bg-[#FF6B35] text-white px-6 py-3 rounded-full font-black text-sm tracking-widest">
                JOIN 100,000+ REGISTERED MEMBERS
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-8 drop-shadow-2xl">
              REGISTER<br/>
              FOR PROVEN<br/>
              <span className="text-[#FF6B35]">LEADERSHIP.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/95 leading-relaxed mb-8">
              Be part of Nigeria's transformation. Register today and stand with a leader who has DONE IT before.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="#apply" 
                className="inline-flex items-center gap-3 bg-white text-[#008751] px-10 py-5 hover:bg-white/95 transition-all duration-300 font-bold text-lg tracking-wide group shadow-2xl hover:shadow-3xl rounded-full transform hover:scale-105"
              >
                Register Now
                <Heart size={22} className="group-hover:scale-110 transition-transform duration-300" strokeWidth={3} fill="currentColor" />
              </a>
              <a 
                href="#why" 
                className="inline-flex items-center gap-3 bg-[#FF6B35] text-white px-10 py-5 hover:bg-[#e55a28] transition-all duration-300 font-bold text-lg tracking-wide group rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105"
              >
                Why Register
                <ArrowRight size={22} strokeWidth={3} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section id="apply" className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-16 lg:px-24">
          <div className="text-center mb-12">
            <p className="text-[#008751] font-black tracking-widest mb-4 text-sm">GET STARTED</p>
            <h2 className="text-4xl md:text-6xl font-black mb-6">Complete Your Registration</h2>
          </div>

          {submitted ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-[#008751] rounded-2xl p-12 text-center shadow-2xl">
              <div className="w-24 h-24 bg-[#008751] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={56} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-4xl font-black text-gray-900 mb-6">Registration Successful!</h3>
              <p className="text-xl text-gray-700 mb-4">
                <strong>{formData.fullName}</strong>, thank you for registering with the movement for proven leadership!
              </p>
              <p className="text-lg text-gray-600 mb-4">
                Your registration has been submitted. Our <strong>{formData.state}</strong> team will 
                contact you within 24–48 hours at <strong>{formData.phone}</strong>.
              </p>
              <button
                onClick={resetForm}
                className="bg-[#008751] text-white px-10 py-4 rounded-full font-bold hover:bg-[#006b40] transition-all duration-300 shadow-lg"
              >
                Register Another Member
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl p-8 md:p-12 border-2 border-gray-200">

              {/* Full Name */}
              <div className="mb-6">
                <label className="block text-sm font-black text-gray-900 mb-3 tracking-wide">
                  FULL NAME *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#008751]" size={20} />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Your full legal name"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-[#008751] focus:ring-2 focus:ring-[#008751]/20 focus:outline-none text-gray-900 font-semibold"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="mb-6">
                <label className="block text-sm font-black text-gray-900 mb-3 tracking-wide">
                  PHONE NUMBER *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#008751]" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+234 XXX XXX XXXX"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-[#008751] focus:ring-2 focus:ring-[#008751]/20 focus:outline-none text-gray-900 font-semibold"
                  />
                </div>
              </div>

              {/* State and Local Government */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-3 tracking-wide">
                    STATE *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#008751]" size={20} />
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-[#008751] focus:ring-2 focus:ring-[#008751]/20 focus:outline-none text-gray-900 font-semibold appearance-none bg-white"
                    >
                      <option value="">Select State</option>
                      {nigerianStates.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-900 mb-3 tracking-wide">
                    LOCAL GOVERNMENT AREA *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#008751]" size={20} />
                    <input
                      type="text"
                      name="localGovernment"
                      value={formData.localGovernment}
                      onChange={handleChange}
                      required
                      placeholder="Enter your LGA"
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-[#008751] focus:ring-2 focus:ring-[#008751]/20 focus:outline-none text-gray-900 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* NIN */}
              <div className="mb-6">
                <label className="block text-sm font-black text-gray-900 mb-3 tracking-wide">
                  NATIONAL IDENTIFICATION NUMBER (NIN) *
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#008751]" size={20} />
                  <input
                    type="text"
                    name="nin"
                    value={formData.nin}
                    onChange={handleChange}
                    required
                    maxLength={11}
                    placeholder="11-digit NIN"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-[#008751] focus:ring-2 focus:ring-[#008751]/20 focus:outline-none text-gray-900 font-semibold tracking-widest"
                  />
                </div>
              </div>

              {/* Registered By (optional) */}
              <div className="mb-8">
                <label className="block text-sm font-black text-gray-900 mb-3 tracking-wide">
                  REGISTERED BY <span className="text-gray-400 font-medium">(Optional)</span>
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#008751]" size={20} />
                  <input
                    type="text"
                    name="registeredBy"
                    value={formData.registeredBy}
                    onChange={handleChange}
                    placeholder="Name of person who referred / registered you"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-[#008751] focus:ring-2 focus:ring-[#008751]/20 focus:outline-none text-gray-900 font-semibold"
                  />
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-[#008751] to-[#006b40] text-white py-5 px-8 font-black text-xl tracking-wider hover:from-[#006b40] hover:to-[#008751] transition-all duration-300 rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center gap-3 group"
              >
                <Send size={24} strokeWidth={2.5} />
                COMPLETE REGISTRATION
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
              </button>

              <p className="text-center text-sm text-gray-600 mt-6 font-semibold">
                ✓ Secure submission • ✓ 24–48 hour response • ✓ Fields marked * are required
              </p>
            </form>
          )}

          <iframe name="hidden_iframe" style={{ display: "none" }} title="hidden_iframe" />
        </div>
      </section>
    </div>
  );
};

export default AmaechiRegistration;