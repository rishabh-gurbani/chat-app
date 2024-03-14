'use client'

import { useGetTokenBalance } from '@/lib/hooks/use-token-balance'

export async function TokenBalance() {
  const { data, isSuccess, error, isLoading, isRefetching } =
    useGetTokenBalance()
  if (data)
    return (
      // <span
      //   className={`${
      //     isLoading || isRefetching
      //       ? 'opacity-50' // Fade out during refetching
      //       : 'opacity-100' // Fully visible when not refetching
      //   }  transition-opacity duration-500 ease-in-out mr-8 text-sm `}
      // >
      <span className="mr-8 text-sm">
        <span className="font-bold mr-2">Balance: </span>{' '}
        {isSuccess ? data.credits.toFixed(3) : 0.0}
      </span>
    )
}
