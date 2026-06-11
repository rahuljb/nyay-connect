import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Nyay Connect - Premium Indian Advocate Discovery Platform",
  description: "Find verified legal experts and advocates near you. Match cases powered by advanced classification.",
  keywords: "advocate search, indian lawyers, legal consultation, property dispute lawyer, criminal lawyer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <Navbar />
          {children}
          <footer className="footer">
            <p>© {new Date().getFullYear()} Nyay Connect. Made with ⚖️ for Indian Citizens & Advocates.</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Disclaimer: In accordance with the Bar Council of India rules, this platform does not solicit or advertise. 
              Profiles are for informational purposes.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
