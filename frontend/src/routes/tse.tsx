import { createFileRoute } from "@tanstack/react-router";
import { TseView } from "@/components/relmeg/TseView";

export const Route = createFileRoute("/tse")({
  component: TseView,
});