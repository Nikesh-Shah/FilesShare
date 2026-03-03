import React from 'react';
import { Linkedin, Instagram } from 'lucide-react';

const Footer = () => (
			<footer className="w-full z-50 bg-gradient-to-r from-blue-900 via-gray-900 to-blue-900 text-gray-100 shadow-lg">
			<div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-wrap items-center justify-between gap-y-2">
				<div className="flex flex-col sm:flex-row items-center mb-2 sm:mb-0 text-center sm:text-left w-full sm:w-auto">
					{/* Logo/Icon */}
					<span className="mr-2 text-blue-400 text-2xl">🔗</span>
					<span className="font-bold text-lg tracking-tight">TabShare</span>
					<span className="mx-2 hidden sm:inline">|</span>
					<span className="text-sm text-gray-300 hidden sm:inline">Ultra-fast, private, peer-to-peer file transfer</span>
				</div>
				<div className="flex flex-wrap justify-center sm:justify-start space-x-0 sm:space-x-4 w-full sm:w-auto">
					<a href="/" className="px-3 py-1 m-1 rounded hover:bg-blue-800 hover:text-white transition font-medium">Home</a>
					<a href="/faq" className="px-3 py-1 m-1 rounded hover:bg-blue-800 hover:text-white transition font-medium">FAQ</a>
					<a href="https://github.com/Nikesh-Shah" target="_blank" rel="noopener noreferrer" className="px-3 py-1 m-1 rounded hover:bg-blue-800 hover:text-white transition font-medium">GitHub</a>
				</div>
				<div className="text-xs text-gray-300 text-center sm:text-right w-full sm:w-auto">
					&copy; {new Date().getFullYear()} TabShare. All rights reserved.
					<div className="mt-1">Designed & Developed by <span className="font-semibold text-white">Nikesh Shah</span></div>
					<div className="flex items-center justify-center sm:justify-end gap-3 mt-2">
						<a href="https://www.linkedin.com/in/nikesh-shah-a89b7b359/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-300 hover:text-blue-400 transition" aria-label="LinkedIn">
							<Linkedin size={16} /> <span>LinkedIn</span>
						</a>
						<a href="https://www.instagram.com/itsnikesh_11/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-300 hover:text-pink-400 transition" aria-label="Instagram">
							<Instagram size={16} /> <span>Instagram</span>
						</a>
					</div>
				</div>
			</div>
		</footer>
);

export default Footer;
