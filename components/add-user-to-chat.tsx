'use client'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { inviteUserToConversation } from '@/server/actions'
// import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

export function AddUserToChat({ id }: { id?: string }) {
  // const { toast } = useToast()
  const [email, setEmail] = useState<string>('')
  // const [open, setOpen] = 
  return (
    <div className="flex items-center justify-end space-x-2">
      <Dialog>
        <DialogTrigger asChild>
          <button
            className={cn(
              buttonVariants({ size: 'sm', variant: 'outline' }),
              'absolute left-0 top-4 h-8 w-8 rounded-full bg-background p-0 sm:left-4'
            )}
          >
            <IconPlus />
            <span className="sr-only">Add User</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite</DialogTitle>
            <DialogDescription>
              Add more users to this conversation!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                className="col-span-3"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              {/* <Button type="button" variant="secondary">
                Close
              </Button> */}
              <Button
                type="submit"
                onClick={async () => {
                  if (!id) return
                  const success = await inviteUserToConversation(id, email)
                  if (success.status) {
                    toast.success(success.message)
                  } else {
                    toast.error(success.message)
                  }
                }}
              >
                Add
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
