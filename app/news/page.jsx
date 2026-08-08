'use client'
import React, { useState } from "react";
import { Calendar, Clock, User, ArrowRight, Share2, Bookmark, ExternalLink, Search, Filter, ChevronRight, Megaphone, Users, Shield, TrendingUp, Eye, MessageCircle } from "lucide-react";
import Image from "next/image";
import { assets } from "../../assets/assets";
import PageHeader from "@/components/ui/PageHeader";
import { featuredNews, recentNews } from "@/lib/news";

const AmaechiNews = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "all", label: "All News", icon: TrendingUp },
    { id: "campaign", label: "Campaign", icon: Megaphone },
    { id: "electoral", label: "Electoral Reform", icon: Shield },
    { id: "governance", label: "Governance", icon: Users },
  ];


  const NewsCard = ({ article, size = "normal" }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isFeatured = size === "featured";

    return (
      <article className={`bg-white overflow-hidden shadow-e2 hover:shadow-e2 transition-all duration-300 ${isFeatured ? 'lg:col-span-2' : ''} group`}>
        {/* Image */}
        <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent z-10"></div>
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover group-motion-safe:hover:-translate-y-0.5 transition-transform duration-700"
          />
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4 z-20">
            <span className="bg-brand-600 text-white px-4 py-2 text-xs font-extrabold tracking-wider shadow-e2">
              {article.category.toUpperCase()}
            </span>
          </div>

          {/* Featured Badge */}
          {article.featured && (
            <div className="absolute top-4 right-4 z-20">
              <span className="bg-ember-500 text-white px-4 py-2 text-xs font-extrabold tracking-wider shadow-e2 flex items-center gap-2">
                <TrendingUp size={14} strokeWidth={3} />
                BREAKING
              </span>
            </div>
          )}

          {/* Quick Stats Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-4 text-white text-sm">
            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span className="font-semibold">{article.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span className="font-semibold">{article.readTime}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-ink-600">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-brand-600" />
              <span className="font-semibold">{article.date}</span>
            </div>
            {article.location && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-ink-400"></span>
                <span className="font-semibold">{article.location}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className={`font-extrabold text-ink-950 mb-4 leading-tight hover:text-brand-600 transition-colors cursor-pointer ${
            isFeatured ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl'
          }`}>
            {article.title}
          </h2>

          {/* Excerpt */}
          <p className="text-ink-700 leading-relaxed mb-6 text-base md:text-lg">
            {article.excerpt}
          </p>

          {/* Highlights (Featured Only) */}
          {article.highlights && isFeatured && !isExpanded && (
            <div className="mb-6 bg-white p-6">
              <h3 className="font-extrabold text-ink-950 mb-4 text-lg">Key Highlights:</h3>
              <ul className="space-y-3">
                {article.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <ChevronRight className="text-brand-600 shrink-0 mt-0.5" size={20} strokeWidth={3} />
                    <span className="text-ink-700 font-medium">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Content (Expandable for Featured) */}
          {article.content && isExpanded && (
            <div className="mb-6 prose prose-lg max-w-none">
              <div className="text-ink-700 leading-relaxed whitespace-pre-line">
                {article.content}
              </div>
            </div>
          )}

          {/* Tags */}
          {article.tags && (
            <div className="flex flex-wrap gap-2 mb-6">
              {article.tags.map((tag, idx) => (
                <span key={idx} className="bg-ink-100 text-ink-700 px-3 py-1 text-xs font-bold hover:bg-brand-600 hover:text-white transition-colors cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-ink-200">
            <div className="flex items-center gap-3">
              {isFeatured && article.content && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-2 text-brand-600 font-bold hover:gap-3 transition-all duration-300"
                >
                  {isExpanded ? 'Show Less' : 'Read Full Story'}
                  <ArrowRight size={18} strokeWidth={3} />
                </button>
              )}
              {!isFeatured && (
                <button className="inline-flex items-center gap-2 text-brand-600 font-bold hover:gap-3 transition-all duration-300">
                  Read More
                  <ArrowRight size={18} strokeWidth={3} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 bg-ink-100 hover:bg-brand-600 flex items-center justify-center transition-colors group/btn" aria-label="Share">
                <Share2 size={18} className="text-ink-600 group-hover/btn:text-white" />
              </button>
              <button className="w-10 h-10 bg-ink-100 hover:bg-ember-500 flex items-center justify-center transition-colors group/btn" aria-label="Bookmark">
                <Bookmark size={18} className="text-ink-600 group-hover/btn:text-white" />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="bg-white">
      <PageHeader
        breadcrumb="Newsroom"
        kicker="Statements, coverage and campaign updates"
        title="The Newsroom"
        lead="Every statement, appearance and piece of coverage, collected in one place."
        image={assets.Pro1}
      />

      {/* Search and Filter Bar. Pins beneath the masthead, not under it.
          --masthead-offset is published by Navbar and follows the bar as it
          condenses and retracts. */}
      <section className="bg-white border-b border-ink-200 sticky top-(--masthead-offset,0px) z-30 transition-[top] duration-300 ease-out-quart">
        <div className="shell shell-wide py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={20} />
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-ink-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none font-semibold"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all duration-300 ${
                      selectedCategory === cat.id
                        ? 'bg-brand-600 text-white shadow-e2 '
                        : 'bg-white text-ink-700 hover:bg-ink-100'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Breaking News Alert */}
      <section className="bg-ember-500 text-white py-4">
        <div className="shell shell-wide">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Megaphone size={24} className="animate-pulse" strokeWidth={2.5} />
              <span className="font-extrabold text-sm tracking-wider">BREAKING:</span>
            </div>
            <p className="font-semibold">
              Amaechi Storms Electronic Transmission Protest, Demands Electoral Transparency • 
              ADC AMAC Campaign Rally Draws Massive Turnout
            </p>
          </div>
        </div>
      </section>

      {/* Featured News Grid */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={32} className="text-brand-600" strokeWidth={2.5} />
              <h2 className="text-fluid-4xl">Featured Stories</h2>
            </div>
            <p className="prose-body">
              Top headlines and breaking developments
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {featuredNews.map((article) => (
              <NewsCard key={article.id} article={article} size="featured" />
            ))}
          </div>
        </div>
      </section>

      {/* Recent News */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={32} className="text-brand-600" strokeWidth={2.5} />
              <h2 className="text-fluid-4xl">Recent Updates</h2>
            </div>
            <p className="prose-body">
              Latest news and campaign developments
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="section bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-16 lg:px-24">
          <div className="bg-linear-to-br from-brand-600 to-brand-700 p-12 md:p-16 text-white text-center shadow-e2">
            <Megaphone size={64} className="mx-auto mb-8 text-ember-500" strokeWidth={1.5} />
            <h2 className="text-fluid-4xl mb-6">
              Stay Informed
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Get the latest news, campaign updates, and exclusive insights delivered to your inbox.
            </p>
            <form className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 text-ink-950 font-semibold focus:outline-none focus:ring-4 focus:ring-white/30"
              />
              <button 
                type="submit"
                className="bg-ember-500 text-white px-10 py-4 font-bold hover:bg-ember-600 transition-all duration-300 shadow-e2 hover:shadow-e2 flex items-center justify-center gap-2"
              >
                Subscribe
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </form>
            <p className="text-white/60 text-sm mt-6">
              Join 100K+ Nigerians following the campaign. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="section bg-white">
        <div className="shell shell-wide">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-fluid-4xl mb-6">Media Inquiries</h2>
              <p className="prose-body mb-8 leading-relaxed">
                For press releases, interview requests, and media partnerships, contact our communications team.
              </p>
              <div className="space-y-4">
                <a href="mailto:Mapnigeria2027@gmail.com" className="flex items-center gap-3 text-lg font-semibold text-brand-600 hover:gap-4 transition-all">
                  <ExternalLink size={20} strokeWidth={2.5} />
                  Mapnigeria2027@gmail.com
                </a>
                <a href="tel:+2349076579517" className="flex items-center gap-3 text-lg font-semibold text-brand-600 hover:gap-4 transition-all">
                  <ExternalLink size={20} strokeWidth={2.5} />
                  +234 907 657 9517
                </a>
              </div>
            </div>

            <div className="bg-white p-8 shadow-e2 border border-ink-200">
              <h3 className="text-fluid-xl mb-6">Follow the Campaign</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Twitter", followers: "2.5M" },
                  { name: "Facebook", followers: "5M" },
                  { name: "Instagram", followers: "1.8M" },
                  { name: "YouTube", followers: "800K" }
                ].map((social, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className="bg-white hover:bg-brand-600 p-4 transition-all duration-300 group text-center"
                  >
                    <div className="font-extrabold text-2xl text-ink-950 group-hover:text-white mb-1">
                      {social.followers}
                    </div>
                    <div className="text-sm text-ink-600 group-hover:text-white font-semibold">
                      {social.name}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-br from-brand-600 via-brand-700 to-brand-600 text-white py-20 md:py-32">
        <div className="shell md:px-16 text-center">
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8">
            BE PART OF THE STORY
          </h2>
          <p className="text-2xl md:text-3xl mb-12 text-white/95 max-w-4xl mx-auto leading-relaxed">
            Follow our journey. Share our vision. Join the movement for proven leadership.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="/volunteer" 
              className="inline-flex items-center justify-center gap-3 bg-white text-brand-600 px-12 py-6 hover:bg-white/95 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              <Users size={28} strokeWidth={3} />
              VOLUNTEER NOW
            </a>
            <a 
              href="/connect" 
              className="inline-flex items-center justify-center gap-3 bg-ember-500 text-white px-12 py-6 hover:bg-ember-600 transition-all duration-300 font-extrabold text-xl tracking-wide group shadow-e2 hover:shadow-e2 motion-safe:hover:-translate-y-0.5"
            >
              <MessageCircle size={28} strokeWidth={3} />
              GET IN TOUCH
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AmaechiNews;