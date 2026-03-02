import React from 'react'
import Nav from '../components/Nav'
import  Footer from '../components/Footer'

const About = () => {
  return (
    <div>
      <Nav />
      <section className="max-w-4xl mx-auto mb-8 py-12 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">About FileSharing</h1>
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Ultra-fast, Private, Peer-to-Peer File Sharing</h2>
          <p className="text-lg text-gray-700 mb-6">Welcome to FileSharing, your secure and instant solution for sending files directly between devices—no cloud, no waiting, no compromise.</p>
          <p className="text-md text-gray-600 mb-2">Our mission is to make file transfer effortless, private, and accessible for everyone. Whether you’re sharing photos, documents, or large videos, FileSharing is built for speed, privacy, and simplicity.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-blue-50 rounded-lg p-6 flex flex-col items-center text-center shadow">
            <span className="text-blue-500 text-3xl mb-2">⚡</span>
            <h2 className="font-semibold text-lg mb-2">Blazing Fast</h2>
            <p className="text-gray-700">Transfers happen directly between devices, often hundreds of MB/s on local Wi-Fi.</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6 flex flex-col items-center text-center shadow">
            <span className="text-blue-500 text-3xl mb-2">🔒</span>
            <h2 className="font-semibold text-lg mb-2">Private & Secure</h2>
            <p className="text-gray-700">Files are encrypted in transit and never stored on any server. Only sender and receiver can access them.</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6 flex flex-col items-center text-center shadow">
            <span className="text-blue-500 text-3xl mb-2">🤝</span>
            <h2 className="font-semibold text-lg mb-2">Peer-to-Peer</h2>
            <p className="text-gray-700">No cloud uploads. Your files go straight from you to your recipient, instantly.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-8 mb-10">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">Why Choose FileSharing?</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 text-lg">
            <li><span className="font-semibold text-blue-700">Instant Transfers:</span> Send files in seconds, not minutes.</li>
            <li><span className="font-semibold text-blue-700">Total Privacy:</span> Your files are never stored or scanned by any server.</li>
            <li><span className="font-semibold text-blue-700">Cross-Platform:</span> Works on phones, tablets, and computers—no app install required.</li>
            <li><span className="font-semibold text-blue-700">Easy Sharing:</span> Share via QR code, password, or link. Works across devices and platforms.</li>
            <li><span className="font-semibold text-blue-700">No Limits:</span> Send any file, any size, anywhere. No zipping, no waiting, no restrictions.</li>
          </ul>
        </div>
        <div className="bg-blue-50 rounded-xl shadow p-8 mb-10">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">How FileSharing Works</h2>
          <ol className="list-decimal list-inside text-gray-700 space-y-2 text-lg">
            <li><span className="font-semibold text-blue-700">Select Your Files:</span> Choose any files you want to send.</li>
            <li><span className="font-semibold text-blue-700">Share the Link or QR:</span> Send the secure link or QR code to your recipient.</li>
            <li><span className="font-semibold text-blue-700">Direct Transfer:</span> Files are sent instantly, peer-to-peer, with end-to-end encryption.</li>
          </ol>
          <div className="flex justify-center mt-8">
            <img src="/work.png" alt="How FileSharing Works" className="rounded-lg shadow-lg max-w-full h-auto" />
          </div>
          <div className="mt-6 text-center">
            <span className="inline-block bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow hover:bg-blue-800 transition">Ready to Send? Start sharing files instantly and securely!</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-8 mb-10 flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0">
            <h2 className="text-xl font-bold text-blue-900 mb-2">Our Technology</h2>
            <p className="text-gray-700 mb-2">FileSharing is built with React, Vite, WebRTC, Socket.IO, Node.js, Express, and MySQL for speed, privacy, and reliability.</p>
            <p className="font-semibold text-blue-700">Designed & Developed by Nikesh Shah</p>
          </div>
          <div className="text-left md:text-right">
            <h2 className="text-xl font-bold text-blue-900 mb-2">Contact Us</h2>
            <p className="text-gray-700">nikeshah0454@gmail.com</p>
            <p className="text-gray-700">Biratnagar, Nepal</p>
          </div>
        </div>

      </section>
          <Footer />

    </div>
  )
}

export default About