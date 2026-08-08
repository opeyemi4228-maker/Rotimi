'use client'
import React, { useState } from "react";
import { ArrowRight, Target, TrendingUp, Users, Zap, Shield, Lightbulb, Globe, Building2, Heart, GraduationCap, Stethoscope, Truck, Factory, Leaf, Scale, BookOpen, CheckCircle, Star, Award, Flame, Rocket, ChevronRight, MapPin, DollarSign, Briefcase, Clock, Train, Ship, Wrench } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { assets } from "@/assets/assets";

const AmaechiPlanForChange = () => {
  const [activePillar, setActivePillar] = useState(0);

  const manifestoVision = {
    title: "THE AMAECHI AGENDA",
    subtitle: "From Proven Results to National Transformation",
    description: "Not promises. Not theories. A comprehensive plan built on 30+ years of proven leadership, 1,763+ KM of rail delivered, 11,300+ jobs created, and 16 years of executive experience. Nigeria needs a leader who has DONE IT before."
  };

  const coreValues = [
    {
      icon: Shield,
      title: "Proven Integrity",
      description: "₦460M+ railway revenue transparently returned. Senate 'Take a Bow' for distinguished service. Due Process Commission established in Rivers State.",
      color: "bg-brand-600",
      proof: "Senate Recognition 2019"
    },
    {
      icon: Rocket,
      title: "Execution Excellence",
      description: "1,763+ KM rail delivered when others only talked. 300+ schools built. 160 health centers constructed. Results, not rhetoric.",
      color: "bg-ember-500",
      proof: "Warri to Itakpe completed after 30 years"
    },
    {
      icon: Users,
      title: "People First",
      description: "11,300+ jobs created as Minister. 150 international scholarships. 550+ maritime cadets trained. Development that touches lives.",
      color: "bg-brand-600",
      proof: "11,300+ direct jobs created"
    },
    {
      icon: Target,
      title: "Strategic Vision",
      description: "Led APC to historic 2015 victory. Transformed Rivers State. Revolutionized national transportation. Vision backed by execution.",
      color: "bg-ember-500",
      proof: "First opposition to defeat sitting president"
    },
    {
      icon: Scale,
      title: "Rule of Law",
      description: "Fought to Supreme Court for democracy in 2007, and won. Champion of legislative independence. Defender of constitutional order.",
      color: "bg-brand-600",
      proof: "Supreme Court Victory Oct 26, 2007"
    },
    {
      icon: Globe,
      title: "Global Standards",
      description: "King's College London LLM. International rail projects. Standard gauge infrastructure. Nigeria competing globally.",
      color: "bg-ember-500",
      proof: "Master of Law, King's College London"
    }
  ];

  const keyPillars = [
    {
      icon: Train,
      title: "Infrastructure Revolution",
      tagline: "Building on 1,763+ KM Success",
      description: "As Minister, I delivered 1,763+ KM of modern rail, 32 train stations, and revolutionized maritime infrastructure. As President, I'll complete what I started, connecting every state with world class infrastructure.",
      trackRecord: "✓ Lagos to Ibadan rail (157KM) • ✓ Abuja to Kaduna rail (186KM) • ✓ Warri to Itakpe completed after 30 years • ✓ Lekki Deep Seaport • ✓ 32 modern train stations",
      initiatives: [
        {
          name: "Complete National Rail Network",
          details: "Extend standard gauge rail to all 36 states. Build on the existing Lagos to Ibadan, Abuja to Kaduna, and Warri to Itakpe lines to create integrated national network",
          impact: "Connect Nigeria • Reduce transport costs 60% • Create 500,000+ jobs",
          timeline: "Years 1 to 3"
        },
        {
          name: "Power for All: 24/7 Electricity",
          details: "Replicate 460MW success in Rivers State nationwide. Solar, hydro, gas diversification. Distribution reform. Already proven with Afam, Trans Amadi, Onne power projects",
          impact: "25,000MW capacity • Reliable power 24/7 • Manufacturing boom",
          timeline: "Years 1 to 4"
        },
        {
          name: "Seaports & Maritime Excellence",
          details: "Complete Bonny Deep Seaport, expand Lekki. Implement Deep Blue security nationwide. Already restructured Maritime Academy to UK standards",
          impact: "Triple port capacity • Stop smuggling • Regional maritime hub",
          timeline: "Years 1 to 3"
        },
        {
          name: "Roads & Transportation",
          details: "Federal highways reconstruction. Smart traffic systems. Already built Port Harcourt monorail, connected entire Rivers State by road",
          impact: "Safe roads nationwide • Modern public transport • 200,000+ jobs",
          timeline: "Years 1 to 4"
        }
      ],
      color: "from-brand-600 to-brand-700"
    },
    {
      icon: GraduationCap,
      title: "Education Excellence",
      tagline: "From 300+ Schools to National Transformation",
      description: "As Governor, I built 300+ primary schools and 24 model secondary schools meeting international standards. Provided yearly scholarships. As President, I'll scale this nationwide.",
      trackRecord: "✓ 300+ schools built in Rivers • ✓ 24 secondary schools built to international standard • ✓ 150 Nigerians studying in China (full scholarships) • ✓ Transport University established",
      initiatives: [
        {
          name: "Build 10,000 Modern Schools",
          details: "International standard schools in every LGA. Modern facilities, classrooms equipped with technology. Already built 300+ in Rivers State, so I know how",
          impact: "Every child in quality school • 100,000+ teachers trained",
          timeline: "Years 1 to 3"
        },
        {
          name: "Mass Scholarship Program",
          details: "Expand the China programme for 150 students to 100,000 annually. Already facilitated yearly Rivers scholarships, a proven system",
          impact: "100,000 Nigerians studying abroad • Skills for 21st century",
          timeline: "Years 1 to 4"
        },
        {
          name: "Vocational & Skills Training",
          details: "1,000 centers nationwide. Technology, agriculture, manufacturing focus. Built Kajola Wagon Assembly Plant, so local production works",
          impact: "2M youth trained annually • Graduates ready for work",
          timeline: "Year 2-4"
        },
        {
          name: "University Transformation",
          details: "Upgrade facilities to global standards. Research funding. Already established Transport University in Daura",
          impact: "World class universities • Stop brain drain",
          timeline: "Year 2-4"
        }
      ],
      color: "from-ember-500 to-ember-600"
    },
    {
      icon: Stethoscope,
      title: "Healthcare Revolution",
      tagline: "From 160 PHCs to Universal Coverage",
      description: "As Governor, I built 160 Primary Health Centers and 3 ultra modern hospitals. As President, I'll provide world class healthcare for every Nigerian.",
      trackRecord: "✓ 160 PHCs built in Rivers • ✓ 3 ultra modern hospitals • ✓ 550+ maritime cadets trained (health & safety) • ✓ Healthcare infrastructure investment",
      initiatives: [
        {
          name: "10,000 Primary Health Centers",
          details: "Upgrade and equip PHCs nationwide. Already built 160 in Rivers State, so scale the model. Modern equipment, trained staff",
          impact: "Healthcare within 5km of every community • Universal access",
          timeline: "Years 1 to 3"
        },
        {
          name: "Specialist Hospitals Network",
          details: "100 specialist hospitals across all states. Stop medical tourism. Save billions. Already built 3 ultra modern hospitals",
          impact: "Advanced care in Nigeria • $2B+ saved annually",
          timeline: "Year 2-4"
        },
        {
          name: "Universal Health Insurance",
          details: "Coverage for all 200M+ Nigerians. Subsidized for low income households. Proven governance model ensures transparency",
          impact: "Everyone covered • Affordable healthcare",
          timeline: "Year 1-2"
        },
        {
          name: "Train 100,000 Healthcare Workers",
          details: "Doctors, nurses, specialists. International training program. Already sent 150 to China, so expand the healthcare version",
          impact: "End doctor shortage • Nigeria as regional medical hub",
          timeline: "Years 1 to 4"
        }
      ],
      color: "from-brand-600 to-brand-700"
    },
    {
      icon: Briefcase,
      title: "Economic Prosperity & Jobs",
      tagline: "From 11,300+ Jobs to Millions",
      description: "As Minister, I created 11,300+ direct jobs through rail projects alone. As President, I'll replicate this job creation across all sectors.",
      trackRecord: "✓ 11,300+ jobs from rail projects • ✓ Songhai Farm of 314 hectares (largest in West Africa) • ✓ Kajola Wagon Assembly Plant • ✓ Industrial development",
      initiatives: [
        {
          name: "10 Million Jobs Campaign",
          details: "Infrastructure projects, agriculture, manufacturing. Already created 11,300+ from railways, so multiply across all sectors",
          impact: "Unemployment under 10% • Youth employment priority",
          timeline: "Years 1 to 4"
        },
        {
          name: "Agriculture Transformation",
          details: "Mechanization, processing, market access. Already built Songhai Farm across 314 hectares, 20x bigger than the Porto Novo model",
          impact: "Food security • 50M agribusiness jobs • Export earnings",
          timeline: "Years 1 to 3"
        },
        {
          name: "Manufacturing Renaissance",
          details: "Industrial parks, local production. Already established Kajola Wagon Assembly, so replicate nationwide",
          impact: "Manufacturing 20% of GDP • Self sufficiency • Exports",
          timeline: "Year 2-4"
        },
        {
          name: "SME Empowerment",
          details: "N500B fund, training, market access. Rivers State Due Process model ensures transparency in disbursement",
          impact: "5M new businesses • 20M indirect jobs",
          timeline: "Years 1 to 4"
        }
      ],
      color: "from-ember-500 to-ember-600"
    },
    {
      icon: Shield,
      title: "Security & Justice",
      tagline: "Building on Deep Blue Success",
      description: "As Minister, I launched Deep Blue Project, Africa's most advanced maritime security system. As President, I'll secure all of Nigeria with technology and strategy.",
      trackRecord: "✓ Deep Blue Project: 17 vessels, 2 aircraft, 3 helicopters • ✓ Electronic Call Up system (eliminated port gridlock) • ✓ Rule of law champion",
      initiatives: [
        {
          name: "Integrated National Security",
          details: "Expand Deep Blue model to land borders. Security driven by technology. Already secured Gulf of Guinea, so replicate nationwide",
          impact: "Safe borders • End smuggling • Modern defense",
          timeline: "Year 1-2"
        },
        {
          name: "Police Modernization",
          details: "200,000 new officers, modern equipment, better welfare. Training academy model. Technology integration",
          impact: "1 officer per 200 citizens • Response time under 10 mins",
          timeline: "Years 1 to 3"
        },
        {
          name: "Justice System Reform",
          details: "Faster courts, digital case management. Supreme Court victory 2007 proved commitment to rule of law",
          impact: "Cases resolved within 12 months • Zero tolerance for corruption",
          timeline: "Year 1-2"
        },
        {
          name: "Community Security",
          details: "Neighborhood watch, community policing. Participatory governance model from Rivers State",
          impact: "Crime reduced 60% • Citizens empowered",
          timeline: "Years 1 to 4"
        }
      ],
      color: "from-brand-600 to-brand-700"
    },
    {
      icon: Leaf,
      title: "Sustainable Development",
      tagline: "Green Nigeria, Prosperous Future",
      description: "Infrastructure development must be sustainable. Port Harcourt urban renewal and Greater Port Harcourt City Master Plan prove that environmental projects at large scale work.",
      trackRecord: "✓ Greater Port Harcourt City Master Plan • ✓ Urban renewal programs • ✓ Modern waste management • ✓ Green infrastructure focus",
      initiatives: [
        {
          name: "Renewable Energy Revolution",
          details: "Solar, wind, hydro. 40% renewable by 2035. Power diversification already implemented in Rivers (Afam, Trans Amadi)",
          impact: "Clean energy • 100,000 green jobs • Climate leadership",
          timeline: "Years 1 to 4"
        },
        {
          name: "National Reforestation",
          details: "1 billion trees in 10 years. Combat desertification. Protect biodiversity. Environmental stewardship",
          impact: "Green Nigeria • Climate resilience",
          timeline: "Years 1 to 4"
        },
        {
          name: "Modern Waste Management",
          details: "Recycling facilities, clean cities. Already modernized Port Harcourt, so scale nationwide",
          impact: "Clean environment • 500,000 sanitation jobs",
          timeline: "Year 2-4"
        },
        {
          name: "Climate Adaptation",
          details: "Flood control, agriculture that resists drought, coastal protection. Infrastructure that lasts",
          impact: "Protected communities • Sustainable development",
          timeline: "Year 2-4"
        }
      ],
      color: "from-ember-500 to-ember-600"
    }
  ];

  const nationalTargets = [
    {
      icon: TrendingUp,
      goal: "GDP Growth",
      target: "8%+ Annually",
      current: "Based on proven economic management in Rivers State and growth led by infrastructure",
      achievement: "Transformed Rivers State economy through infrastructure"
    },
    {
      icon: Briefcase,
      goal: "Job Creation",
      target: "10M Jobs",
      current: "Proven with 11,300+ jobs from rail projects alone",
      achievement: "11,300+ jobs created as Minister"
    },
    {
      icon: Zap,
      goal: "Power Generation",
      target: "25,000 MW",
      current: "Built 460MW in Rivers State, so scale nationwide",
      achievement: "460MW power infrastructure delivered"
    },
    {
      icon: Train,
      goal: "Rail Network",
      target: "5,000+ KM",
      current: "Delivered 1,763+ KM as Minister, so continue the momentum",
      achievement: "1,763+ KM already delivered"
    },
    {
      icon: GraduationCap,
      goal: "Schools Built",
      target: "10,000 Modern Schools",
      current: "Built 300+ in Rivers State, a proven model",
      achievement: "300+ schools built as Governor"
    },
    {
      icon: Stethoscope,
      goal: "Healthcare Coverage",
      target: "200M Nigerians",
      current: "Built 160 PHCs in Rivers, so scale the success",
      achievement: "160 Primary Health Centers built"
    }
  ];

  const implementationPlan = [
    {
      phase: "Year 1: Quick Wins & Foundation",
      period: "First 365 Days",
      focus: "Deliver immediate impact while building capacity for the long term",
      icon: Rocket,
      actions: [
        "Complete ongoing rail projects (the Lagos to Ibadan extension and the Ibadan to Kano segment)",
        "Universal health insurance enrollment begins, the Rivers model nationwide",
        "Launch 200,000 police recruitment and training program",
        "Begin 460MW power replication in 5 states",
        "Scholarship program expansion: 10,000 students in the first cohort",
        "Establish Due Process Commission federally (Rivers State model)",
        "Launch national digital ID linked to services"
      ],
      proof: "Proven capacity: Delivered similar scale projects in Rivers State and as Minister"
    },
    {
      phase: "Years 2 to 3: Transformation Accelerates",
      period: "Months 13 to 36",
      focus: "Major infrastructure delivery and institutional reform",
      icon: Building2,
      actions: [
        "Complete 2,000+ KM new rail lines (building on 1,763+ KM delivered)",
        "5,000 modern schools operational (scaling 300+ school model)",
        "50 specialist hospitals completed (scaling the model of 3 hospitals)",
        "Achieve 15,000MW power generation capacity",
        "100,000 healthcare workers trained and deployed",
        "5M jobs created through infrastructure and agriculture",
        "Manufacturing hubs operational in all geopolitical zones"
      ],
      proof: "Track record: Built 300+ schools, 160 PHCs, 1,763+ KM rail, scaling proven models"
    },
    {
      phase: "Years 3 to 4: Consolidation & Scale",
      period: "Months 37 to 48",
      focus: "Complete transformation and sustainable systems",
      icon: Award,
      actions: [
        "National rail network connecting all 36 states complete",
        "10,000 schools and 100 specialist hospitals operational",
        "25,000MW power generation achieved, giving 24/7 electricity",
        "10M jobs milestone reached",
        "Universal healthcare coverage at 200M Nigerians",
        "Nigeria in top 20 global economies",
        "Export earnings doubled through manufacturing and agriculture"
      ],
      proof: "Experience: 16 years executive leadership, proven ability to deliver complex projects"
    }
  ];

  const accountability = [
    {
      icon: CheckCircle,
      title: "Quarterly Progress Reports",
      description: "Public reporting every 90 days on all targets and spending. Rivers State Due Process Commission model applied federally.",
      commitment: "Total transparency. Every naira accounted for"
    },
    {
      icon: Users,
      title: "Citizen Engagement",
      description: "Town halls, digital feedback, an open door policy. Continued participatory governance from Rivers State experience.",
      commitment: "Government by the people, for the people"
    },
    {
      icon: Award,
      title: "Performance Metrics",
      description: "Cabinet members measured on delivery. Meritocracy, not connections. Appointments based on competence only.",
      commitment: "Results matter. Those who do not perform are replaced"
    },
    {
      icon: Globe,
      title: "International Audits",
      description: "Independent verification of all major projects. World Bank and IMF standards. Zero tolerance for corruption.",
      commitment: "Global best practices with Nigerian execution"
    }
  ];

  const provenLeadership = [
    {
      role: "Minister of Transportation",
      years: "7 Years (2015 to 2022)",
      delivered: [
        "1,763+ KM standard gauge rail",
        "11,300+ jobs created",
        "32 train stations built",
        "Deep Blue maritime security",
        "Transport University established",
        "₦460M+ revenue accounted for"
      ]
    },
    {
      role: "Governor of Rivers State",
      years: "8 Years (2007 to 2015)",
      delivered: [
        "300+ schools built",
        "160 Primary Health Centers",
        "460MW power infrastructure",
        "Songhai Farm, 314 hectares",
        "Greater Port Harcourt City",
        "Due Process Commission"
      ]
    },
    {
      role: "Speaker, House of Assembly",
      years: "8 Years (1999 to 2007)",
      delivered: [
        "Most productive legislature",
        "Chairman, Speakers Conference",
        "Legislative independence defended",
        "Supreme Court victory 2007"
      ]
    }
  ];

  return (
    <div className="bg-white">
      <PageHeader
        breadcrumb="Plan for Change"
        kicker="The Amaechi agenda · Manifesto"
        title={manifestoVision.title}
        lead={manifestoVision.description}
        image={assets.Amaechi6}
      >
        <div className="flex flex-col sm:flex-row">
          <Button href="#pillars" variant="inverse" size="lg">
            Explore the plan
          </Button>
          <Button href="#track-record" variant="inverseOutline" size="lg" className="sm:-ml-0.5">
            Proven track record
          </Button>
        </div>
      </PageHeader>

      {/* Core Values with Proof */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">PROVEN VALUES</p>
            <h2 className="text-fluid-4xl mb-6">Not Just Values, but a Proven Track Record</h2>
            <p className="prose-body">
              Every value backed by concrete achievements and verifiable results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreValues.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-8 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
                >
                  <div className={`w-16 h-16 ${value.color} flex items-center justify-center mb-6 shadow-e2`}>
                    <Icon size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-fluid-xl text-ink-950 mb-3">
                    {value.title}
                  </h3>
                  <p className="text-ink-700 leading-relaxed mb-4">
                    {value.description}
                  </p>
                  <div className="bg-ember-500 text-white px-4 py-2 text-sm font-bold inline-block">
                    ✓ {value.proof}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* National Targets with Current Progress */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">National Targets, Built on Success</h2>
            <p className="prose-body">
              Ambitious targets based on proven achievements. Not wishes, but larger versions of what I&rsquo;ve already delivered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {nationalTargets.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-8 shadow-e2 hover:shadow-e2 transition-all duration-300 border-l-4 border-brand-600 motion-safe:hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-linear-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-e2">
                      <Icon size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-ink-950">
                        {item.goal}
                      </h3>
                      <p className="text-3xl font-extrabold text-brand-600">
                        {item.target}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 mb-3">
                    <p className="text-sm text-ink-700 leading-relaxed">
                      {item.current}
                    </p>
                  </div>
                  <div className="bg-ember-500 text-white px-4 py-2 text-sm font-bold">
                    ✓ {item.achievement}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Six Pillars - Interactive */}
      <section id="pillars" className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">THE AMAECHI AGENDA</p>
            <h2 className="text-fluid-4xl mb-6">Six Pillars of Transformation</h2>
            <p className="prose-body">
              Not theories from textbooks. Strategies proven through execution. Based on 16 years of executive leadership and concrete results.
            </p>
          </div>

          {/* Pillar Tabs */}
          <div className="flex flex-wrap gap-4 mb-12 justify-center">
            {keyPillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActivePillar(index)}
                  className={`flex items-center gap-3 px-6 py-4 font-bold text-sm md:text-base transition-all duration-300 ${
                    activePillar === index
                      ? 'bg-linear-to-r from-brand-600 to-brand-700 text-white shadow-e2 '
                      : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.5} />
                  {pillar.title}
                </button>
              );
            })}
          </div>

          {/* Active Pillar Content */}
          <div className="bg-linear-to-br from-ink-950 to-ink-800 overflow-hidden shadow-e2">
            <div className={`bg-linear-to-r ${keyPillars[activePillar].color} p-8 md:p-12`}>
              <div className="flex items-start gap-6 mb-6">
                {React.createElement(keyPillars[activePillar].icon, {
                  size: 56,
                  className: "text-white shrink-0",
                  strokeWidth: 2
                })}
                <div className="flex-1">
                  <h3 className="text-fluid-3xl text-white mb-3">
                    {keyPillars[activePillar].title}
                  </h3>
                  <p className="text-xl md:text-2xl text-white/95 font-bold mb-4">
                    {keyPillars[activePillar].tagline}
                  </p>
                  <p className="text-lg text-white/90 leading-relaxed mb-6">
                    {keyPillars[activePillar].description}
                  </p>
                  <div className="bg-white/20 backdrop-blur-sm p-4">
                    <p className="text-sm font-bold text-white/70 mb-2">PROVEN TRACK RECORD:</p>
                    <p className="text-white font-semibold text-base">
                      {keyPillars[activePillar].trackRecord}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h4 className="text-3xl font-extrabold text-white mb-8">Presidential Plan</h4>
              <div className="grid md:grid-cols-2 gap-6">
                {keyPillars[activePillar].initiatives.map((initiative, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/5 backdrop-blur-sm p-8 hover:bg-white/10 transition-all duration-300 border-2 border-white/10 hover:border-ember-500"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <CheckCircle className="text-brand-600 shrink-0 mt-1" size={28} strokeWidth={3} />
                      <h5 className="text-2xl font-bold text-white">
                        {initiative.name}
                      </h5>
                    </div>
                    <p className="text-white/90 mb-4 leading-relaxed text-base">
                      {initiative.details}
                    </p>
                    <div className="bg-brand-600/30 p-4 mb-4">
                      <p className="text-sm font-bold text-white/70 mb-1">IMPACT:</p>
                      <p className="text-white font-semibold">
                        {initiative.impact}
                      </p>
                    </div>
                    <div className="bg-ember-500 text-white px-4 py-2 text-sm font-bold inline-block">
                      Timeline: {initiative.timeline}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Timeline */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Four Year Implementation Plan</h2>
            <p className="prose-body">
              Detailed roadmap with clear timelines. Based on proven ability to deliver complex projects on schedule.
            </p>
          </div>

          <div className="space-y-8">
            {implementationPlan.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <div 
                  key={index}
                  className="bg-white shadow-e2 p-8 md:p-12 hover:shadow-e2 transition-all duration-300 border-2 border-ink-100"
                >
                  <div className="flex items-start gap-6 mb-8">
                    <div className="shrink-0 w-20 h-20 bg-linear-to-br from-brand-600 to-ember-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-e2">
                      <Icon size={40} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-fluid-3xl text-ink-950 mb-2">
                        {phase.phase}
                      </h3>
                      <p className="text-brand-600 font-bold text-xl mb-3">
                        {phase.period}
                      </p>
                      <div className="bg-linear-to-r from-ember-500 to-ember-600 text-white px-6 py-3 inline-block">
                        <p className="font-bold">FOCUS: {phase.focus}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {phase.actions.map((action, actionIdx) => (
                      <div key={actionIdx} className="flex items-start gap-3 bg-white p-4">
                        <ChevronRight className="text-brand-600 shrink-0 mt-1" size={24} strokeWidth={3} />
                        <p className="text-ink-700 leading-relaxed font-medium">
                          {action}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-brand-600 text-white px-6 py-4">
                    <p className="font-bold text-lg">
                      ✓ {phase.proof}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Proven Leadership Track Record */}
      <section id="track-record" className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">EXPERIENCE MATTERS</p>
            <h2 className="text-fluid-4xl mb-6">30+ Years of Proven Leadership</h2>
            <p className="prose-body">
              Not learning on the job. Bringing three decades of executive experience and concrete achievements.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {provenLeadership.map((record, index) => (
              <div 
                key={index}
                className="bg-white p-8 shadow-e2 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
              >
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-linear-to-br from-brand-600 to-ember-500 flex items-center justify-center mx-auto mb-4 shadow-e2">
                    <Award size={40} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-fluid-xl text-ink-950 mb-2">
                    {record.role}
                  </h3>
                  <p className="text-brand-600 font-bold text-lg">
                    {record.years}
                  </p>
                </div>

                <div className="space-y-3">
                  {record.delivered.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle className="text-ember-500 shrink-0 mt-0.5" size={20} strokeWidth={3} />
                      <p className="text-ink-700 font-medium text-sm">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accountability Framework */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="bg-linear-to-br from-brand-600 to-brand-700 p-8 md:p-12 lg:p-16 text-white shadow-e2">
            <div className="mb-12 border-t-2 border-ink-950 pt-7">
              <h2 className="text-fluid-4xl mb-6">Accountability Framework</h2>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                Transparent governance with measurable targets. Rivers State Due Process Commission model applied federally.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {accountability.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={index}
                    className="bg-white/10 backdrop-blur-sm p-8 hover:bg-white/20 transition-all duration-300 border-2 border-white/20"
                  >
                    <div className="w-16 h-16 bg-ember-500 flex items-center justify-center mb-6 shadow-e2">
                      <Icon size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-fluid-xl mb-3">
                      {item.title}
                    </h3>
                    <p className="text-white/90 leading-relaxed mb-4 text-lg">
                      {item.description}
                    </p>
                    <div className="bg-white/20 px-4 py-3">
                      <p className="text-white font-bold">
                        ✓ {item.commitment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-br from-ink-950 to-ink-800 text-white py-20 md:py-32">
        <div className="shell md:px-16 text-center">
          <div className="mb-12">
            <div className="flex justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-5xl font-extrabold text-brand-600 mb-2">1,763+</div>
                <div className="text-white/70 text-sm">KM Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-extrabold text-ember-500 mb-2">11,300+</div>
                <div className="text-white/70 text-sm">Jobs Created</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-extrabold text-brand-600 mb-2">16</div>
                <div className="text-white/70 text-sm">Years Leading</div>
              </div>
            </div>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8">
            NOT PROMISES. PROVEN RESULTS.
          </h2>
          <p className="text-2xl md:text-3xl mb-6 text-white/95">
            Choose Experience. Choose Results. Choose Amaechi.
          </p>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed">
            This is not a manifesto of wishes. This is a plan built on 30+ years of proven execution, 
            tested strategies, and concrete achievements. Nigeria deserves a leader who has DONE IT before.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="#join" 
              className="inline-flex items-center justify-center gap-3 bg-brand-600 text-white px-12 py-6 hover:bg-brand-700 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              JOIN THE MOVEMENT
              <Users size={28} strokeWidth={3} />
            </a>
            <a 
              href="#support" 
              className="inline-flex items-center justify-center gap-3 bg-ember-500 text-white px-12 py-6 hover:bg-ember-600 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              SUPPORT THE AGENDA
              <Heart size={28} strokeWidth={3} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AmaechiPlanForChange;