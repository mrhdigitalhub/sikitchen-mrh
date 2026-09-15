import './globals.css'

export const metadata = {
  title: 'Sikitchen OS - Catering Operating System',
  description: 'Sistem Operasi Catering 100% Free - Tahap 1 Pondasi'
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
