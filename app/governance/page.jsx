'use client'
import React, { useState } from "react";
import { ArrowRight, Users, Building2, Scale, Award, BookOpen, Briefcase, GraduationCap, Landmark, Shield, CheckCircle, ChevronDown, ChevronUp, Target, TrendingUp, Globe, Zap, Heart, Rocket, Star, TrainFront, TrainTrack, HardHat, School, CalendarClock, Wheat } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { assets } from "@/assets/assets";

const AmaechiPresidentialCampaign = () => {
  const [expandedRole, setExpandedRole] = useState(null);

  const presidentialVision = [
    {
      icon: Rocket,
      title: "Infrastructure Revolution",
      description: "Replicate the rail transformation nationwide, connecting every state with modern transportation networks that create jobs and economic growth.",
      promise: "1,000+ new kilometers of rail lines in first term"
    },
    {
      icon: Users,
      title: "Youth Empowerment & Jobs",
      description: "Building on 11,300+ jobs created as Minister, launch massive youth employment program through infrastructure projects and skills training.",
      promise: "500,000 jobs in first 24 months"
    },
    {
      icon: Shield,
      title: "Security Through Development",
      description: "Secure Nigeria by connecting communities, creating opportunities, and deploying solutions driven by technology like the Deep Blue Project.",
      promise: "Integrated National Security Infrastructure"
    },
    {
      icon: TrendingUp,
      title: "Economic Prosperity",
      description: "Transform ports, boost exports, and make Nigeria a manufacturing hub. Proven track record with Lekki Deep Seaport and Inland Dry Ports.",
      promise: "Double GDP growth within 4 years"
    }
  ];

  const keyPositions = [
    {
      id: "minister",
      title: "Federal Minister of Transportation",
      period: "2015 to 2022 • 7 Years of Excellence",
      icon: Briefcase,
      color: "bg-brand-600",
      achievements: [
        "Delivered 1,763+ KM of modern standard gauge rail lines, the largest in Nigeria's history",
        "Created 11,300+ direct jobs through rail modernization projects",
        "Constructed 32 ultra modern train stations across three routes",
        "Launched Deep Blue Project, Africa's most advanced maritime security system",
        "Established first Transport University in West Africa (Daura, Katsina)",
        "Trained 150 Nigerians in China with full international scholarships",
        "Generated ₦460+ Million in railway revenue, fully accounted for",
        "Completed the abandoned Warri to Itakpe rail line after 30 years",
        "Extended rail into Lagos Port, revolutionizing cargo efficiency",
        "Built Lekki Deep Seaport, Africa's largest deep seaport",
        "Commissioned Kaduna and Kano Inland Dry Ports",
        "Introduced electronic ticketing, the first digital railway tickets in Nigeria"
      ],
      impact: "Transformed Nigeria's infrastructure and created economic opportunities across all 36 states",
      testimonial: "Granted 'Take a Bow' by Senate, the highest recognition for distinguished service"
    },
    {
      id: "governor",
      title: "Executive Governor of Rivers State",
      period: "2007 to 2015 • 8 Years of Transformation",
      icon: Landmark,
      color: "bg-ember-500",
      achievements: [
        "Built 160 Primary Health Centres and 3 ultra modern hospitals",
        "Constructed 300+ Primary schools meeting international standards",
        "Built 24 model Secondary schools with modern facilities",
        "Facilitated yearly international scholarships for Rivers youth",
        "Generated 460 megawatts of power infrastructure",
        "Completed Greater Port Harcourt City Master Plan",
        "Built Adokiye Amiesimaka Stadium, a FIFA standard facility",
        "Established Songhai Farm across 314 hectares, the largest in West Africa",
        "Connected all parts of Rivers State by road",
        "Instituted Due Process Commission for transparent governance",
        "Initiated Port Harcourt Monorail project",
        "Revived Port Harcourt Carnival (CARNIRIV)",
        "Championed urban renewal and city modernization"
      ],
      impact: "Transformed Rivers State into a model of development and good governance",
      testimonial: "Returned to office with massive support, a testament to the people's trust"
    },
    {
      id: "speaker",
      title: "Speaker, Rivers State House of Assembly",
      period: "1999 to 2007 • 8 Years of Legislative Excellence",
      icon: Scale,
      color: "bg-brand-600",
      achievements: [
        "Made Rivers State House most productive Legislative House in Nigeria",
        "Elected Chairman, Conference of Speakers (Nigeria), for two consecutive terms",
        "Received Nigerian Union of Journalists Award of Excellence (2000)",
        "Defended State Assembly autonomy at Supreme Court, a historic victory",
        "Established Speakers' Secretariat in Abuja for national coordination",
        "Created clearinghouse for legislative best practices",
        "Maintained harmonious relations between the executive and the legislature",
        "Returned as Speaker (2003) with unanimous confidence"
      ],
      impact: "Set new standards for legislative excellence and democratic governance",
      testimonial: "First Speaker to serve two full terms with continuous productivity"
    },
    {
      id: "campaign",
      title: "Director General, Presidential Campaigns",
      period: "2015 & 2019 • Architect of Change",
      icon: Target,
      color: "bg-ember-500",
      achievements: [
        "Led APC to historic 2015 victory, the first time an opposition defeated a sitting president",
        "United ACN, CPC, ANPP, and nPDP into formidable APC coalition",
        "Secured President Buhari's return to office in 2019",
        "Demonstrated exceptional political strategy and grassroots mobilization",
        "Built bridges across ethnic, religious, and regional divides",
        "Proved ability to unite Nigerians toward common vision"
      ],
      impact: "Proved exceptional leadership in building consensus and delivering democratic victory",
      testimonial: "President Buhari's first choice for both campaign cycles, an unmatched trust"
    }
  ];

  const educationalExcellence = [
    {
      year: "2024",
      achievement: "Called to Nigerian Bar (BL)",
      institution: "Nigerian Law School, Abuja",
      icon: Scale,
      highlight: "Distinguished Performance"
    },
    {
      year: "2024",
      achievement: "Bachelor of Laws (LLB)",
      institution: "Baze University, Abuja",
      icon: BookOpen,
      highlight: "Excellent Grade"
    },
    {
      year: "2024",
      achievement: "Master of Law (LLM)",
      institution: "King's College London, United Kingdom",
      specialization: "International Corporate and Commercial Law",
      icon: GraduationCap,
      highlight: "International Excellence"
    },
    {
      year: "1987",
      achievement: "BA (Hons) English Studies & Literature",
      institution: "University of Port Harcourt",
      icon: BookOpen,
      highlight: "President, National Union of Rivers State Students (NURSS)"
    }
  ];

  /* Line icons, not emoji: emoji are font-dependent (they arrive as flat glyphs
     on Windows and as a different illustration set on Android), carry their own
     colour, and read as informal beside the ruled type of the rest of the page.
     These stroke at the same weight as every other icon on the site. */
  const impactMetrics = [
    {
      metric: "1,763+",
      label: "KM Rail Lines",
      description: "Modern infrastructure delivered",
      icon: TrainFront
    },
    {
      metric: "11,300+",
      label: "Jobs Created",
      description: "Direct employment opportunities",
      icon: HardHat
    },
    {
      metric: "460+",
      label: "Megawatts",
      description: "Power generation in Rivers State",
      icon: Zap
    },
    {
      metric: "300+",
      label: "Schools Built",
      description: "Educational infrastructure",
      icon: School
    },
    {
      metric: "32",
      label: "Train Stations",
      description: "Ultra modern facilities",
      icon: TrainTrack
    },
    {
      metric: "150+",
      label: "Scholarships",
      description: "International training in China",
      icon: GraduationCap
    },
    {
      metric: "16",
      label: "Years",
      description: "Executive leadership experience",
      icon: CalendarClock
    },
    {
      metric: "314",
      label: "Hectares",
      description: "Songhai Farm, the Largest in West Africa",
      icon: Wheat
    }
  ];

  const leadershipPrinciples = [
    {
      icon: Shield,
      title: "Transparency & Accountability",
      description: "Established Due Process Commission. Every naira accounted for. ₦460M+ railway revenue transparently returned to federal coffers.",
      proof: "Senate granted 'Take a Bow', the highest honor for transparent service"
    },
    {
      icon: Zap,
      title: "Execution Excellence",
      description: "Not just promises, but proven delivery. From the Warri to Itakpe rail abandoned for 30 years, to the modern Lagos to Ibadan line completed ahead of schedule.",
      proof: "1,763+ KM of rail delivered when others only talked"
    },
    {
      icon: Heart,
      title: "People Centered Governance",
      description: "Governance must serve the people. 11,300+ jobs created. 150 scholarships abroad. 300+ schools built. Development you can see and touch.",
      proof: "Returned as Governor with overwhelming support"
    },
    {
      icon: Star,
      title: "Courage & Conviction",
      description: "Stood for rule of law when substituted in 2007. Fought to Supreme Court and won. Defected from PDP to APC on principle. Nigeria needs leaders with backbone.",
      proof: "Supreme Court vindicated his stand for democracy (Oct 26, 2007)"
    }
  ];

  const honours = [
    {
      title: "Commander of the Order of the Niger (CON)",
      body: "Federal Republic of Nigeria",
      year: "National Honour"
    },
    {
      title: "Knight of the Order of Saint John (KSJ)",
      body: "Catholic Church",
      year: "2021"
    },
    {
      title: "Chieftaincy Title, Daura",
      body: "Katsina State Traditional Council",
      year: "2022",
      note: "Congratulated personally by President Buhari"
    },
    {
      title: "Award of Excellence",
      body: "Nigerian Union of Journalists",
      year: "2000"
    },
    {
      title: "'Take a Bow' Senate Recognition",
      body: "9th Nigerian Senate",
      year: "2019",
      note: "For distinguished ministerial service"
    }
  ];

  const whyAmaechi = [
    {
      title: "Proven Track Record",
      points: [
        "16 years of executive leadership (8 as Governor, 7 as Minister)",
        "Successfully managed budgets of many billions of naira transparently",
        "Delivered infrastructure projects on time and within budget",
        "Created thousands of jobs across multiple sectors"
      ]
    },
    {
      title: "National Vision",
      points: [
        "Built infrastructure connecting North, South, East, and West",
        "Led successful campaigns uniting diverse political interests",
        "Understands Nigeria's complexities from grassroots experience",
        "International exposure through King's College London education"
      ]
    },
    {
      title: "Economic Competence",
      points: [
        "Transformed Rivers State economy through infrastructure",
        "Revolutionized Nigeria's transportation and maritime sectors",
        "Attracted foreign investment through port development",
        "Generated revenue while maintaining fiscal responsibility"
      ]
    },
    {
      title: "Democratic Credentials",
      points: [
        "Fought for rule of law to Supreme Court, and won",
        "Champion of legislative independence and separation of powers",
        "Defected on principle when democracy was threatened",
        "Earned trust to lead presidential campaigns twice"
      ]
    }
  ];

  const toggleRole = (id) => {
    setExpandedRole(expandedRole === id ? null : id);
  };

  return (
    <div className="bg-white">
      <PageHeader
        breadcrumb="The Journey"
        kicker="Three decades of public service"
        title="A record built in office, not in interviews."
        lead="30+ years of transformational leadership. 1,763+ KM of rail delivered. 11,300+ jobs created. Nigeria needs a leader who has done it before, not one learning on the job."
        image={assets.Amaechi1}
      >
        <div className="flex flex-col sm:flex-row">
          <Button href="#vision" variant="inverse" size="lg">
            The vision
          </Button>
          <Button href="/join" variant="inverseOutline" size="lg" className="sm:-ml-0.5">
            Join the movement
          </Button>
        </div>
      </PageHeader>

      {/* Presidential Vision */}
      <section id="vision" className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">THE AMAECHI AGENDA</p>
            <h2 className="text-fluid-4xl mb-6">Presidential Vision for Nigeria</h2>
            <p className="prose-body">
              Four pillars of transformation based on proven experience, not empty promises
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {presidentialVision.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-8 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600 group"
                >
                  <div className="flex items-start gap-6">
                    <div className="shrink-0 w-20 h-20 bg-brand-600 flex items-center justify-center group-motion-safe:hover:-translate-y-0.5 group-hover:rotate-6 transition-all duration-300 shadow-e2">
                      <Icon size={40} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-fluid-xl text-ink-950 mb-3">
                        {pillar.title}
                      </h3>
                      <p className="text-ink-700 leading-relaxed mb-4">
                        {pillar.description}
                      </p>
                      <div className="bg-brand-600 text-white px-4 py-2 inline-block font-bold text-sm">
                        {pillar.promise}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Results That Speak</h2>
            <p className="prose-body">
              Measurable achievements from 30+ years of dedicated public service
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {impactMetrics.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="group bg-white p-6 text-center hover:shadow-e2 transition-all duration-300 motion-safe:hover:-translate-y-0.5 border-2 border-ink-100 hover:border-ember-500"
                >
                  <Icon
                    size={32}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="mx-auto mb-4 text-brand-600 transition-colors duration-300 group-hover:text-ember-500"
                  />
                  <div className="text-fluid-4xl text-brand-600 mb-2">
                    {item.metric}
                  </div>
                  <div className="text-sm font-bold text-ink-950 mb-1">
                    {item.label}
                  </div>
                  <div className="text-xs text-ink-600">
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Track Record */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">PROVEN LEADERSHIP</p>
            <h2 className="text-fluid-4xl mb-6">Distinguished Service Record</h2>
            <p className="prose-body">
              16 years of executive leadership. Billions managed transparently. Infrastructure delivered. Jobs created.
            </p>
          </div>

          <div className="space-y-6">
            {keyPositions.map((position) => {
              const Icon = position.icon;
              const isExpanded = expandedRole === position.id;
              
              return (
                <div 
                  key={position.id}
                  className="bg-linear-to-r from-white to-ink-50 shadow-e2 overflow-hidden hover:shadow-e2 transition-all duration-300 border-2 border-ink-100"
                >
                  <button
                    onClick={() => toggleRole(position.id)}
                    className="w-full p-8 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <div className={`shrink-0 w-20 h-20 ${position.color} flex items-center justify-center group-hover:rotate-12 group-motion-safe:hover:-translate-y-0.5 transition-all duration-300 shadow-e2`}>
                        <Icon size={36} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-extrabold text-ink-950 mb-2">
                          {position.title}
                        </h3>
                        <p className="text-brand-600 font-bold text-lg tracking-wide">
                          {position.period}
                        </p>
                        {position.testimonial && (
                          <p className="text-ember-500 font-semibold text-sm mt-2 italic">
                            🏆 {position.testimonial}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 ml-4">
                      {isExpanded ? (
                        <ChevronUp size={32} className="text-brand-600" strokeWidth={3} />
                      ) : (
                        <ChevronDown size={32} className="text-ink-400 group-hover:text-brand-600 transition-colors duration-300" strokeWidth={3} />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-8 pb-8 border-t-2 border-ink-200">
                      <div className="pt-8">
                        <div className="bg-linear-to-r from-brand-600 to-brand-700 text-white p-6 mb-8 shadow-e2">
                          <p className="font-bold text-xl">
                            ✓ {position.impact}
                          </p>
                        </div>

                        <h4 className="text-fluid-xl text-ink-950 mb-6">Major Achievements:</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {position.achievements.map((achievement, idx) => (
                            <div 
                              key={idx}
                              className="flex items-start gap-3 bg-white p-5 border-2 border-ink-100 hover:border-brand-600 hover:shadow-e2 transition-all duration-300"
                            >
                              <CheckCircle className="shrink-0 text-brand-600 mt-0.5" size={24} strokeWidth={3} />
                              <p className="text-ink-700 leading-relaxed font-medium">
                                {achievement}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Leadership Principles */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Leadership Philosophy</h2>
            <p className="prose-body">
              Core values proven through decades of public service
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {leadershipPrinciples.map((principle, index) => {
              const Icon = principle.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-8 shadow-e2 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600 group"
                >
                  <div className="flex items-start gap-6">
                    <div className="shrink-0 w-20 h-20 bg-linear-to-br from-brand-600 to-brand-700 flex items-center justify-center group-motion-safe:hover:-translate-y-0.5 transition-transform duration-300 shadow-e2">
                      <Icon size={36} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-fluid-xl text-ink-950 mb-3">
                        {principle.title}
                      </h3>
                      <p className="text-ink-700 leading-relaxed mb-4">
                        {principle.description}
                      </p>
                      <div className="bg-ember-500 text-white px-4 py-3 font-bold text-sm">
                        ✓ {principle.proof}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Educational Excellence */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <p className="eyebrow mb-5">LIFELONG LEARNER</p>
            <h2 className="text-fluid-4xl mb-6">Educational Excellence</h2>
            <p className="prose-body">
              From student leader to lawyer, a commitment to continuous learning and self improvement
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-10 top-0 bottom-0 w-1 bg-linear-to-b from-brand-600 via-ember-500 to-brand-600 hidden md:block"></div>

              <div className="space-y-8">
                {educationalExcellence.map((edu, index) => {
                  const Icon = edu.icon;
                  return (
                    <div 
                      key={index}
                      className="relative bg-linear-to-r from-white to-ink-50 shadow-e2 p-8 md:ml-24 hover:shadow-e2 transition-all duration-300 border-2 border-ink-100 hover:border-brand-600"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-14 top-10 w-10 h-10 bg-brand-600 border-4 border-white shadow-e2 hidden md:flex items-center justify-center">
                        <div className="w-4 h-4 bg-white"></div>
                      </div>

                      <div className="flex items-start gap-6">
                        <div className="shrink-0 w-20 h-20 bg-linear-to-br from-brand-600 to-ember-500 flex items-center justify-center shadow-e2">
                          <Icon size={36} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="bg-ember-500 text-white px-4 py-2 inline-block font-extrabold text-sm mb-3">
                                {edu.year}
                              </div>
                              <h3 className="text-fluid-xl text-ink-950 mb-2">
                                {edu.achievement}
                              </h3>
                              <p className="text-brand-600 font-bold text-lg">
                                {edu.institution}
                              </p>
                            </div>
                          </div>
                          {edu.specialization && (
                            <div className="bg-ink-100 p-4 mt-4 border-l-4 border-brand-600">
                              <p className="font-bold text-ink-950">
                                Specialization: <span className="text-brand-600">{edu.specialization}</span>
                              </p>
                            </div>
                          )}
                          {edu.highlight && (
                            <div className="mt-4 text-ember-500 font-bold text-sm">
                              🌟 {edu.highlight}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Honours & Recognition */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Honours & Recognition</h2>
            <p className="prose-body">
              National and international recognition for distinguished service
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {honours.map((honour, index) => (
              <div 
                key={index}
                className="bg-white p-8 shadow-e2 hover:shadow-e2 transition-all duration-300 border-2 border-ink-100 hover:border-ember-500 text-center group"
              >
                <div className="w-16 h-16 bg-linear-to-br from-brand-600 to-ember-500 flex items-center justify-center mx-auto mb-6 group-motion-safe:hover:-translate-y-0.5 transition-transform duration-300 shadow-e2">
                  <Award size={32} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-extrabold text-ink-950 mb-3">
                  {honour.title}
                </h3>
                <p className="text-brand-600 font-bold mb-2">
                  {honour.body}
                </p>
                <p className="text-ink-600 text-sm font-semibold">
                  {honour.year}
                </p>
                {honour.note && (
                  <p className="text-ember-500 text-xs font-bold mt-3 italic">
                    {honour.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Amaechi Section */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-14 border-t-2 border-ink-950 pt-7">
            <h2 className="text-fluid-4xl mb-6">Why Amaechi for President?</h2>
            <p className="text-2xl text-ink-600 max-w-4xl mx-auto font-bold">
              Nigeria deserves a leader with PROVEN RESULTS, not just beautiful promises
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {whyAmaechi.map((reason, index) => (
              <div 
                key={index}
                className="bg-white p-8 shadow-e2 hover:shadow-e2 transition-all duration-300 border border-transparent hover:border-brand-600"
              >
                <h3 className="text-fluid-xl text-brand-600 mb-6">
                  {reason.title}
                </h3>
                <div className="space-y-4">
                  {reason.points.map((point, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="shrink-0 text-ember-500 mt-1" size={24} strokeWidth={3} />
                      <p className="text-ink-700 leading-relaxed font-medium">
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supreme Court Victory Highlight */}
      <section className="section bg-linear-to-br from-ink-950 to-ink-800 text-white">
        <div className="shell shell-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-ember-500 px-6 py-3 font-extrabold text-sm tracking-widest mb-6">
                HISTORIC VICTORY
              </div>
              <h2 className="text-fluid-4xl mb-6">
                Standing for Rule of Law
              </h2>
              <p className="text-xl text-white/90 leading-relaxed mb-6">
                In 2007, after winning the PDP primaries, faced unjust substitution. As a believer in democracy and rule of law, took the case to court.
              </p>
              <p className="text-xl text-white/90 leading-relaxed mb-8">
                On <span className="text-ember-500 font-extrabold">October 26, 2007</span>, the Supreme Court ruled him the rightful candidate and winner, a victory for the masses, democracy, and the rule of law.
              </p>
              <div className="bg-white/10 backdrop-blur-sm p-6">
                <p className="text-white/90 leading-relaxed italic">
                  &quot;I believed in the judiciary. I believed in the rule of law. And Nigeria rewarded that faith. This is the kind of leadership Nigeria needs, one that respects institutions and fights for what is right.&quot;
                </p>
              </div>
            </div>

            <div className="bg-linear-to-br from-brand-600 to-brand-700 p-8 md:p-12">
              <h3 className="text-3xl font-extrabold mb-8">
                Democratic Credentials
              </h3>
              <div className="space-y-6">
                {[
                  { title: "2007", desc: "Supreme Court victory, the first Governor to win via court" },
                  { title: "2011", desc: "Returned to office with overwhelming support" },
                  { title: "2013", desc: "Defected to APC on principle, standing against impunity" },
                  { title: "2015", desc: "Led APC to historic victory, defeating a sitting President" },
                  { title: "2019", desc: "Secured President Buhari's return to office as DG" },
                  { title: "2022", desc: "Polled 2nd in APC primaries with 316 delegates votes" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm p-5 hover:bg-white/20 transition-colors duration-300">
                    <p className="text-ember-500 font-extrabold text-lg mb-2">{item.title}</p>
                    <p className="text-white font-semibold">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Campaign CTA */}
      <section id="join" className="bg-linear-to-br from-brand-600 via-brand-700 to-brand-600 text-white py-20 md:py-32 relative overflow-hidden">

        <div className="relative shell md:px-16 text-center">
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8">
            NIGERIA DESERVES BETTER
          </h2>
          <p className="text-2xl md:text-3xl mb-6 text-white/95 font-bold">
            Not promises. PROVEN RESULTS.
          </p>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed">
            1,763+ KM of rail delivered. 11,300+ jobs created. 16 years of executive leadership.
            30+ years of service. Choose experience. Choose results. Choose Amaechi.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="volunteer" 
              className="inline-flex items-center justify-center gap-3 bg-white text-brand-600 px-12 py-6 hover:bg-white/95 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              VOLUNTEER NOW
              <Users size={28} className="group-motion-safe:hover:-translate-y-0.5 transition-transform duration-300" strokeWidth={3} />
            </a>
            <a 
              href="support" 
              className="inline-flex items-center justify-center gap-3 bg-ember-500 text-white px-12 py-6 hover:bg-ember-600 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              DONATE TO CAMPAIGN
              <Heart size={28} strokeWidth={3} />
            </a>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: "36", label: "States to Transform" },
              { num: "200M+", label: "Nigerians to Serve" },
              { num: "4", label: "Years of Progress" },
              { num: "1", label: "Nigeria United" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl font-extrabold text-ember-500 mb-2">{stat.num}</div>
                <div className="text-white/90 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AmaechiPresidentialCampaign;