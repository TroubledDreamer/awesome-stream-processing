import './globals.css'

export const metadata = {
  title: 'Energy Grid Monitor',
  description: 'Real-time energy consumption and production monitoring',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-emerald-950 min-h-screen">
        {children}
      </body>
    </html>
  )
}
