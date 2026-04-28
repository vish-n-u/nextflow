"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = ["Features", "Workflows", "Integrations", "Pricing", "Docs"];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        className="md:hidden flex flex-col gap-1.5 p-2"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block h-0.5 w-6 bg-white transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Fullscreen overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center gap-8 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="text-2xl font-medium text-zinc-200 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {link}
            </a>
          ))}
          <div className="flex flex-col items-center gap-4 mt-4">
            <Link
              href="/sign-up"
              className="rounded-full bg-white text-black text-sm font-semibold px-8 py-3 w-48 text-center"
              onClick={() => setOpen(false)}
            >
              Sign up for free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full bg-zinc-800 text-white text-sm font-semibold px-8 py-3 w-48 text-center"
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
