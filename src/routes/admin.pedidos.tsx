import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/pedidos")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
