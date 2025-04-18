'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const adminCredentials = [
    { id: "admin1", password: "pass123" },
    { id: "admin2", password: "secure456" },
    { id: "admin3", password: "admin789" },
    { id: "admin4", password: "test101" },
    { id: "admin5", password: "login2024" }
  ];

  const validateLogin = () => {
    const isValid = adminCredentials.some(
      admin => admin.id === adminId && admin.password === adminPassword
    );

    if (isValid) {
      setErrorMessage('');
      if (typeof window !== 'undefined') {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            router.push(`/map?lat=${latitude}&lng=${longitude}`);
          },
          () => {
            alert("Location access denied or unavailable.");
          }
        );
      }
    } else {
      setErrorMessage('Invalid Admin ID or Password.');
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-black/50 z-10" />
        <Image
          src="/images/earth_10639144.png"
          alt="Earth Background"
          fill
          className="object-cover"
          quality={100}
          priority={true}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-20 min-h-screen flex items-center justify-center">
        <div className="login-container bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-2xl w-96 border border-white/20">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            Admin Login
          </h2>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            placeholder="Enter Admin ID"
            className="w-full mb-4 p-2 rounded bg-white/20 backdrop-blur-sm 
                     border border-white/10 text-white placeholder-white/70
                     focus:outline-none focus:ring-2 focus:ring-white/50"
            required
          />
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full mb-4 p-2 rounded bg-white/20 backdrop-blur-sm 
                     border border-white/10 text-white placeholder-white/70
                     focus:outline-none focus:ring-2 focus:ring-white/50"
            required
          />
          <button
            onClick={validateLogin}
            className="w-full bg-white/20 hover:bg-white/30 text-white p-2 
                     rounded transition-colors border border-white/30
                     backdrop-blur-sm"
          >
            Login
          </button>
          {errorMessage && (
            <p className="text-red-300 text-sm mt-2 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
