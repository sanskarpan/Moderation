import React, { useState, useEffect, useRef } from 'react'; 
import { Link, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { getInitials, cn } from '../../lib/utils'; 
import NotificationCenter from '../ui/notification-center';

const Header = ({ toggleSidebar, isDarkMode, toggleDarkMode }) => {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown
  const dropdownRef = useRef(null); // Ref for click outside detection

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false); // Close dropdown on sign out
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className="sticky top-0 z-30 border-b border-secondary-200 bg-white shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left side: Sidebar Toggle & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800 md:hidden" // Hide on medium+ screens if sidebar is always visible there
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link to="/" className="flex items-center gap-2">
             {/* Optional: Add a logo SVG here */}
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">ContentGuard</span>
          </Link>
        </div>

        {/* Right side: Dark Mode, Nav, Notifications, User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="rounded-md p-2 text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <circle cx="12" cy="12" r="5" /> <line x1="12" y1="1" x2="12" y2="3" /> <line x1="12" y1="21" x2="12" y2="23" /> <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /> <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /> <line x1="1" y1="12" x2="3" y2="12" /> <line x1="21" y1="12" x2="23" y2="12" /> <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /> <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /> </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> </svg>
            )}
          </button>

          {/* Auth State */}
          {isSignedIn ? (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Dashboard Link - potentially hide on smaller screens if sidebar has it */}
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>

              <NotificationCenter />

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}> {/* Add ref here */}
                  <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)} // Toggle state on click
                      className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="User menu"
                      aria-expanded={isDropdownOpen}
                    >
                     <div className="hidden md:block">
                         {/* Use optional chaining for user properties */}
                         <p className="text-sm font-medium">{user?.fullName || user?.username || 'User'}</p>
                     </div>
                     <Avatar>
                        <AvatarImage src={user?.imageUrl} alt={user?.fullName || user?.username || 'User'} />
                        <AvatarFallback>{getInitials(user?.fullName || user?.username || 'User')}</AvatarFallback>
                      </Avatar>
                  </button>

                 {/* Dropdown Content */}
                 {isDropdownOpen && (
                     <ul
                        className={cn(
                            "absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-secondary-200 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-secondary-800 dark:bg-secondary-950",
                            // Add transition classes if desired
                            // "transition ease-out duration-100 transform opacity-100 scale-100"
                        )}
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="user-menu-button" // Reference the button triggering it
                        >
                        {/* Menu Items */}
                        <li role="none">
                            <Link
                                to="/profile"
                                className="block w-full rounded-md px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800"
                                role="menuitem"
                                onClick={() => setIsDropdownOpen(false)} // Close on click
                                >
                                Profile
                            </Link>
                        </li>
                        <li role="none">
                            <Link
                                to="/settings"
                                className="block w-full rounded-md px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800"
                                role="menuitem"
                                onClick={() => setIsDropdownOpen(false)} // Close on click
                                >
                                Settings
                            </Link>
                        </li>
                        <li role="none">
                            <button
                                onClick={handleSignOut}
                                className="block w-full rounded-md px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950"
                                role="menuitem"
                                >
                                Sign out
                            </button>
                        </li>
                    </ul>
                 )}
              </div>
            </div>
          ) : (
            // Not Signed In State
            <div className="flex items-center gap-2">
              <Link to="/sign-in">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/sign-up">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;