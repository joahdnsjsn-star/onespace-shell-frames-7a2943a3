import { createFileRoute } from "@tanstack/react-router";
import { Code2, Play, Plus, Search, Clock, Terminal } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, EmptyState, IconBadge, Row, SectionHeader, ActionButton } from "@/components/nexus/ui";

export const Route = createFileRoute("/scripts")({
  head: () => ({
    meta: [
      { title: "Scripts — Butler AI NEXUS" },
      { name: "description", content: "Library of local automation scripts with run history and output console." },
      { property: "og:title", content: "Scripts — NEXUS" },
      { property: "og:description", content: "Run your own PowerShell, Bash and Python scripts from your phone." },
    ],
  }),
  component: Scripts;
});

function Scripts() {
  return null;
}
