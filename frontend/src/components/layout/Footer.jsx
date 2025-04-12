import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-secondary-200 bg-white py-6 dark:border-secondary-800 dark:bg-secondary-950">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400">ContentGuard</span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-secondary-600 dark:text-secondary-400">
              An AI-powered content moderation microservice that helps you maintain
              a safe and friendly environment for your users.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary-900 dark:text-secondary-100">
              Resources
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/posts"
                  className="text-sm text-secondary-600 transition-colors hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400"
                >
                  Browse Posts
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-sm text-secondary-600 transition-colors hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className="text-sm text-secondary-600 transition-colors hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400"
                >
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary-900 dark:text-secondary-100">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="#"
                  className="text-sm text-secondary-600 transition-colors hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-sm text-secondary-600 transition-colors hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-sm text-secondary-600 transition-colors hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-secondary-200 pt-8 dark:border-secondary-800">
          <p className="text-center text-sm text-secondary-600 dark:text-secondary-400">
            &copy; {currentYear} ContentGuard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;