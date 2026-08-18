import { useAuthStore } from '@/store/authStore';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from './NotificationBell';

export function Topbar() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const organizationName =
    user?.organization?.name ||
    user?.defaultOrganization?.name ||
    user?.employer?.name ||
    user?.companyName ||
    'RealEstate Admin';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{organizationName}</h1>
      </div>

      <div className="flex items-center gap-3">

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-muted/50 p-0 text-muted-foreground"
              aria-label="Open user menu"
            >
              <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">{(user?.name?.charAt(0) ?? 'A').toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-40">
            <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
