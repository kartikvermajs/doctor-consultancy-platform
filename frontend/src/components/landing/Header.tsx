"use client";
import {
  Bell,
  Calendar,
  LogOut,
  Settings,
  Stethoscope,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { userAuthStore } from "@/store/authStore";

interface HeaderProps {
  showDashboardNav?: boolean;
}

interface NavigationItem {
  lable: string;
  icon: React.ComponentType<any>;
  href: string;
  active: boolean;
}
const Header: React.FC<HeaderProps> = ({ showDashboardNav = false }) => {
  const { user, isAuthenticated, logout } = userAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const getDashboardNavigation = (): NavigationItem[] => {
    if (!user || !showDashboardNav) return [];

    if (user?.type === "patient") {
      return [
        {
          lable: "Appointments",
          icon: Calendar,
          href: "/patient/dashboard",
          active: pathname?.includes("/patient/dashboard") || false,
        },
      ];
    } else if (user?.type === "doctor") {
      return [
        {
          lable: "Dashboard",
          icon: Calendar,
          href: "/doctor/dashboard",
          active: pathname?.includes("/doctor/dashboard") || false,
        },
        {
          lable: "Appointments",
          icon: Calendar,
          href: "/doctor/appointments",
          active: pathname?.includes("/doctor/appointments") || false,
        },
      ];
    }
    return [];
  };
  return (
    <header className="border-b bg-white/95 backdrop:blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center  justify-between">
        {/* Left side -> logo  + navigation */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>

            <div className="text-2xl font-bold bg-gradient-to-br from-green-600 to-green-800  bg-clip-text text-transparent">
              CuraVault+
            </div>
          </Link>

          {/* Dashboard navigation */}
          {isAuthenticated && showDashboardNav && (
            <nav className="hidden md:flex items-center space-x-6">
              {getDashboardNavigation().map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 transition-colors ${
                    item.active
                      ? "text-green-600 font-semibold"
                      : "text-gray-600 hover:text-green-600"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.lable}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>

        {isAuthenticated && showDashboardNav ? (
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs bg-red-500 hover:bg-red-600">
                4
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 px-2"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={user?.profileImage}
                      alt={user?.name}
                    ></AvatarImage>
                    <AvatarFallback className="bg-green-100 text-green-600 text-sm font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.type}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={user?.profileImage}
                        alt={user?.name}
                      ></AvatarImage>
                      <AvatarFallback className="bg-green-100 text-green-600 ">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className=" font-medium truncate">{user?.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-[140px]">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/${user?.type}/profile`}
                    className="flex items-center"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/${user?.type}/settings`}
                    className="flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                       <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            {!isAuthenticated ? (
              <>
                <Link href="/login/patient">
                  <Button
                    variant="ghost"
                    className="text-green-900 font-medium hover:text-green-700"
                  >
                    Log in
                  </Button>
                </Link>

                <Link href="/signup/patient" className="hidden md:block">
                  <Button className="bg-gradient-to-r from-green-600 to-green-700  font-medium hover:from-green-700 hover:to-green-800 rounded-full px-6">
                    Book Consultation
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-4 ">
                <span className="hidden md:block text-sm text-gray-700 font-medium whitespace-nowrap">
                  Welcome,&nbsp;{user?.name}
                </span>

                <Link href={`/${user?.type}/dashboard`}>
                  <Button
                    variant="ghost"
                    className="text-green-900 font-medium hover:text-green-700"
                  >
                    Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
