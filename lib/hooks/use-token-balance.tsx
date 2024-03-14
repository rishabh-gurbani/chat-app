import { getTokenBalance } from '@/server/actions'
import { useQuery } from '@tanstack/react-query'

export function useGetTokenBalance() {
  return useQuery({
    queryFn: async () => getTokenBalance(),
    queryKey: ['balance'],
    refetchInterval: 20*1000
  })
}
