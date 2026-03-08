import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToasterWrapper from "@/components/ToasterWrapper";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata = {
  title: "Rt. Hon. Chibuike Rotimi Amaechi | Leadership • Development • Nigeria’s Future",
  description:
    "Official platform of Rt. Hon. Chibuike Rotimi Amaechi — former Governor of Rivers State and former Minister of Transportation. Dedicated to national development, infrastructure expansion, economic growth, and responsible leadership for a stronger Nigeria.",
  
  keywords: [
    "Rotimi Amaechi",
    "Chibuike Rotimi Amaechi",
    "Amaechi Nigeria",
    "former Governor Rivers State",
    "former Minister of Transportation Nigeria",
    "Nigeria leadership",
    "Nigeria infrastructure development",
  ],

  openGraph: {
    title: "Rt. Hon. Chibuike Rotimi Amaechi",
    description:
      "Explore the vision, leadership journey, and national development agenda of Rt. Hon. Chibuike Rotimi Amaechi — former Governor of Rivers State and former Minister of Transportation.",
    type: "website",
    locale: "en_NG",
    siteName: "Rotimi Amaechi Official Platform",
  },

  twitter: {
    card: "summary_large_image",
    title: "Rt. Hon. Chibuike Rotimi Amaechi",
    description:
      "Leadership, infrastructure development, and a stronger Nigeria. Discover the vision of Rt. Hon. Chibuike Rotimi Amaechi.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${nunitoSans.className} antialiased text-gray-700`}
      >
        <ToasterWrapper />
        <AppContextProvider>
          <Navbar />
          <main style={{ paddingTop: 104 }}>
            {children}
          </main>
          <Footer />
        </AppContextProvider>
      </body>
    </html>
  );
}