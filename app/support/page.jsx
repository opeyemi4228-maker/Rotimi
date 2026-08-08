'use client'
import React, { useState } from "react";
import { ArrowRight, Heart, Users, Briefcase, Gift, Calendar, Mail, Check, DollarSign, CreditCard, Megaphone, Target, Flag, Shield } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { assets } from "@/assets/assets";

const AmaechiSupport = () => {
  const [donationType, setDonationType] = useState("monthly");
  const [selectedAmount, setSelectedAmount] = useState(50000);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedImpact, setSelectedImpact] = useState(null);

  const donationAmounts = [5000, 10000, 25000, 50000, 100000, 250000];

  const impactAreas = [
    {
      id: "grassroots",
      icon: Users,
      title: "Grassroots Organizing",
      description: "Fund voter registration drives, town halls, and community engagement across 36 states",
      color: "bg-brand-600"
    },
    {
      id: "media",
      icon: Megaphone,
      title: "Media & Communications",
      description: "Support TV/radio ads, social media campaigns, and voter education materials",
      color: "bg-ember-500"
    },
    {
      id: "infrastructure",
      icon: Target,
      title: "Campaign Infrastructure",
      description: "Build state offices, training centers, and volunteer coordination systems",
      color: "bg-brand-600"
    }
  ];

  const impactStories = [
    {
      amount: "₦5,000",
      impact: "Registers 50 voters and provides campaign materials for one LGA"
    },
    {
      amount: "₦10,000",
      impact: "Funds transportation for 20 volunteers to reach rural communities"
    },
    {
      amount: "₦25,000",
      impact: "Supports a town hall meeting with 200+ attendees in one community"
    },
    {
      amount: "₦50,000",
      impact: "Equips a local campaign office with essential materials for one month"
    },
    {
      amount: "₦100,000",
      impact: "Sponsors radio ads reaching 500,000+ voters in one state"
    },
    {
      amount: "₦250,000",
      impact: "Funds complete voter mobilization campaign in one senatorial district"
    }
  ];

  const volunteerOpportunities = [
    {
      icon: Users,
      title: "Door to Door Canvassing",
      commitment: "10 hours/week",
      description: "Talk to voters in your community about Amaechi's proven track record and vision for Nigeria"
    },
    {
      icon: Megaphone,
      title: "Phone Banking",
      commitment: "Flexible",
      description: "Call voters from our database, answer questions, and encourage voter registration"
    },
    {
      icon: Calendar,
      title: "Event Coordination",
      commitment: "Event based",
      description: "Help organize town halls, rallies, and community meetings in your area"
    },
    {
      icon: Mail,
      title: "Social Media Advocacy",
      commitment: "5 hours/week",
      description: "Share campaign messages, counter misinformation, and engage supporters online"
    }
  ];

  const whySupport = [
    {
      icon: Shield,
      title: "Proven Leadership",
      fact: "16 years executive experience • 1,763+ KM rail delivered • 11,300+ jobs created"
    },
    {
      icon: Target,
      title: "Clear Vision",
      fact: "Detailed plan for infrastructure, jobs, education, and healthcare based on proven results"
    },
    {
      icon: Check,
      title: "Transparent Governance",
      fact: "₦460M+ railway revenue fully accounted • Senate 'Take a Bow' recognition"
    },
    {
      icon: Users,
      title: "People First",
      fact: "Track record of building 300+ schools, 160 health centers, creating opportunities"
    }
  ];

  const campaignPartners = [
    "Nigerian Professionals Abroad",
    "Youth for Amaechi Movement",
    "Women for Good Governance",
    "Business Leaders Forum",
    "Academic Coalition",
    "Diaspora Network"
  ];

  return (
    <div className="bg-white">
      <PageHeader
        breadcrumb="Support"
        kicker="Fuel the movement"
        title="Support proven leadership."
        lead="Every contribution powers grassroots organising, builds campaign infrastructure, and brings Nigeria closer to leadership driven by results."
        image={assets.Camp1}
      >
        <div className="flex flex-col sm:flex-row">
          <Button href="#donate" variant="inverse" size="lg">
            Donate to the campaign
          </Button>
          <Button href="#volunteer" variant="inverseOutline" size="lg" className="sm:-ml-0.5">
            Volunteer now
          </Button>
        </div>
      </PageHeader>

      {/* Why Support Section */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">WHY YOUR SUPPORT MATTERS</p>
            <h2 className="text-fluid-4xl mb-6">Backing a Winner</h2>
            <p className="prose-body">
              You&rsquo;re not gambling on potential. You&rsquo;re investing in proven results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {whySupport.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-8 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
                >
                  <div className="flex items-start gap-6">
                    <div className="shrink-0 w-16 h-16 bg-brand-600 flex items-center justify-center shadow-e2">
                      <Icon size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-fluid-xl text-ink-950 mb-3">
                        {reason.title}
                      </h3>
                      <p className="text-ink-700 leading-relaxed font-semibold">
                        {reason.fact}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Donation Form */}
      <section id="donate" className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Power the Campaign</h2>
            <p className="prose-body">
              100% of your donation funds grassroots organizing and voter outreach
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-white shadow-e2 p-8 md:p-12 border border-ink-200">
                {/* Monthly/One-time Toggle */}
                <div className="flex gap-4 mb-8">
                  <button
                    onClick={() => setDonationType("monthly")}
                    className={`flex-1 py-4 px-6 font-bold text-sm tracking-wider transition-all duration-300 ${
                      donationType === "monthly"
                        ? "bg-brand-600 text-white shadow-e2 "
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    MONTHLY SUSTAINER
                  </button>
                  <button
                    onClick={() => setDonationType("onetime")}
                    className={`flex-1 py-4 px-6 font-bold text-sm tracking-wider transition-all duration-300 ${
                      donationType === "onetime"
                        ? "bg-brand-600 text-white shadow-e2 "
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    ONE TIME DONATION
                  </button>
                </div>

                {/* Amount Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-extrabold text-ink-950 mb-4 tracking-wide">SELECT AMOUNT (₦)</label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {donationAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount("");
                        }}
                        className={`py-4 px-4 font-bold text-base md:text-lg transition-all duration-300 ${
                          selectedAmount === amount && !customAmount
                            ? "bg-brand-600 text-white shadow-e2 "
                            : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                        }`}
                      >
                        ₦{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-600 font-bold text-xl">₦</span>
                    <input
                      type="number"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      className="w-full pl-12 pr-4 py-4 border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none text-xl font-bold"
                    />
                  </div>
                </div>

                {/* Impact Area */}
                <div className="mb-8">
                  <label className="block text-sm font-extrabold text-ink-950 mb-4 tracking-wide">FUND PRIORITY AREA</label>
                  <div className="space-y-3">
                    {impactAreas.map((area) => {
                      const Icon = area.icon;
                      return (
                        <button
                          key={area.id}
                          onClick={() => setSelectedImpact(area.id)}
                          className={`w-full p-5 border-2 transition-all duration-300 text-left flex items-start gap-4 ${
                            selectedImpact === area.id
                              ? "border-brand-600 bg-brand-50 "
                              : "border-ink-200 hover:border-ink-300"
                          }`}
                        >
                          <div className={`shrink-0 w-14 h-14 ${area.color} flex items-center justify-center shadow-e2`}>
                            <Icon size={28} className="text-white" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-extrabold text-lg text-ink-950 mb-2">{area.title}</h4>
                            <p className="text-sm text-ink-600 leading-relaxed">{area.description}</p>
                          </div>
                          {selectedImpact === area.id && (
                            <Check className="text-brand-600 shrink-0" size={28} strokeWidth={3} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button className="w-full bg-linear-to-r from-brand-600 to-brand-700 text-white py-5 px-8 font-extrabold text-xl tracking-wider hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-e2 hover:shadow-e2 flex items-center justify-center gap-3 group">
                  <CreditCard size={24} strokeWidth={2.5} />
                  DONATE NOW
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
                </button>

                <p className="text-center text-sm text-ink-600 mt-6 font-semibold">
                  ✓ Secure payment • ✓ Transparent accounting • ✓ Cancel monthly giving anytime
                </p>
              </div>
            </div>

            {/* Impact Sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-linear-to-br from-brand-600 to-brand-700 shadow-e2 p-8 text-white sticky top-8">
                <h3 className="text-3xl font-extrabold mb-6">YOUR IMPACT</h3>
                <div className="space-y-4">
                  {impactStories.map((story, index) => (
                    <div 
                      key={index} 
                      className={`p-5 transition-all duration-300 ${
                        (customAmount && parseInt(customAmount) >= parseInt(story.amount.replace('₦', '').replace(',', ''))) ||
                        (selectedAmount && selectedAmount >= parseInt(story.amount.replace('₦', '').replace(',', '')))
                          ? "bg-ember-500  shadow-e2"
                          : "bg-white/10"
                      }`}
                    >
                      <div className="font-extrabold text-2xl mb-2">{story.amount}</div>
                      <p className="text-white/95 leading-relaxed font-semibold">{story.impact}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t-2 border-white/20">
                  <div className="flex items-start gap-4 mb-6">
                    <Heart size={28} fill="white" strokeWidth={0} className="shrink-0" />
                    <div>
                      <p className="font-bold text-lg mb-2">100% to Campaign Activities</p>
                      <p className="text-white/90 text-sm leading-relaxed">
                        Administrative costs covered by major donors. Every naira funds voter outreach, town halls, and grassroots organizing.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-4">
                    <p className="text-sm font-bold mb-2">TRANSPARENT ACCOUNTING</p>
                    <p className="text-white/90 text-sm">
                      Like the ₦460M+ railway revenue he returned, every donation is tracked and reported. Proven transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Volunteer Section */}
      <section id="volunteer" className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">JOIN 100,000+ VOLUNTEERS</p>
            <h2 className="text-fluid-4xl mb-6">Time is Currency Too</h2>
            <p className="prose-body">
              Can&rsquo;t donate? Give your time. Every conversation converts voters. Every volunteer multiplies our reach.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {volunteerOpportunities.map((opportunity, index) => {
              const Icon = opportunity.icon;
              return (
                <div 
                  key={index}
                  className="group bg-white p-8 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
                >
                  <div className="flex items-start gap-6">
                    <div className="shrink-0 w-16 h-16 bg-ember-500 flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-e2">
                      <Icon size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-fluid-xl text-ink-950">{opportunity.title}</h3>
                        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-2 whitespace-nowrap">
                          {opportunity.commitment}
                        </span>
                      </div>
                      <p className="text-ink-700 leading-relaxed mb-4 font-medium">{opportunity.description}</p>
                      <button className="text-brand-600 font-bold tracking-wide hover:gap-3 flex items-center gap-2 transition-all duration-300 group/btn">
                        SIGN UP NOW
                        <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform duration-300" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-linear-to-r from-brand-600 to-brand-700 p-12 md:p-16 text-white text-center shadow-e2">
            <h3 className="text-fluid-3xl mb-6">Volunteer Benefits</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                "Training in political organizing",
                "Direct access to campaign leadership",
                "Certificate of campaign service",
                "Networking with 100K+ patriots",
                "Exclusive town hall invitations",
                "Meet Rt. Hon. Amaechi"
              ].map((benefit, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm p-4 flex items-center gap-3">
                  <Check className="text-ember-500 shrink-0" size={24} strokeWidth={3} />
                  <p className="text-white/95 font-semibold text-left">{benefit}</p>
                </div>
              ))}
            </div>
            <a 
              href="volunteer" 
              className="inline-flex items-center gap-3 bg-white text-brand-600 px-12 py-5 hover:bg-white/95 transition-all duration-300 font-bold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              Start Volunteering
              <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
            </a>
          </div>
        </div>
      </section>

      {/* Coalition Partners */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Coalition Partners</h2>
            <p className="prose-body">
              Join leading organizations supporting proven leadership
            </p>
          </div>

          <div className="bg-white p-12 shadow-e2 border border-ink-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {campaignPartners.map((partner, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-center p-6 bg-white hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
                >
                  <span className="text-ink-950 font-bold text-center">{partner}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-ink-600 text-lg mb-6">
              Want your organization to join the coalition?
            </p>
            <a 
              href="#partner" 
              className="inline-flex items-center gap-3 bg-brand-600 text-white px-10 py-5 hover:bg-brand-700 transition-all duration-300 font-bold text-lg tracking-wide group shadow-e2 hover:shadow-e2"
            >
              Partner With Campaign
              <ArrowRight size={22} strokeWidth={3} />
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-br from-brand-600 via-brand-700 to-brand-600 text-white py-20 md:py-32">
        <div className="shell md:px-16 text-center">
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8">
            INVEST IN NIGERIA&rsquo;S FUTURE
          </h2>
          <p className="text-2xl md:text-3xl mb-6 text-white/95">
            Not promises. PROVEN RESULTS.
          </p>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed">
            Your support backs a leader who has DELIVERED. 1,763+ KM of rail. 11,300+ jobs. 
            300+ schools. 16 years of executive leadership. Nigeria deserves proven excellence.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="#donate" 
              className="inline-flex items-center justify-center gap-3 bg-white text-brand-600 px-12 py-6 hover:bg-white/95 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              <Heart size={28} fill="currentColor" strokeWidth={0} />
              DONATE NOW
            </a>
            <a 
              href="#volunteer" 
              className="inline-flex items-center justify-center gap-3 bg-ember-500 text-white px-12 py-6 hover:bg-ember-600 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              <Users size={28} strokeWidth={3} />
              VOLUNTEER TODAY
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AmaechiSupport;