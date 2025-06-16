"use client";

import React from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';

export default function AccountHelp() {
  return (
    <Layout>
      <div className="container mx-auto px-4 pt-8 pb-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Account Access Help</h1>
            <Link
              href="/login"
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sign In
            </Link>
          </div>
          
          <div className="space-y-8">
            {/* Google Sign-In Issues */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Can&apos;t Sign In with Google?
              </h2>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Make sure you&apos;re using the correct Google account</strong>
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 ml-4">
                    <li>• Try different Google accounts if you have multiple</li>
                    <li>• Check which email you used for Grantify.ai communications</li>
                    <li>• Look for welcome emails or grant notifications</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Common issues:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2 mt-2">
                    <li>
                      <strong>Browser issues:</strong> Try clearing cookies or using incognito/private mode
                    </li>
                    <li>
                      <strong>Pop-up blocked:</strong> Enable pop-ups for Grantify.ai in your browser
                    </li>
                    <li>
                      <strong>Multiple accounts:</strong> Sign out of all Google accounts and try again
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Finding Your Account Email */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Can&apos;t Remember Your Email?
              </h2>
              <div className="space-y-3">
                <p className="text-gray-600">Try these steps to find your account email:</p>
                <ol className="space-y-3">
                  <li className="flex">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">Search your email</p>
                      <p className="text-sm text-gray-600">
                        Look for emails from noreply@grantify.ai or support@grantify.ai
                      </p>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">Try common emails</p>
                      <p className="text-sm text-gray-600">
                        Try your work, personal, or university email addresses with Google Sign-In
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </section>

            {/* Why Google Sign-In */}
            <section className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-green-900">
                Why We Use Google Sign-In
              </h2>
              <ul className="text-sm text-green-800 space-y-2">
                <li>• <strong>Enhanced Security:</strong> Leverages Google&apos;s advanced security infrastructure</li>
                <li>• <strong>No Passwords:</strong> Never worry about forgotten passwords</li>
                <li>• <strong>Bot Protection:</strong> Built-in protection against automated attacks</li>
                <li>• <strong>Quick Access:</strong> Sign in with just one click</li>
              </ul>
            </section>

          </div>

          <div className="mt-8 pt-6 border-t text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}