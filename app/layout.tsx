import type { Metadata } from "next";
import "./globals.css";
import NextTopLoader from 'nextjs-toploader';
import { Bounce, ToastContainer } from 'react-toastify';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";

export const metadata: Metadata = {
  title: "Real Estate Admin Page",
  description:
    "This is the Admin Page of the Real Estate Application where you can manage all the data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className=""  >
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

        <SidebarProvider className="">
          <div className="flex min-h-screen w-full">
            <AdminSidebar />
            <main className="flex-1">{children}</main>
          </div>
        </SidebarProvider>

      </body>
    </html>
  );
}