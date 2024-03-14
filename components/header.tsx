import * as React from 'react'
import Link from 'next/link'

import { z } from 'zod'
import { cn } from '@/lib/utils'
import { auth } from '@/auth'
import { clearChats, getTokenBalance } from '@/server/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sidebar } from '@/components/sidebar'
import { SidebarList } from '@/components/sidebar-list'
import {
  IconGitHub,
  IconNextChat,
  IconSeparator,
  IconToken,
  IconVercel
} from '@/components/ui/icons'
import { SidebarFooter } from '@/components/sidebar-footer'
import { ThemeToggle } from '@/components/theme-toggle'
import { ClearHistory } from '@/components/clear-history'
import { UserMenu } from '@/components/user-menu'
import { SidebarMobile } from './sidebar-mobile'
import { SidebarToggle } from './sidebar-toggle'
import { ChatHistory } from './chat-history'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { getTokenBalance } from '@/server/actions'
import {
  QueryClient,
  HydrationBoundary,
  dehydrate
} from '@tanstack/react-query'
import { TokenBalance } from './token-balance'

async function UserOrLogin() {
  const session = await auth()
  return (
    <>
      {session?.user ? (
        <>
          <SidebarMobile>
            <ChatHistory userId={session.user.id} />
          </SidebarMobile>
          <SidebarToggle />
        </>
      ) : (
        <Link href="/" target="_blank" rel="nofollow">
          <IconNextChat className="w-6 h-6 mr-2 dark:hidden" inverted />
          <IconNextChat className="hidden w-6 h-6 mr-2 dark:block" />
        </Link>
      )}
      <div className="flex items-center">
        <IconSeparator className="w-6 h-6 text-muted-foreground/50" />
        {session?.user ? (
          <UserMenu user={session.user} />
        ) : (
          <Button variant="link" asChild className="-ml-2">
            <Link href="/sign-in?callbackUrl=/">Login</Link>
          </Button>
        )}
      </div>
    </>
  )
}

async function Balance() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['balance'],
    queryFn: getTokenBalance
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TokenBalance />
    </HydrationBoundary>
  )
}

async function TotalBalance() {
  const balance = await getTokenBalance()
  return (
    <span className="mr-8 text-sm">
      <span className="font-bold mr-2">Balance: </span>{' '}
      {balance ? balance.credits.toFixed(3) : 0.0}
    </span>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <UserOrLogin />
        </React.Suspense>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <Balance />
        </React.Suspense>
        {/* <TotalBalance /> */}
      </div>
    </header>
  )
}
