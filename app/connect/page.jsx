'use client'
import React, { useState } from "react";
import { ArrowRight, ArrowUpRight, Mail, Phone, MapPin, Send, MessageSquare, User, Building2, Clock, Globe, CheckCircle, Calendar, FileText, Users, Briefcase, Heart, Megaphone, HandshakeIcon, Target } from "lucide-react";
import BrandIcon from "@/components/ui/BrandIcon";
import { socials } from "@/lib/site";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { assets } from "@/assets/assets";

const AmaechiConnect = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
    lga: "",
    category: "",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Campaign Email",
      primary: "contact@amaechi2027.ng",
      secondary: "volunteer@amaechi2027.ng",
      color: "bg-brand-600"
    },
    {
      icon: Phone,
      title: "Campaign Hotline",
      primary: "+234 803 ADC 2027",
      secondary: "WhatsApp: +234 806 AMAECHI",
      color: "bg-ember-500"
    },
    {
      icon: MapPin,
      title: "Campaign Headquarters",
      primary: "Abuja: Plot 456, Central District",
      secondary: "36 State Offices Nationwide",
      color: "bg-brand-600"
    },
    {
      icon: Clock,
      title: "Contact Hours",
      primary: "24/7 Hotline Available",
      secondary: "Office: Mon to Sat, 8AM to 8PM",
      color: "bg-ember-500"
    }
  ];

  const engagementOptions = [
    {
      icon: Users,
      title: "Volunteer with Us",
      description: "Join 100,000+ volunteers mobilizing for change. Door to door, phone banking, events.",
      action: "Sign Up to Volunteer",
      color: "from-brand-600 to-brand-700"
    },
    {
      icon: Heart,
      title: "Support the Campaign",
      description: "Your donation funds grassroots organizing, town halls, and voter education.",
      action: "Donate Now",
      color: "from-ember-500 to-ember-600"
    },
    {
      icon: Megaphone,
      title: "Become an Advocate",
      description: "Share our message on social media. Talk to friends, family, neighbors about the Amaechi Agenda.",
      action: "Get Resources",
      color: "from-brand-600 to-brand-700"
    },
    {
      icon: HandshakeIcon,
      title: "Partnership Opportunities",
      description: "Corporate partnerships, CSR collaborations, and strategic initiatives with proven leadership.",
      action: "Partner with Us",
      color: "from-ember-500 to-ember-600"
    }
  ];

  const inquiryCategories = [
    {
      icon: Users,
      title: "Volunteer & Activism",
      description: "Join grassroots organizing, door to door campaigns, phone banking"
    },
    {
      icon: MessageSquare,
      title: "Media & Press",
      description: "Interview requests, press credentials, media partnership"
    },
    {
      icon: Briefcase,
      title: "Corporate Partnership",
      description: "CSR collaborations, sponsorships, business alliances"
    },
    {
      icon: Target,
      title: "Policy & Research",
      description: "Policy input, research collaboration, expert consultation"
    },
    {
      icon: Calendar,
      title: "Town Hall & Events",
      description: "Request town hall in your community, speaking engagements"
    },
    {
      icon: FileText,
      title: "General Inquiries",
      description: "Questions, feedback, suggestions for the campaign"
    }
  ];

  /* Real handles, sourced from lib/site so the footer and this page can never
     drift apart. lucide-react v1 dropped its brand glyphs, so these render
     through the shared <BrandIcon> marks. */
  const socialMedia = [
    { brand: "x", name: "X", handle: "@map9ja", url: socials.find((s) => s.icon === "x")?.href ?? "#" },
    { brand: "facebook", name: "Facebook", handle: "Movement for Amaechi Presidency", url: socials.find((s) => s.icon === "facebook")?.href ?? "#" },
    { brand: "instagram", name: "Instagram", handle: "@map.9ja", url: socials.find((s) => s.icon === "instagram")?.href ?? "#" },
    { brand: "tiktok", name: "TikTok", handle: "@map.9ja", url: socials.find((s) => s.icon === "tiktok")?.href ?? "#" }
  ];

  const stateOffices = [
    {
      zone: "North Central",
      states: ["FCT Abuja", "Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
      headquarters: "Abuja Campaign HQ",
      address: "Plot 456, Central Business District, Abuja",
      phone: "+234 803 111 1111",
      isMain: true
    },
    {
      zone: "South South",
      states: ["Rivers", "Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo"],
      headquarters: "Port Harcourt Regional Office",
      address: "Trans Amadi Industrial Layout, Port Harcourt, Rivers State",
      phone: "+234 803 222 2222",
      isMain: false
    },
    {
      zone: "South West",
      states: ["Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
      headquarters: "Lagos Regional Office",
      address: "Victoria Island, Lagos State",
      phone: "+234 803 333 3333",
      isMain: false
    },
    {
      zone: "South East",
      states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
      headquarters: "Enugu Regional Office",
      address: "Independence Layout, Enugu State",
      phone: "+234 803 444 4444",
      isMain: false
    },
    {
      zone: "North West",
      states: ["Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara", "Jigawa"],
      headquarters: "Kaduna Regional Office",
      address: "Kaduna South, Kaduna State",
      phone: "+234 803 555 5555",
      isMain: false
    },
    {
      zone: "North East",
      states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
      headquarters: "Bauchi Regional Office",
      address: "GRA, Bauchi State",
      phone: "+234 803 666 6666",
      isMain: false
    }
  ];

  const volunteerBenefits = [
    "Direct impact on Nigeria's future",
    "Training in political organizing",
    "Access to exclusive campaign events",
    "Certificate of volunteer service",
    "Network with fellow patriots",
    "Meet Rt. Hon. Amaechi"
  ];

  return (
    <div className="bg-white">
      <PageHeader
        breadcrumb="Connect"
        kicker="Join the movement"
        title="Connect. Engage. Transform."
        lead="Find your chapter, reach the campaign, or bring a town hall to your community. Six zonal offices and organisers in all 36 states."
        image={assets.Camp2}
      >
        <div className="flex flex-col sm:flex-row">
          <Button href="#contact-form" variant="inverse" size="lg">
            Send a message
          </Button>
          <Button href="#offices" variant="inverseOutline" size="lg" className="sm:-ml-0.5">
            Find your office
          </Button>
        </div>
      </PageHeader>

      {/* Quick Contact Info */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-8 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
                >
                  <div className={`w-16 h-16 ${info.color} flex items-center justify-center mb-6 shadow-e2`}>
                    <Icon size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-extrabold text-ink-950 mb-4">
                    {info.title}
                  </h3>
                  <p className="text-sm text-ink-950 mb-2 font-bold">
                    {info.primary}
                  </p>
                  <p className="text-sm text-ink-600 font-semibold">
                    {info.secondary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Engagement Options */}
      <section id="volunteer" className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">GET INVOLVED</p>
            <h2 className="text-fluid-4xl mb-6">Ways to Make a Difference</h2>
            <p className="prose-body">
              Every contribution counts. Choose how you want to be part of Nigeria&rsquo;s transformation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {engagementOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <div 
                  key={index}
                  className={`bg-linear-to-br ${option.color} p-8 md:p-10 text-white hover:shadow-e2 transition-all duration-300 motion-safe:hover:-translate-y-0.5`}
                >
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                    <Icon size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-extrabold mb-4">
                    {option.title}
                  </h3>
                  <p className="text-lg text-white/90 leading-relaxed mb-8">
                    {option.description}
                  </p>
                  <button className="bg-white text-brand-600 px-8 py-4 font-bold hover:bg-white/95 transition-all duration-300 shadow-e2 hover:shadow-e2 inline-flex items-center gap-3">
                    {option.action}
                    <ArrowRight size={20} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Volunteer Benefits */}
          <div className="bg-white shadow-e2 p-8 md:p-12 border-2 border-brand-600">
            <h3 className="text-3xl font-extrabold text-center mb-8">Why Volunteer?</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {volunteerBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white p-4">
                  <CheckCircle className="text-brand-600 shrink-0" size={24} strokeWidth={3} />
                  <p className="font-semibold text-ink-950">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="section bg-white">
        <div className="shell shell-wide">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="mb-12">
                <h2 className="text-fluid-4xl mb-4">Send Us a Message</h2>
                <p className="prose-body">
                  Questions? Ideas? Want to get involved? We&rsquo;re listening.
                </p>
              </div>

              {submitted ? (
                <div className="bg-linear-to-br from-brand-50 to-brand-50 border-4 border-brand-600 p-12 text-center">
                  <div className="w-24 h-24 bg-brand-600 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={56} className="text-white" strokeWidth={3} />
                  </div>
                  <h3 className="text-4xl font-extrabold text-ink-950 mb-6">Thank You for Reaching Out!</h3>
                  <p className="text-xl text-ink-700 mb-8">
                    Your message has been received. Our team will respond within 24 hours. Together, we&rsquo;re building a better Nigeria.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        state: "",
                        lga: "",
                        category: "",
                        message: ""
                      });
                    }}
                    className="bg-brand-600 text-white px-10 py-4 font-bold hover:bg-brand-700 transition-all duration-300 shadow-e2"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white shadow-e2 p-8 md:p-12 border border-ink-200">
                  {/* Name and Email */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                        FULL NAME *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="Your full name"
                          className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                        EMAIL ADDRESS *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="your.email@example.com"
                          className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone and State */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
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

                    <div>
                      <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                        YOUR STATE *
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
                          <option value="">Select your state</option>
                          <option value="abia">Abia</option>
                          <option value="fct">FCT Abuja</option>
                          <option value="lagos">Lagos</option>
                          <option value="rivers">Rivers</option>
                          {/* Add all 36 states */}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LGA and Category */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                        LOCAL GOVERNMENT
                      </label>
                      <input
                        type="text"
                        name="lga"
                        value={formData.lga}
                        onChange={handleChange}
                        placeholder="Your LGA"
                        className="w-full px-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                        INQUIRY TYPE *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600" size={20} />
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          required
                          className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 font-semibold appearance-none bg-white"
                        >
                          <option value="">Select category</option>
                          <option value="volunteer">Volunteer & Activism</option>
                          <option value="media">Media & Press</option>
                          <option value="partnership">Corporate Partnership</option>
                          <option value="policy">Policy & Research</option>
                          <option value="event">Town Hall & Events</option>
                          <option value="general">General Inquiries</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-8">
                    <label className="block text-sm font-extrabold text-ink-950 mb-3 tracking-wide">
                      YOUR MESSAGE *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="6"
                      placeholder="Tell us how you want to contribute to Nigeria's transformation..."
                      className="w-full px-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-ink-950 resize-none font-medium"
                    ></textarea>
                  </div>

                  {/* Submit */}
                  <button 
                    type="submit"
                    className="w-full bg-linear-to-r from-brand-600 to-brand-700 text-white py-5 px-8 font-extrabold text-xl tracking-wider hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-e2 hover:shadow-e2 flex items-center justify-center gap-3 group"
                  >
                    <Send size={24} strokeWidth={2.5} />
                    SEND MESSAGE
                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
                  </button>

                  <p className="text-center text-sm text-ink-600 mt-6 font-semibold">
                    ✓ We respond within 24 hours • Your information is secure
                  </p>
                </form>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2">
              <div className="sticky top-8 space-y-8">
                {/* Inquiry Categories */}
                <div className="bg-linear-to-br from-brand-600 to-brand-700 shadow-e2 p-8 text-white">
                  <h3 className="text-fluid-xl mb-6">How Can We Help?</h3>
                  <div className="space-y-4">
                    {inquiryCategories.map((category, index) => {
                      const Icon = category.icon;
                      return (
                        <div 
                          key={index}
                          className="bg-white/10 backdrop-blur-sm p-4 hover:bg-white/20 transition-all duration-300"
                        >
                          <div className="flex items-start gap-4">
                            <div className="shrink-0 w-12 h-12 bg-ember-500 flex items-center justify-center">
                              <Icon size={20} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg mb-1">{category.title}</h4>
                              <p className="text-white/90 text-sm leading-relaxed">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Social Media */}
                <div className="bg-white shadow-e2 p-8 border border-ink-200">
                  <h3 className="text-fluid-xl mb-6">Follow the Campaign</h3>
                  <div className="space-y-3">
                    {socialMedia.map((social) => (
                      <a
                        key={social.brand}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 border border-hairline bg-ink-50 p-4 transition-[background-color,border-color,transform,box-shadow] duration-300 ease-out-quart hover:border-brand-600 hover:bg-brand-600 hover:text-white hover:shadow-e3 motion-safe:hover:-translate-y-0.5"
                      >
                        <div className="grid size-14 shrink-0 place-items-center bg-white text-brand-700 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white">
                          <BrandIcon name={social.brand} className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold">{social.name}</p>
                          <p className="truncate text-sm opacity-80">{social.handle}</p>
                        </div>
                        <ArrowUpRight
                          size={18}
                          strokeWidth={2.5}
                          className="ml-auto shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* State Offices */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">NATIONWIDE PRESENCE</p>
            <h2 className="text-fluid-4xl mb-6">36 State Offices</h2>
            <p className="prose-body">
              Campaign offices in every state. Find your local team and get involved.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stateOffices.map((office, index) => (
              <div 
                key={index}
                className={`bg-white p-8 hover:shadow-e2 transition-all duration-300 border-4 ${
                  office.isMain ? 'border-brand-600' : 'border-ink-200'
                } motion-safe:hover:-translate-y-0.5`}
              >
                {office.isMain && (
                  <span className="inline-block bg-brand-600 text-white text-xs font-extrabold px-4 py-2 mb-4">
                    NATIONAL HQ
                  </span>
                )}
                <div className="w-16 h-16 bg-linear-to-br from-brand-600 to-ember-500 flex items-center justify-center mb-6 shadow-e2">
                  <MapPin size={32} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-fluid-xl text-ink-950 mb-2">
                  {office.zone}
                </h3>
                <p className="text-sm font-bold text-brand-600 mb-4">
                  {office.headquarters}
                </p>
                <div className="bg-white p-4 mb-4">
                  <p className="text-xs font-bold text-ink-600 mb-2">STATES COVERED:</p>
                  <p className="text-sm text-ink-950 font-semibold">
                    {office.states.join(", ")}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-ember-500 mt-1 shrink-0" />
                    <p className="text-sm text-ink-700 font-medium">
                      {office.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-ember-500 shrink-0" />
                    <p className="text-sm font-bold text-ink-950">
                      {office.phone}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-16 lg:px-24">
          <div className="bg-linear-to-br from-ink-950 to-ink-800 p-12 md:p-16 text-white text-center shadow-e2">
            <Mail size={64} className="mx-auto mb-8 text-ember-500" strokeWidth={1.5} />
            <h2 className="text-fluid-4xl mb-6">
              Stay Informed. Stay Engaged.
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Get campaign updates, town hall invitations, and volunteer opportunities delivered to your inbox.
            </p>
            <form className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 text-ink-950 font-semibold focus:outline-none focus:ring-4 focus:ring-brand-600"
              />
              <button 
                type="submit"
                className="bg-brand-600 text-white px-10 py-4 font-bold hover:bg-brand-700 transition-all duration-300 shadow-e2 hover:shadow-e2 flex items-center justify-center gap-2"
              >
                Subscribe
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </form>
            <p className="text-white/60 text-sm mt-6">
              Join 500K+ Nigerians following the campaign. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-br from-brand-600 via-brand-700 to-brand-600 text-white py-20 md:py-32">
        <div className="shell md:px-16 text-center">
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8">
            EVERY VOICE MATTERS
          </h2>
          <p className="text-2xl md:text-3xl mb-6 text-white/95">
            Together, we&rsquo;re building the Nigeria we deserve.
          </p>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed">
            Whether you volunteer, donate, or simply spread the word, your contribution makes a difference. 
            Join 100,000+ Nigerians mobilizing for proven leadership.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="#volunteer" 
              className="inline-flex items-center justify-center gap-3 bg-white text-brand-600 px-12 py-6 hover:bg-white/95 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              <Users size={28} strokeWidth={3} />
              VOLUNTEER NOW
            </a>
            <a 
              href="#contact" 
              className="inline-flex items-center justify-center gap-3 bg-ember-500 text-white px-12 py-6 hover:bg-ember-600 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              <Send size={28} strokeWidth={3} />
              GET IN TOUCH
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AmaechiConnect;