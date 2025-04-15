"use client";

import Link from "next/link";
import {
  Building,
  Contact,
  Info,
  LucideGitGraph,
  ScrollText,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth"; // Import your useAuth hook
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import RETxlogo from "../public/RETxlogo.png";

export default function Navbar() {
  const { username, signOut } = useAuth(); // Get the auth state and signOut function
  const router = useRouter(); // Initialize useRouter for navigation

  const handleSignOut = () => {
    signOut(); // Log the user out
    router.push("/"); // Redirect to the home page
  };

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center relative z-10">
      <Link href="/" className="flex items-center justify-center">
        <Image
          src="/RETx_logo-removebg-preview.png"
          alt="Retx Logo"
          width={60}
          height={60}
          className="object-contain px-2"
        />
        <span className="font-bold">RETx</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <Link
          className="text-sm flex gap-2 items-center font-medium hover:underline underline-offset-4"
          href="/collections"
        >
          <LucideGitGraph />
          Collections
        </Link>
        <Link
          className="text-sm flex gap-2 items-center font-medium hover:underline underline-offset-4"
          href="/marketplace"
        >
          <ScrollText />
          Market Place
        </Link>
        <Link
          className="text-sm flex gap-2 items-center font-medium hover:underline underline-offset-4"
          href="/postlisting"
        >
          <ScrollText />
          Post Listing
        </Link>
        <Link
          className="text-sm flex gap-2 items-center font-medium hover:underline underline-offset-4"
          href="/about"
        >
          <Info />
          About
        </Link>
        {!username ? ( // Show Signup/Login only if the user is not signed in
          <Link
            className="text-sm flex gap-2 items-center font-medium hover:underline underline-offset-4"
            href="/signin"
          >
            <Contact />
            Signup/Login
          </Link>
        ) : (
          <button
            onClick={handleSignOut} // Handle sign out and redirect
            className="text-sm flex gap-2 items-center font-medium text-red-500 hover:underline underline-offset-4"
          >
            Sign Out
          </button>
        )}
      </nav>
    </header>
  );
}
