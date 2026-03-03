import React from 'react'
import {BrowserRouter as Router,Routes,Route} from 'react-router-dom';
import Sender from './components/Sender';
import Receiver from './components/Receiver';
import QrView from './pages/QrView';
import './index.css';
import Register from './components/Register';
import Login from './components/Login';
import Homepage from './pages/Homepage';
import FAQ from './components/FAQ';
import About from './components/About';
import ReceiveLanding from './pages/ReceiveLanding';
import AdminPanel from './components/AdminPanel';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
const App = () => {
  return (

    <Router>
      <Routes>
        {/* <Route path="/sender" element={<Sender />} /> */}
        <Route path="/receiver/:roomId" element={<Receiver />} />
        <Route path="/receive" element={<ReceiveLanding />} />
  <Route path="/qr" element={<QrView />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Homepage />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminPanel />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App