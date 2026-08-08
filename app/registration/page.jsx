'use client'
import React, { useState } from "react";
import { ArrowRight, Users, Heart, Clock, MapPin, Mail, CheckCircle, User, Send, Phone, Briefcase, Shield, Star, Megaphone, Calendar, BookOpen, Target, CreditCard, UserCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { assets } from "@/assets/assets";
import { useGeography } from "@/lib/useGeography";

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

  const geo = useGeography(formData.state, formData.localGovernment);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
      // An LGA belongs to one state, so changing the state drops it.
      ...(name === "state" ? { localGovernment: "" } : null),
    }));
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
      <PageHeader
        breadcrumb="Registration"
        kicker="Become part of the movement"
        title="Register as a supporter."
        lead="Add your name, your ward and your state. Organisers use this to build the structure, ward by ward, LGA by LGA."
        image={assets.Amaechi8}
      />

      {/* Registration Form */}
      <section id="apply" className="section bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-16 lg:px-24">
          <div className="mb-12 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">GET STARTED</p>
            <h2 className="text-fluid-4xl mb-6">Complete Your Registration</h2>
          </div>

          {submitted ? (
            <div className="bg-linear-to-br from-brand-50 to-brand-50 border-4 border-brand-600 p-12 text-center shadow-e2">
              <div className="w-24 h-24 bg-brand-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={56} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-4xl font-extrabold text-ink-950 mb-6">Registration Successful!</h3>
              <p className="text-xl text-ink-700 mb-4">
                <strong>{formData.fullName}</strong>, thank you for registering with the movement for proven leadership!
              </p>
              <p className="text-lg text-ink-600 mb-4">
                Your registration has been submitted. Our <strong>{formData.state}</strong> team will 
                contact you within 24 to 48 hours at <strong>{formData.phone}</strong>.
              </p>
              <button
                onClick={resetForm}
                className="bg-brand-600 text-white px-10 py-4 font-bold hover:bg-brand-700 transition-all duration-300 shadow-e2"
              >
                Register Another Member
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white shadow-e2 p-8 md:p-12 border border-ink-200">

              {/* Full Name */}
              <div className="mb-6">
                <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                  FULL NAME *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Your full legal name"
                    className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="mb-6">
                <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                  PHONE NUMBER *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+234 XXX XXX XXXX"
                    className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold"
                  />
                </div>
              </div>

              {/* State and Local Government */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                    STATE *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold appearance-none bg-white"
                    >
                      <option value="">Select State</option>
                      {nigerianStates.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                    LOCAL GOVERNMENT AREA *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                    {/* Picked from the INEC list for the chosen state, never
                        typed, so "Aba North" does not reach the sheet as
                        "aba north", "Aba-North" and "ABA NORTH". */}
                    <select
                      name="localGovernment"
                      value={formData.localGovernment}
                      onChange={handleChange}
                      required
                      disabled={!formData.state || !geo.ready}
                      className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold appearance-none bg-white disabled:bg-ink-50 disabled:text-ink-400"
                    >
                      <option value="">
                        {!formData.state
                          ? "Select your state first"
                          : geo.loading
                            ? "Loading LGAs…"
                            : geo.error
                              ? "Could not load LGAs — reselect your state"
                              : "Select LGA"}
                      </option>
                      {geo.lgas.map((lga) => (
                        <option key={lga} value={lga}>{lga}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* NIN */}
              <div className="mb-6">
                <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                  NATIONAL IDENTIFICATION NUMBER (NIN) *
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                  <input
                    type="text"
                    name="nin"
                    value={formData.nin}
                    onChange={handleChange}
                    required
                    maxLength={11}
                    placeholder="NIN, 11 digits"
                    className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold tracking-widest"
                  />
                </div>
              </div>

              {/* Registered By (optional) */}
              <div className="mb-8">
                <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                  REGISTERED BY <span className="text-ink-400 font-medium">(Optional)</span>
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                  <input
                    type="text"
                    name="registeredBy"
                    value={formData.registeredBy}
                    onChange={handleChange}
                    placeholder="Name of person who referred / registered you"
                    className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold"
                  />
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="w-full bg-linear-to-r from-brand-600 to-brand-700 text-white py-5 px-8 font-extrabold text-xl tracking-wider hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-e2 hover:shadow-e2 flex items-center justify-center gap-3 group"
              >
                <Send size={24} strokeWidth={2.5} />
                COMPLETE REGISTRATION
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
              </button>

              <p className="text-center text-sm text-ink-600 mt-6 font-semibold">
                ✓ Secure submission • ✓ 24 to 48 hour response • ✓ Fields marked * are required
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