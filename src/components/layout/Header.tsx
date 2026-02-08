import { UserMenu } from "./UserMenu";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title || "EdgeProof"}</h1>
      <UserMenu />
    </header>
  );
}
