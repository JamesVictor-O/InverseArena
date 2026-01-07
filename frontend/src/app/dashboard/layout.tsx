import React from "react";
import { Sidebar } from "@/components/Shared/Sidebar";
import { DashboardHeader } from "@/components/Shared/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Sidebar>
      <DashboardHeader />
      {children}
    </Sidebar>
  );
}
