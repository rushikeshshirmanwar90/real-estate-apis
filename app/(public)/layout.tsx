import type { Metadata } from "next";
import "../globals.css";
import NextTopLoader from 'nextjs-toploader';
import { Bounce, ToastContainer } from 'react-toastify';

export const metadata: Metadata = {
  title: "XSite - Construction Cost Intelligence Platform",
  description: "XSite public pages - Support, Marketing, and Privacy Policy",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NextTopLoader
        color="#2299DD"
        initialPosition={0.08}
        crawlSpeed={200}
        height={3}
        crawl={true}
        showSpinner={true}
        easing="ease"
        speed={200}
        shadow="0 0 10px #2299DD,0 0 5px #2299DD"
      />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        draggable
        theme="light"
        transition={Bounce}
      />

      {/* Public layout - no sidebar, no authentication required */}
      <main className="w-full min-h-screen">{children}</main>
    </>
  );
}