import React from 'react';

const steps = [
	'Sender selects files and creates a sharing link or QR code.',
	'Receiver joins using the link or QR and enters the password.',
	'App uses WebRTC to connect sender and receiver directly (peer-to-peer).',
	'Files are sent in encrypted chunks over a secure data channel.',
	'Receiver saves files instantly, choosing a folder (Downloads recommended).',
	'History and controls let you manage access and track transfers.'
];

const HowItWorks = () => (
	<section className="max-w-5xl mx-auto mt-4 mb-4  flex flex-col md:flex-row items-center ">
		<div className="md:w-1/2 w-full flex justify-center">
			<img src="/howitworks.png" alt="How it works" className="rounded-lg shadow-lg w-full max-w-md" />
		</div>
		<div className="md:w-1/2 w-full">
			<h2 className="text-3xl font-bold mb-6 text-gray-900">How It Works</h2>
			<ol className="list-decimal list-inside space-y-4 text-lg text-gray-700">
				{steps.map((step, idx) => (
					<li key={idx}>{step}</li>
				))}
			</ol>
		</div>
	</section>
);

export default HowItWorks;
