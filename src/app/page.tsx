"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = ["Features", "Workflows", "Integrations", "Pricing", "Docs"];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-white font-bold text-xl tracking-tight">NextFlow</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-300 font-medium">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-white transition-colors duration-150"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-full bg-white text-black text-sm font-semibold px-5 py-2 hover:bg-zinc-200 transition-colors duration-150"
          >
            Sign up for free
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full bg-zinc-800 text-white text-sm font-semibold px-5 py-2 hover:bg-zinc-700 transition-colors duration-150"
          >
            Log in
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center gap-8 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="text-2xl font-medium text-zinc-200 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              {link}
            </a>
          ))}
          <div className="flex flex-col items-center gap-4 mt-4">
            <Link
              href="/sign-up"
              className="rounded-full bg-white text-black text-sm font-semibold px-8 py-3 w-48 text-center"
              onClick={() => setMenuOpen(false)}
            >
              Sign up for free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full bg-zinc-800 text-white text-sm font-semibold px-8 py-3 w-48 text-center"
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <main className="flex flex-col items-center text-center pt-40 pb-20 px-6 flex-1">
        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight max-w-4xl">
          <span className="text-zinc-400">NextFlow</span> is the world&apos;s most
          powerful workflow automation platform.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-xl">
          Build, run, and monitor AI-powered workflows — visually, in real time,
          for free.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-full bg-white text-black text-base font-semibold px-8 py-3 hover:bg-zinc-200 transition-colors duration-150 w-48 text-center"
          >
            Start for free
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-800 text-white text-base font-semibold px-8 py-3 hover:bg-zinc-700 transition-colors duration-150 border border-zinc-700 w-48 text-center"
          >
            Launch App
          </Link>
        </div>

        {/* App preview */}
        <div className="mt-16 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
          {/* Fake window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
          </div>
          {/* Mock canvas */}
          <div className="relative h-64 sm:h-80 md:h-96 bg-zinc-900 flex items-center justify-center overflow-hidden">
            {/* Faint grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {/* Mock nodes */}
            <div className="relative flex items-center gap-6 sm:gap-12">
              <div className="rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 shadow-lg">
                Trigger
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 sm:w-16 h-px bg-zinc-600" />
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
              </div>
              <div className="rounded-xl bg-zinc-800 border border-zinc-600 px-5 py-3 text-sm font-medium text-zinc-200 shadow-lg">
                AI Model
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 sm:w-16 h-px bg-zinc-600" />
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
              </div>
              <div className="rounded-xl bg-zinc-800 border border-zinc-600 px-5 py-3 text-sm font-medium text-zinc-200 shadow-lg">
                Output
              </div>
            </div>
            {/* Prompt bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-xl px-6 py-3 text-sm text-zinc-400 w-64 sm:w-80 text-center shadow-lg">
              Let&apos;s build something
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
