import Link from 'next/link'
import { Button } from "./ui"
import { Home, Menu } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Home className="h-8 w-8 text-primary" />
              <span className="ml-2 text-2xl font-bold text-primary">Web3Estate</span>
            </Link>
          </div>
          <nav className="hidden md:flex space-x-4">
            <Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link>
            <Link href="#how-it-works" className="text-muted-foreground hover:text-primary">How It Works</Link>
            <Link href="#" className="text-muted-foreground hover:text-primary">About</Link>
            <Link href="#" className="text-muted-foreground hover:text-primary">Contact</Link>
          </nav>
          <div className="flex items-center">
            <Button variant="outline" className="mr-2">Log In</Button>
            <Button>Sign Up</Button>
            <Button variant="ghost" className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

