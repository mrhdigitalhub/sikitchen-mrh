import { NextResponse } from 'next/server'

export function middleware(request){
  const role = request.cookies.get('sikitchen_role')?.value
  const path = request.nextUrl.pathname

  // Public paths
  if(path.startsWith('/login') || path.startsWith('/_next') || path.startsWith('/api') || path.includes('.')) {
    return NextResponse.next()
  }

  // Kalau belum login, redirect ke /login
  if(!role){
    if(path.startsWith('/dashboard') || path.startsWith('/inventory') || path.startsWith('/menus') || path.startsWith('/calculator') || path.startsWith('/production') || path.startsWith('/delivery')){
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // RBAC rules
  if(role==='owner'){
    // Owner cuma boleh dashboard
    if(path.startsWith('/production') || path.startsWith('/delivery') || path.startsWith('/calculator') || path.startsWith('/inventory') || path.startsWith('/menus')){
      return NextResponse.redirect(new URL('/dashboard?role=owner', request.url))
    }
  }
  if(role==='produksi'){
    // Produksi cuma boleh kalkulator read + produksi
    if(path.startsWith('/dashboard') || path.startsWith('/inventory') || path.startsWith('/menus') || path.startsWith('/delivery')){
      return NextResponse.redirect(new URL('/production', request.url))
    }
  }
  if(role==='delivery'){
    // Delivery cuma boleh delivery
    if(path.startsWith('/dashboard') || path.startsWith('/inventory') || path.startsWith('/menus') || path.startsWith('/calculator') || path.startsWith('/production')){
      return NextResponse.redirect(new URL('/delivery', request.url))
    }
  }
  // admin boleh semua

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*','/inventory/:path*','/menus/:path*','/calculator/:path*','/production/:path*','/delivery/:path*','/login'],
}
