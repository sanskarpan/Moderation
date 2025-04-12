import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';

const HomePage = () => {
  const { isSignedIn } = useUser();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-secondary-900 dark:text-secondary-100 sm:text-5xl md:text-6xl">
          <span className="block">Safe & Secure Content</span>
          <span className="block text-primary-600 dark:text-primary-400">AI-Powered Moderation</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-secondary-600 dark:text-secondary-400">
          ContentGuard is an intelligent moderation platform that uses AI to detect and flag inappropriate content, 
          ensuring a safe and respectful environment for all users.
        </p>
        <div className="mx-auto mt-10 flex max-w-md flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          {isSignedIn ? (
            <>
              <Link to="/dashboard" className="flex-1">
                <Button size="lg" className="w-full">Go to Dashboard</Button>
              </Link>
              <Link to="/posts" className="flex-1">
                <Button size="lg" variant="outline" className="w-full">Browse Posts</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/sign-up" className="flex-1">
                <Button size="lg" className="w-full">Sign Up</Button>
              </Link>
              <Link to="/sign-in" className="flex-1">
                <Button size="lg" variant="outline" className="w-full">Sign In</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-secondary-900 dark:text-secondary-100">
            Intelligent Content Moderation
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary-600 dark:text-secondary-400">
            Our AI-powered system automatically detects inappropriate content and ensures a positive community experience.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-secondary-200 bg-white p-6 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">AI-Powered Screening</h3>
            <p className="mt-2 text-secondary-600 dark:text-secondary-400">
              Advanced NLP algorithms automatically detect and flag potentially inappropriate content for review.
            </p>
          </div>

          <div className="rounded-lg border border-secondary-200 bg-white p-6 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Community Engagement</h3>
            <p className="mt-2 text-secondary-600 dark:text-secondary-400">
              Post content, comment, and leave reviews while our system ensures a safe environment for all users.
            </p>
          </div>

          <div className="rounded-lg border border-secondary-200 bg-white p-6 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Real-time Monitoring</h3>
            <p className="mt-2 text-secondary-600 dark:text-secondary-400">
              Get instant notifications when your content is flagged and track the moderation status in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-secondary-900 dark:text-secondary-100">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary-600 dark:text-secondary-400">
            Our moderation system is designed to be transparent and efficient, keeping the community safe without disrupting the user experience.
          </p>
        </div>

        <div className="mt-12">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 transform bg-primary-200 dark:bg-primary-800" />

            {/* Steps */}
            <div className="relative space-y-12">
              {/* Step 1 */}
              <div className="flex flex-col items-center md:flex-row">
                <div className="flex flex-1 justify-end md:pr-8">
                  <div className="w-full rounded-lg border border-secondary-200 bg-white p-6 text-right shadow-sm dark:border-secondary-800 dark:bg-secondary-950 md:w-80">
                    <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Content Creation</h3>
                    <p className="mt-2 text-secondary-600 dark:text-secondary-400">
                      Users create posts, comments, and reviews on the platform.
                    </p>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary-200 bg-white text-primary-700 dark:border-primary-800 dark:bg-secondary-950 dark:text-primary-300">
                  <span className="text-lg font-bold">1</span>
                </div>
                <div className="flex-1 md:pl-8" />
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center md:flex-row">
                <div className="flex-1 md:pr-8" />
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary-200 bg-white text-primary-700 dark:border-primary-800 dark:bg-secondary-950 dark:text-primary-300">
                  <span className="text-lg font-bold">2</span>
                </div>
                <div className="flex flex-1 justify-start md:pl-8">
                  <div className="w-full rounded-lg border border-secondary-200 bg-white p-6 text-left shadow-sm dark:border-secondary-800 dark:bg-secondary-950 md:w-80">
                    <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">AI Analysis</h3>
                    <p className="mt-2 text-secondary-600 dark:text-secondary-400">
                      Our AI system automatically scans all content for potentially inappropriate material.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center md:flex-row">
                <div className="flex flex-1 justify-end md:pr-8">
                  <div className="w-full rounded-lg border border-secondary-200 bg-white p-6 text-right shadow-sm dark:border-secondary-800 dark:bg-secondary-950 md:w-80">
                    <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Flagging</h3>
                    <p className="mt-2 text-secondary-600 dark:text-secondary-400">
                      Potentially problematic content is flagged for review and users are notified.
                    </p>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary-200 bg-white text-primary-700 dark:border-primary-800 dark:bg-secondary-950 dark:text-primary-300">
                  <span className="text-lg font-bold">3</span>
                </div>
                <div className="flex-1 md:pl-8" />
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center md:flex-row">
                <div className="flex-1 md:pr-8" />
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary-200 bg-white text-primary-700 dark:border-primary-800 dark:bg-secondary-950 dark:text-primary-300">
                  <span className="text-lg font-bold">4</span>
                </div>
                <div className="flex flex-1 justify-start md:pl-8">
                  <div className="w-full rounded-lg border border-secondary-200 bg-white p-6 text-left shadow-sm dark:border-secondary-800 dark:bg-secondary-950 md:w-80">
                    <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Human Review</h3>
                    <p className="mt-2 text-secondary-600 dark:text-secondary-400">
                      Admin moderators review flagged content and make final approval or rejection decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-700 dark:bg-primary-900">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
              Join our community today and experience safe, moderated content sharing.
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              {isSignedIn ? (
                <>
                  <Link to="/dashboard">
                    <Button size="lg" variant="secondary">Go to Dashboard</Button>
                  </Link>
                  <Link to="/posts/create">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-primary-600">
                      Create a Post
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/sign-up">
                    <Button size="lg" variant="secondary">Sign Up Now</Button>
                  </Link>
                  <Link to="/posts">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-primary-600">
                      Browse Posts
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
