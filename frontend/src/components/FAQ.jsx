import React from 'react'
import Nav from '../components/Nav'
import Footer from './Footer';


const faqs = [
  {
    q: 'How does it work?',
    a: '1. Sender selects files and creates a sharing link or QR code. 2. Receiver joins using the link or QR and enters the password. 3. The app uses WebRTC to connect sender and receiver directly (peer-to-peer). 4. Files are sent in encrypted chunks over a secure data channel. 5. Receiver saves files instantly, choosing a folder (Downloads recommended). 6. History and controls let you manage access and track transfers.'
  },
  {
    q: 'Are my files encrypted during transfer?',
    a: 'Yes. All file data is encrypted in transit using WebRTC’s built-in DTLS encryption. Only the sender and receiver can access the files.'
  },
  {
    q: 'Can anyone intercept my files?',
    a: 'No. Files are sent peer-to-peer over an encrypted channel. Even if someone intercepts the network traffic, they cannot decrypt or access your files.'
  },
  {
    q: 'Does the server ever store or see my files?',
    a: 'Never. The server only relays connection setup messages (signaling). File data is never uploaded, stored, or visible to the server.'
  },
  {
    q: 'How does the password or QR code protect my files?',
    a: 'The password and QR code ensure only the intended receiver can join your room and access your files. Without them, no one can connect or download.'
  },
  {
    q: 'Can I revoke or control access after sharing?',
    a: 'Yes. You can disable downloads in real time using the toggle in your history. This instantly blocks further access to your files.'
  },
  {
    q: 'What should I do to keep my transfers safe?',
    a: 'Share your password or QR code only with trusted people. Always use a strong password for sensitive files, and disable downloads when finished.'
  },
  {
    q: 'What is this app? How does it work?',
    a: 'This is a high-speed, privacy-focused file sharing app. It uses WebRTC to transfer files directly between devices, without uploading them to any server. You select files, share a link or QR code, and the receiver downloads them instantly.'
  },
  {
    q: 'Is my data private? Does the server see my files?',
    a: 'Yes, your files are private. The server only helps connect sender and receiver (signaling). All file data is sent peer-to-peer, encrypted in transit, and never stored or seen by the server.'
  },
  {
    q: 'What is WebRTC? Why is it used?',
    a: 'WebRTC is a browser technology for secure, real-time peer-to-peer connections. We use it for fast, direct file transfer, with built-in encryption and NAT traversal.'
  },
  {
    q: 'Why do I need a password or QR code?',
    a: 'The password and QR code ensure only the intended receiver can access your files. They add a layer of security and make sharing easy across devices.'
  },
  {
    q: 'What browsers are supported?',
    a: 'Chrome and Edge are fully supported (including folder picker for saving files). Firefox and Safari work, but may only allow saving files one by one.'
  },
  {
    q: 'Why can’t I save to some folders?',
    a: 'Browsers block saving to system folders (like C:\, Windows, Program Files) for security. Please choose Downloads, Documents, or Desktop.'
  },
  {
    q: 'How fast is the transfer? Any limits?',
    a: 'Transfers are as fast as your network allows—often hundreds of MB/s on local Wi-Fi. There is no hard file size limit, but very large files may be slower on weak networks.'
  },
  {
    q: 'What if the connection fails?',
    a: 'If the connection fails, refresh both sender and receiver, and try again. If you’re on a corporate or VPN network, peer-to-peer may be blocked.'
  },
  {
    q: 'Can I share multiple files? Are they zipped?',
    a: 'Yes, you can share multiple files. They are sent and saved individually—no zip required. On supported browsers, you can save all files at once.'
  },
  {
    q: 'What is the History section for?',
    a: 'The History section shows all your recent transfers, lets you copy links, download files again, and control download permissions in real time.'
  },
  {
    q: 'Are my files encrypted during transfer?',
    a: 'Yes. All file data is encrypted in transit using WebRTC’s built-in DTLS encryption. Only the sender and receiver can access the files.'
  },
  {
    q: 'Can anyone intercept my files?',
    a: 'No. Files are sent peer-to-peer over an encrypted channel. Even if someone intercepts the network traffic, they cannot decrypt or access your files.'
  },
  {
    q: 'Does the server ever store or see my files?',
    a: 'Never. The server only relays connection setup messages (signaling). File data is never uploaded, stored, or visible to the server.'
  },
  {
    q: 'How does the password or QR code protect my files?',
    a: 'The password and QR code ensure only the intended receiver can join your room and access your files. Without them, no one can connect or download.'
  },
  {
    q: 'Can I revoke or control access after sharing?',
    a: 'Yes. You can disable downloads in real time using the toggle in your history. This instantly blocks further access to your files.'
  },
  {
    q: 'What should I do to keep my transfers safe?',
    a: 'Share your password or QR code only with trusted people. Always use a strong password for sensitive files, and disable downloads when finished.'
  },
  {
    q: 'What is this app? How does it work?',
    a: 'This is a high-speed, privacy-focused file sharing app. It uses WebRTC to transfer files directly between devices, without uploading them to any server. You select files, share a link or QR code, and the receiver downloads them instantly.'
  },
  {
    q: 'Is my data private? Does the server see my files?',
    a: 'Yes, your files are private. The server only helps connect sender and receiver (signaling). All file data is sent peer-to-peer, encrypted in transit, and never stored or seen by the server.'
  },
  {
    q: 'What is WebRTC? Why is it used?',
    a: 'WebRTC is a browser technology for secure, real-time peer-to-peer connections. We use it for fast, direct file transfer, with built-in encryption and NAT traversal.'
  },
  {
    q: 'Why do I need a password or QR code?',
    a: 'The password and QR code ensure only the intended receiver can access your files. They add a layer of security and make sharing easy across devices.'
  },
  {
    q: 'What browsers are supported?',
    a: 'Chrome and Edge are fully supported (including folder picker for saving files). Firefox and Safari work, but may only allow saving files one by one.'
  },
  {
    q: 'Why can’t I save to some folders?',
    a: 'Browsers block saving to system folders (like C:\, Windows, Program Files) for security. Please choose Downloads, Documents, or Desktop.'
  },
  {
    q: 'How fast is the transfer? Any limits?',
    a: 'Transfers are as fast as your network allows—often hundreds of MB/s on local Wi-Fi. There is no hard file size limit, but very large files may be slower on weak networks.'
  },
  {
    q: 'What if the connection fails?',
    a: 'If the connection fails, refresh both sender and receiver, and try again. If you’re on a corporate or VPN network, peer-to-peer may be blocked.'
  },
  {
    q: 'Can I share multiple files? Are they zipped?',
    a: 'Yes, you can share multiple files. They are sent and saved individually—no zip required. On supported browsers, you can save all files at once.'
  },
  {
    q: 'What is the History section for?',
    a: 'The History section shows all your recent transfers, lets you copy links, download files again, and control download permissions in real time.'
  }
];

import { useState } from 'react';

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(null);
  const toggle = idx => setOpenIdx(openIdx === idx ? null : idx);
  return (
    <div>
      <Nav />
      <div className="max-w-3xl mx-auto py-8 px-4 mb-32">
        <h1 className="text-2xl font-bold mb-6">Frequently Asked Questions</h1>
        <div className="space-y-6 mx-4">
          {faqs.map((item, idx) => (
            <div key={idx} className="border-b pb-4">
              <button
                className="w-full text-left flex items-center justify-between font-semibold text-lg mb-2 focus:outline-none"
                onClick={() => toggle(idx)}
                aria-expanded={openIdx === idx}
              >
                {item.q}
                <span className={`ml-2 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {openIdx === idx && (
                <p className="text-gray-700 mt-2">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default FAQ