

import React, { useState, useEffect, useRef } from "react"
import { Share2, Menu, X, User, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from "react-router-dom"

const Nav = () => {
  const [open, setOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  // Unified login-state check function
  const checkLoginStatus = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const email = localStorage.getItem('email') || sessionStorage.getItem('email')
    setIsLoggedIn(!!token)
    setUserEmail(email || '')
  }

  // Check login status on mount and react to storage + custom events
  useEffect(() => {
    checkLoginStatus()
    const onStorage = () => checkLoginStatus()
    const onUserLogin = () => checkLoginStatus()
    const onUserLogout = () => checkLoginStatus()
    window.addEventListener('storage', onStorage)
    window.addEventListener('userLogin', onUserLogin)
    window.addEventListener('userLogout', onUserLogout)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('userLogin', onUserLogin)
      window.removeEventListener('userLogout', onUserLogout)
    }
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const isActive = (path) => pathname === path

  const baseLink =
    "inline-flex items-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
  const inactiveLink = "text-gray-700 hover:text-blue-600"
  const activeLink = "text-blue-700"

  const closeMenu = () => setOpen(false)

  const handleLogout = () => {
    console.log('Logout clicked - before clearing storage')
    console.log('Current token:', localStorage.getItem('token') || sessionStorage.getItem('token'))
    console.log('Current email:', localStorage.getItem('email') || sessionStorage.getItem('email'))
    
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('email')
    
    console.log('After clearing storage:')
    console.log('Token:', localStorage.getItem('token') || sessionStorage.getItem('token'))
    console.log('Email:', localStorage.getItem('email') || sessionStorage.getItem('email'))
    
    setIsLoggedIn(false)
    setUserEmail('')
    setShowUserMenu(false)
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new Event('userLogout'))
    console.log('Logout event dispatched')
    
    navigate('/')
    console.log('Navigated to home')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            className="group flex items-center gap-2"
            onClick={closeMenu}
          >
            <Share2 className="h-7 w-7 text-blue-600 transition-transform group-hover:scale-105" />
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              TabShare
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              to="/"
              className={`${baseLink} ${isActive("/") ? activeLink : inactiveLink}`}
            >
              Home
            </Link>
            <Link
              to="/faq"
              className={`${baseLink} ${isActive("/faq") ? activeLink : inactiveLink}`}
            >
              FAQ
            </Link>
            <Link
              to="/about"
              className={`${baseLink} ${isActive("/about") ? activeLink : inactiveLink}`}
            >
              About
            </Link> 

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className={`${baseLink} ${isActive("/login") ? activeLink : inactiveLink}`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`${baseLink} ${isActive("/register") ? activeLink : inactiveLink}`}
                >
                  Register
                </Link>
              </>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    console.log('User menu button clicked, current state:', showUserMenu)
                    setShowUserMenu(!showUserMenu)
                  }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:block">{userEmail}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                      {userEmail}
                    </div>
                    <button
                      onClick={() => {
                        console.log('Logout button clicked')
                        handleLogout()
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`md:hidden ${open ? "block" : "hidden"}`}
      >
        <nav className="border-t border-gray-200 bg-white shadow-sm">
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
            <li>
              <Link
                to="/"
                onClick={closeMenu}
                className={`${baseLink} ${
                  isActive("/") ? "text-blue-700" : "text-gray-700 hover:text-blue-600"
                } w-full rounded-md px-2 py-2`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/faq"
                onClick={closeMenu}
                className={`${baseLink} ${
                  isActive("/faq") ? "text-blue-700" : "text-gray-700 hover:text-blue-600"
                } w-full rounded-md px-2 py-2`}
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                onClick={closeMenu}
                className={`${baseLink} ${
                  isActive("/about") ? "text-blue-700" : "text-gray-700 hover:text-blue-600"
                } w-full rounded-md px-2 py-2`}
              >
                About
              </Link>
            </li>
            
            {!isLoggedIn ? (
              <>
                <li>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className={`${baseLink} ${
                      isActive("/login") ? "text-blue-700" : "text-gray-700 hover:text-blue-600"
                    } w-full rounded-md px-2 py-2`}
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className={`${baseLink} ${
                      isActive("/register") ? "text-blue-700" : "text-gray-700 hover:text-blue-600"
                    } w-full rounded-md px-2 py-2`}
                  >
                    Register
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700">
                    <User className="h-4 w-4" />
                    <span>{userEmail}</span>
                  </div>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleLogout()
                      closeMenu()
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:text-blue-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Nav