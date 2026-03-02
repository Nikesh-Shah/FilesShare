import React from 'react'
import Nav from '../components/Nav'
import Sender from '../components/Sender'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom';

const Homepage = () => {
  const navigate = useNavigate();
  return (
    <>
      <Nav />
      {/* Send / Receive choice banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-gray-900">What do you want to do?</h2>
            <p className="text-sm text-gray-500 mt-0.5">Send files or text, or receive using a 6-character code.</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              ↑ Send
            </a>
            <button
              onClick={() => navigate('/receive')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              ↓ Receive via Code
            </button>
          </div>
        </div>
      </div>
      <Sender />
      <div style={{ marginTop: '2rem' }}></div>
      <Footer />
    </>
  )
}

export default Homepage;