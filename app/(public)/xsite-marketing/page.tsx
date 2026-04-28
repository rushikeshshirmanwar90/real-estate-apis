import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function XSiteMarketingPage() {
  const features = [
    {
      icon: "📊",
      title: "Smart Cost Analysis",
      description: "Track construction costs stage-by-stage: Foundation, Slabs (first, second, etc.), Finishing. Visualize your data with interactive graphs and compare planned vs actual expenses.",
      image: "/images/xsite/iphone images/1.png"
    },
    {
      icon: "🏗️",
      title: "Complete Project Management",
      description: "Manage multiple projects, track progress and timelines, organize all site data in one place.",
      image: "/images/xsite/iphone images/2.png"
    },
    {
      icon: "👷",
      title: "Labor & Staff Management",
      description: "Track labor costs and wages, manage staff roles and responsibilities, improve workforce efficiency.",
      image: "/images/xsite/iphone images/3.png"
    },
    {
      icon: "🚜",
      title: "Equipment & Material Tracking",
      description: "Monitor equipment usage and costs, track material consumption, reduce unnecessary expenses.",
      image: "/images/xsite/iphone images/4.png"
    }
  ];

  const userTypes = [
    "Builders",
    "Contractors", 
    "Civil Engineers",
    "Real Estate Developers",
    "Site Managers"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image 
                src="/images/xsite/logo.png" 
                alt="XSite Logo" 
                width={40} 
                height={40}
                className="mr-3"
              />
              <span className="text-2xl font-bold text-blue-600">XSite</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-blue-600 font-medium"
              >
                Login
              </Link>
              <Link 
                href="/support" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                XSite – Construction Cost Intelligence Platform
              </h1>
              <p className="text-2xl text-blue-600 font-semibold mb-6">
                Build Smarter. Track Better. Save More.
              </p>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                XSite is a powerful construction management and cost analysis platform designed for builders, contractors, and real estate developers.
              </p>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                From foundation to final slab, XSite gives you complete control over your project costs, resources, and progress.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/login" 
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  Get Started Today
                </Link>
                <Link 
                  href="#features" 
                  className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors text-center"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Image 
                  src="/images/xsite/iphone images/1.png" 
                  alt="XSite Dashboard" 
                  width={200} 
                  height={400}
                  className="rounded-2xl shadow-2xl"
                />
                <Image 
                  src="/images/xsite/iphone images/2.png" 
                  alt="XSite Projects" 
                  width={200} 
                  height={400}
                  className="rounded-2xl shadow-2xl mt-8"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why XSite Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              🚧 Why XSite?
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Managing construction projects manually leads to delays, budget overruns, and lack of transparency. 
              XSite solves this by providing real-time insights and smart tracking tools.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Powerful Features for Modern Construction
            </h2>
          </div>
          
          <div className="space-y-20">
            {features.map((feature, index) => (
              <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <div className="text-6xl mb-4">{feature.icon}</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">{feature.description}</p>
                </div>
                <div className={`flex justify-center ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <Image 
                    src={feature.image} 
                    alt={feature.title} 
                    width={250} 
                    height={500}
                    className="rounded-2xl shadow-2xl"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-Time Insights Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                📈 Real-Time Insights
              </h2>
              <p className="text-xl leading-relaxed">
                Make data-driven decisions with a complete overview of your project finances and performance.
              </p>
            </div>
            <div className="flex justify-center">
              <Image 
                src="/images/xsite/ipad images/1.png" 
                alt="Real-time Analytics" 
                width={400} 
                height={300}
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Who Uses XSite Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              🎯 Who Uses XSite?
            </h2>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {userTypes.map((userType, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-6 text-center hover:bg-blue-100 transition-colors">
                <div className="text-2xl mb-2">👷‍♂️</div>
                <h3 className="font-semibold text-gray-900">{userType}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Screenshots Gallery */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              See XSite in Action
            </h2>
            <p className="text-xl text-gray-700">
              Explore our intuitive interface designed for construction professionals
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <div key={num} className="relative group">
                <Image 
                  src={`/images/xsite/iphone images/${num}.png`} 
                  alt={`XSite Feature ${num}`} 
                  width={200} 
                  height={400}
                  className="rounded-xl shadow-lg group-hover:shadow-2xl transition-shadow"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🚀 Take Control of Your Construction Projects
          </h2>
          <p className="text-xl mb-8 leading-relaxed">
            With XSite, you don't just manage projects — you gain full control over costs, resources, and execution.
          </p>
          <p className="text-2xl font-semibold mb-8">
            Start building smarter today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login" 
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get Started Now
            </Link>
            <Link 
              href="/support" 
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image 
                  src="/images/xsite/logo.png" 
                  alt="XSite Logo" 
                  width={32} 
                  height={32}
                  className="mr-2"
                />
                <span className="text-xl font-bold">XSite</span>
              </div>
              <p className="text-gray-400">
                Construction Cost Intelligence Platform for modern builders and contractors.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
                <li><Link href="/support" className="hover:text-white">Support</Link></li>
                <li><Link href="/privacy-and-policy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">
                Email: growwithexponentor@gmail.com
              </p>
              <p className="text-gray-400">
                Support Hours: Mon-Sat 10:00 AM – 7:00 PM IST
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 XSite. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}